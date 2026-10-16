<?php

namespace Coss\Laravel\Tests\Support;

use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Promise\Create;
use GuzzleHttp\Promise\PromiseInterface;
use GuzzleHttp\Psr7\Response;
use Psr\Http\Message\RequestInterface;

/**
 * A Guzzle handler that answers each attempt from a queue and records the requests. A queued
 * `['network_error' => true]` fails like an unreachable host, `['timeout' => true]` like cURL's
 * timeout (error 28), as Guzzle's own curl handler does.
 */
final class FakeApi
{
    /** @var list<RequestInterface> */
    public array $requests = [];

    /** @var list<array<string, mixed>> */
    private array $queue;

    /**
     * @param  list<array<string, mixed>>  $responses  `{status, headers?, body?}` (an array body is JSON), or a failure.
     */
    public function __construct(array $responses = [])
    {
        $this->queue = $responses;
    }

    public static function email(string $id = 'email_01k0000000000000000000000', string $status = 'queued'): array
    {
        return ['status' => 202, 'body' => ['object' => 'email', 'id' => $id, 'status' => $status]];
    }

    public function push(array $response): self
    {
        $this->queue[] = $response;

        return $this;
    }

    public function __invoke(RequestInterface $request, array $options): PromiseInterface
    {
        $this->requests[] = $request;
        $next = array_shift($this->queue);
        if ($next === null) {
            throw new \LogicException('FakeApi: no response queued for '.$request->getMethod().' '.$request->getUri());
        }
        if (! empty($next['network_error'])) {
            return Create::rejectionFor(new ConnectException(
                'cURL error 7: Failed to connect to api.coss.test port 443: Connection refused',
                $request,
                null,
                ['errno' => 7],
            ));
        }
        if (! empty($next['timeout'])) {
            return Create::rejectionFor(new ConnectException(
                'cURL error 28: Operation timed out after 30000 milliseconds with 0 bytes received',
                $request,
                null,
                ['errno' => 28],
            ));
        }
        $body = $next['body'] ?? '';

        return Create::promiseFor(new Response(
            $next['status'],
            $next['headers'] ?? [],
            is_string($body) ? $body : json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ));
    }

    /** The JSON body of the request at `$index` (the last by default). */
    public function body(int $index = -1): array
    {
        $request = $this->requests[$index < 0 ? count($this->requests) + $index : $index];

        return json_decode((string) $request->getBody(), true, flags: JSON_THROW_ON_ERROR);
    }
}
