<?php

namespace Coss\Laravel\Http;

use Closure;
use Coss\Laravel\Exceptions\CossTransportException;
use Coss\Laravel\Exceptions\UnsupportedMessageException;
use Coss\Laravel\Version;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Request;
use Psr\Http\Message\ResponseInterface;

/**
 * A small client for `POST /v1/emails`: bearer auth, JSON, a timeout per attempt, and retries with
 * backoff that reuse one Idempotency-Key. It mirrors the coss SDK's HTTP client
 * (`packages/sdk/src/core/http.ts`); integrations/README.md has the rules.
 */
class CossClient
{
    public const DEFAULT_BASE_URL = 'https://api.coss.com';

    /** The API version this driver speaks (the SDK's `API_VERSION`). */
    public const API_VERSION = '2026-10-10';

    public const DEFAULT_TIMEOUT = 30.0;

    public const DEFAULT_MAX_RETRIES = 2;

    private const INITIAL_RETRY_DELAY_MS = 500;

    private const MAX_RETRY_DELAY_MS = 8000;

    /** A server asking us to wait longer than this gets its error returned instead. */
    private const MAX_RETRY_AFTER_MS = 60000;

    /** cURL's CURLE_OPERATION_TIMEDOUT. */
    private const CURL_TIMEOUT = 28;

    private readonly string $baseUrl;

    private readonly Client $http;

    private readonly Closure $sleep;

    private readonly Closure $random;

    private readonly Closure $clock;

    /**
     * @param  float  $timeout  Seconds per attempt.
     * @param  int  $maxRetries  Retries after the first attempt.
     * @param  callable|null  $handler  A Guzzle handler (tests pass a mock).
     * @param  callable(float): void|null  $sleep  Waits the given milliseconds.
     * @param  callable(): float|null  $random  Returns a float in [0, 1) for the backoff's jitter.
     * @param  callable(): float|null  $clock  The current time in milliseconds (for Retry-After dates).
     */
    public function __construct(
        private readonly string $apiKey,
        ?string $baseUrl = null,
        private readonly float $timeout = self::DEFAULT_TIMEOUT,
        private readonly int $maxRetries = self::DEFAULT_MAX_RETRIES,
        ?callable $handler = null,
        ?callable $sleep = null,
        ?callable $random = null,
        ?callable $clock = null,
    ) {
        $this->baseUrl = rtrim($baseUrl ?? self::DEFAULT_BASE_URL, '/');
        $this->http = new Client([
            'handler' => match (true) {
                $handler instanceof HandlerStack => $handler,
                $handler === null => HandlerStack::create(),
                default => HandlerStack::create($handler),
            },
            'http_errors' => false,
            'allow_redirects' => false,
        ]);
        $this->sleep = $sleep === null
            ? static function (float $ms): void {
                if ($ms > 0) {
                    usleep((int) round($ms * 1000));
                }
            }
        : Closure::fromCallable($sleep);
        $this->random = $random === null
            ? static fn (): float => mt_rand() / (mt_getrandmax() + 1)
            : Closure::fromCallable($random);
        $this->clock = $clock === null
            ? static fn (): float => microtime(true) * 1000
            : Closure::fromCallable($clock);
    }

    public function baseUrl(): string
    {
        return $this->baseUrl;
    }

    /**
     * Sends one email and returns it as the API did (`{ object: "email", id, status, … }`).
     *
     * @param  array<string, mixed>  $body  The `POST /v1/emails` request body.
     * @param  string|null  $idempotencyKey  Defaults to a random UUID; every attempt reuses it.
     * @return array<string, mixed>
     *
     * @throws CossTransportException
     */
    public function sendEmail(array $body, ?string $idempotencyKey = null): array
    {
        $idempotencyKey ??= self::uuid();
        if (! preg_match('/^[\x20-\x7E]+$/', $idempotencyKey)) {
            throw new CossTransportException(
                'invalid_request_error',
                'invalid_header',
                'The idempotency key must be printable ASCII.',
            );
        }

        $request = new Request('POST', $this->baseUrl.'/v1/emails', [
            'Authorization' => 'Bearer '.$this->apiKey,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'Coss-Version' => self::API_VERSION,
            'User-Agent' => 'coss-laravel/'.Version::VERSION,
            'Idempotency-Key' => $idempotencyKey,
        ], self::encode($body));

        for ($retry = 0; ; $retry++) {
            [$email, $error, $retryable, $retryAfterMs] = $this->attempt($request);
            if ($error === null) {
                return $email;
            }
            if (! $retryable || $retry >= $this->maxRetries) {
                throw $error;
            }
            $delay = $retryAfterMs ?? self::backoffDelay($retry, ($this->random)());
            if ($delay > self::MAX_RETRY_AFTER_MS) {
                throw $error;
            }
            ($this->sleep)($delay);
        }
    }

