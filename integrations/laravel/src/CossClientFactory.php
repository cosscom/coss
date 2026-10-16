<?php

namespace Coss\Laravel;

use Closure;
use Coss\Laravel\Exceptions\MissingApiKeyException;
use Coss\Laravel\Http\CossClient;
use Illuminate\Support\Env;

/**
 * Creates the coss transport's client from configuration. Bound in the container, so an app (or
 * a test) can swap in one with its own Guzzle handler.
 *
 * Settings come from the mailer (`config/mail.php`: `key`, `base_url`, `timeout`, `max_retries`),
 * else `services.coss` (`config/services.php`), else the `COSS_API_KEY` / `COSS_BASE_URL`
 * environment variables.
 */
class CossClientFactory
{
    private readonly ?Closure $handler;

    private readonly ?Closure $sleep;

    private readonly ?Closure $random;

    /**
     * @param  callable|null  $handler  A Guzzle handler for every client this factory creates.
     * @param  callable(float): void|null  $sleep  Waits the given milliseconds between retries.
     * @param  callable(): float|null  $random  The backoff jitter's random source, in [0, 1).
     */
    public function __construct(?callable $handler = null, ?callable $sleep = null, ?callable $random = null)
    {
        $this->handler = $handler === null ? null : Closure::fromCallable($handler);
        $this->sleep = $sleep === null ? null : Closure::fromCallable($sleep);
        $this->random = $random === null ? null : Closure::fromCallable($random);
    }

    /**
     * @param  array<string, mixed>  $mailer  The mailer's configuration.
     * @param  array<string, mixed>  $services  `services.coss`.
     *
     * @throws MissingApiKeyException
     */
    public function make(array $mailer = [], array $services = []): CossClient
    {
        $setting = static fn (string $key) => self::filled($mailer[$key] ?? null) ?? self::filled($services[$key] ?? null);

        $apiKey = $setting('key') ?? self::filled(Env::get('COSS_API_KEY'));
        if (! is_string($apiKey)) {
            throw MissingApiKeyException::make();
        }
        $baseUrl = $setting('base_url') ?? self::filled(Env::get('COSS_BASE_URL'));
        $timeout = $setting('timeout');
        $maxRetries = $setting('max_retries');

        return new CossClient(
            apiKey: $apiKey,
            baseUrl: is_string($baseUrl) ? $baseUrl : null,
            timeout: is_numeric($timeout) ? (float) $timeout : CossClient::DEFAULT_TIMEOUT,
            maxRetries: is_numeric($maxRetries) ? max(0, (int) $maxRetries) : CossClient::DEFAULT_MAX_RETRIES,
            handler: $this->handler,
            sleep: $this->sleep,
            random: $this->random,
        );
    }

    private static function filled(mixed $value): mixed
    {
        return $value === null || $value === '' ? null : $value;
    }
}
