<?php

namespace Coss\Laravel\Tests\Unit;

use Coss\Laravel\CossOptions;
use Coss\Laravel\Exceptions\CossTransportException;
use Coss\Laravel\Http\CossClient;
use Coss\Laravel\Tests\Support\FakeApi;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Mime\Email;

final class CossClientTest extends TestCase
{
    public function test_retry_after_as_an_http_date(): void
    {
        $now = gmmktime(12, 0, 0, 10, 16, 2026) * 1000.0;

        $this->assertSame(5000.0, CossClient::parseRetryAfter('Fri, 16 Oct 2026 12:00:05 GMT', $now));
        $this->assertSame(5000.0, CossClient::parseRetryAfter('Friday, 16-Oct-26 12:00:05 GMT', $now));
        $this->assertSame(5000.0, CossClient::parseRetryAfter('Fri Oct 16 12:00:05 2026', $now));
        $this->assertSame(0.0, CossClient::parseRetryAfter('Fri, 16 Oct 2026 11:00:00 GMT', $now));
        $this->assertSame(1500.0, CossClient::parseRetryAfter(' 1.5 ', $now));
        $this->assertNull(CossClient::parseRetryAfter('-1', $now));
        $this->assertNull(CossClient::parseRetryAfter('soon', $now));
        $this->assertNull(CossClient::parseRetryAfter(null, $now));
    }

    public function test_an_http_date_retry_after_is_waited_for(): void
    {
        $now = gmmktime(12, 0, 0, 10, 16, 2026) * 1000.0;
        $api = new FakeApi([
            ['status' => 503, 'headers' => ['Retry-After' => 'Fri, 16 Oct 2026 12:00:03 GMT'], 'body' => ''],
            ['status' => 429, 'headers' => ['Retry-After' => 'Fri, 16 Oct 2026 12:02:00 GMT'], 'body' => ''],
        ]);
        $sleeps = [];
        $client = new CossClient('coss_test_x', 'https://api.coss.test', handler: $api, sleep: function (float $ms) use (&$sleeps): void {
            $sleeps[] = $ms;
        }, clock: fn () => $now);

        try {
            $client->sendEmail(['from' => 'a@acme.test']);
            $this->fail('The send should fail.');
        } catch (CossTransportException $exception) {
            // Two minutes is above the 60 s limit: that response's error is returned.
            $this->assertSame(429, $exception->getStatus());
            $this->assertSame('unexpected_response', $exception->getErrorCode());
        }
        $this->assertSame([3000.0], $sleeps);
        $this->assertCount(2, $api->requests);
    }

    public function test_a_real_timeout_is_a_timeout_error(): void
    {
        // A socket that accepts connections (the kernel's backlog) but never answers.
        $server = stream_socket_server('tcp://127.0.0.1:0');
        $address = stream_socket_get_name($server, false);
        $client = new CossClient('coss_test_x', "http://{$address}", timeout: 0.2, maxRetries: 0);

        try {
            $client->sendEmail(['from' => 'a@acme.test']);
            $this->fail('The send should time out.');
        } catch (CossTransportException $exception) {
            $this->assertSame('timeout_error', $exception->getType());
            $this->assertSame('request_timeout', $exception->getErrorCode());
            $this->assertNull($exception->getStatus());
        } finally {
            fclose($server);
        }
    }

    public function test_a_refused_connection_is_a_network_error(): void
    {
        $server = stream_socket_server('tcp://127.0.0.1:0');
        $address = stream_socket_get_name($server, false);
        fclose($server);
        $client = new CossClient('coss_test_x', "http://{$address}", maxRetries: 0);

        try {
            $client->sendEmail(['from' => 'a@acme.test']);
            $this->fail('The send should fail.');
        } catch (CossTransportException $exception) {
            $this->assertSame('connection_error', $exception->getType());
            $this->assertSame('network_error', $exception->getErrorCode());
            $this->assertStringContainsString("Could not reach the coss.com API at http://{$address}", $exception->getMessage());
        }
    }

    public function test_options_are_normalized(): void
    {
        $email = new Email;
        CossOptions::apply($email, ['scheduled_at' => new \DateTimeImmutable('2026-11-01T10:00:00.999+01:00'), 'tags' => ['a' => 1]]);
        CossOptions::apply($email, ['category' => 'x', 'tags' => null]);

        $this->assertSame(['scheduled_at' => '2026-11-01T09:00:00Z', 'category' => 'x'], CossOptions::from($email)->toArray());
        $this->assertCount(1, iterator_to_array($email->getHeaders()->all('X-Coss-Options'), false));
    }
}