    /**
     * Exponential backoff (500 ms, 1 s, 2 s … capped at 8 s) minus up to 25% random jitter.
     */
    public static function backoffDelay(int $retry, float $random): float
    {
        $delay = min(self::INITIAL_RETRY_DELAY_MS * 2 ** $retry, self::MAX_RETRY_DELAY_MS);

        return $delay * (1 - $random * 0.25);
    }

    /**
     * `Retry-After` in milliseconds: delay-seconds or an HTTP date; null when absent or invalid.
     */
    public static function parseRetryAfter(?string $value, float $nowMs): ?float
    {
        $value = trim($value ?? '');
        if ($value === '') {
            return null;
        }
        if (is_numeric($value)) {
            $seconds = (float) $value;

            return is_finite($seconds) && $seconds >= 0 ? $seconds * 1000 : null;
        }
        // IMF-fixdate, then the obsolete RFC 850 and asctime forms (RFC 9110, section 5.6.7).
        foreach (['D, d M Y H:i:s \G\M\T', 'l, d-M-y H:i:s \G\M\T', 'D M j H:i:s Y'] as $format) {
            $date = \DateTimeImmutable::createFromFormat('!'.$format, preg_replace('/\s+/', ' ', $value), new \DateTimeZone('UTC'));
            if ($date !== false) {
                return max(0.0, (float) $date->format('U.v') * 1000 - $nowMs);
            }
        }

        return null;
    }

    /** 409 (an idempotent request still in progress), 429 and 5xx are transient. */
    public static function isRetryableStatus(int $status): bool
    {
        return $status === 409 || $status === 429 || $status >= 500;
    }

    /**
     * @return array{0: array<string, mixed>|null, 1: CossTransportException|null, 2: bool, 3: float|null}
     */
    private function attempt(Request $request): array
    {
        try {
            $response = $this->http->send($request, ['timeout' => $this->timeout]);
            $text = (string) $response->getBody();
        } catch (GuzzleException $exception) {
            if ($exception instanceof RequestException && $exception->getResponse() !== null) {
                // Only with http_errors on; kept so a custom handler stack can't break the mapping.
                return $this->fromResponse($exception->getResponse(), (string) $exception->getResponse()->getBody());
            }

            return [null, $this->transferError($exception), true, null];
        }

        return $this->fromResponse($response, $text);
    }

    /**
     * @return array{0: array<string, mixed>|null, 1: CossTransportException|null, 2: bool, 3: float|null}
     */
    private function fromResponse(ResponseInterface $response, string $text): array
    {
        $status = $response->getStatusCode();
        $requestId = $response->getHeaderLine('X-Request-Id') ?: null;

        if ($status < 200 || $status >= 300) {
            return [
                null,
                CossTransportException::fromResponse($status, $text, $requestId),
                self::isRetryableStatus($status),
                self::parseRetryAfter($response->getHeaderLine('Retry-After'), ($this->clock)()),
            ];
        }

        $email = json_decode($text, true);
        if (json_last_error() !== JSON_ERROR_NONE || ! is_array($email)) {
            return [null, new CossTransportException(
                'api_error',
                'invalid_response',
                "The coss.com API returned an HTTP {$status} response that is not valid JSON.",
                $status,
                $requestId,
            ), false, null];
        }

        return [$email, null, false, null];
    }

    private function transferError(GuzzleException $exception): CossTransportException
    {
        if (self::isTimeout($exception)) {
            return new CossTransportException(
                'timeout_error',
                'request_timeout',
                sprintf('Request timed out after %dms.', (int) round($this->timeout * 1000)),
                previous: $exception,
            );
        }

        return new CossTransportException(
            'connection_error',
            'network_error',
            "Could not reach the coss.com API at {$this->baseUrl}: {$exception->getMessage()}",
            previous: $exception,
        );
    }

    private static function isTimeout(GuzzleException $exception): bool
    {
        $context = $exception instanceof ConnectException || $exception instanceof RequestException
            ? $exception->getHandlerContext()
            : [];
        if (($context['errno'] ?? null) === self::CURL_TIMEOUT) {
            return true;
        }
        $message = strtolower($exception->getMessage());

        return str_contains($message, 'curl error 28')
            || str_contains($message, 'timed out')
            || str_contains($message, 'timeout');
    }

    /**
     * @param  array<string, mixed>  $body
     */
    private static function encode(array $body): string
    {
        try {
            return json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw UnsupportedMessageException::because(
                'its subject, body, headers or options are not valid UTF-8',
                'convert them to UTF-8 first'
            );
        }
    }

    /** A random (version 4) UUID. */
    private static function uuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0F) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3F) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }
}
