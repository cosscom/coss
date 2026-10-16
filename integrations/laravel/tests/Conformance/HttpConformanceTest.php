<?php

namespace Coss\Laravel\Tests\Conformance;

use Coss\Laravel\CossTransport;
use Coss\Laravel\Exceptions\CossTransportException;
use Coss\Laravel\Http\CossClient;
use Coss\Laravel\Tests\Support\Conformance;
use Coss\Laravel\Tests\Support\FakeApi;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * integrations/conformance/http.json: retries, Retry-After and error mapping.
 */
final class HttpConformanceTest extends TestCase
{
    public static function scenarios(): iterable
    {
        foreach (Conformance::load('http')['scenarios'] as $scenario) {
            yield $scenario['name'] => [$scenario];
        }
    }

    #[DataProvider('scenarios')]
    public function test_scenario(array $scenario): void
    {
        $spec = Conformance::load('http');
        $minimal = Conformance::load('message')['messages']['minimal'];

        $responses = array_map(static function (array $response) use ($spec): array {
            if (($response['body'] ?? null) === '@email') {
                $response['body'] = $spec['email'];
            }

            return $response;
        }, $scenario['responses']);
        $api = new FakeApi($responses);
        $sleeps = [];
        $client = new CossClient(
            apiKey: 'coss_test_conformance',
            baseUrl: 'https://api.coss.test',
            maxRetries: $scenario['options']['max_retries'] ?? CossClient::DEFAULT_MAX_RETRIES,
            handler: $api,
            sleep: function (float $ms) use (&$sleeps): void {
                $sleeps[] = $ms;
            },
            random: fn (): float => (float) ($scenario['random'] ?? 0),
        );
        $transport = new CossTransport($client);

        $error = null;
        $sent = null;
        try {
            $sent = $transport->send(Conformance::email($minimal['input']));
        } catch (CossTransportException $exception) {
            $error = $exception;
        }

        $expect = $scenario['expect'];
        $this->assertCount($expect['attempts'], $api->requests, 'attempts');
        $this->assertEquals($expect['delays_ms'], $sleeps, 'delays');

        $keys = [];
        foreach ($api->requests as $index => $request) {
            $this->assertSame('POST', $request->getMethod());
            $this->assertSame('https://api.coss.test/v1/emails', (string) $request->getUri());
            foreach ($spec['request_headers'] as $name => $value) {
                $this->assertSame($value, $request->getHeaderLine($name), $name);
            }
            $this->assertSame('coss-laravel/0.1.0', $request->getHeaderLine('User-Agent'));
            $this->assertSame($minimal['body'], $api->body($index));
            $keys[] = $request->getHeaderLine('Idempotency-Key');
        }
        $this->assertNotSame('', $keys[0]);
        $this->assertCount(1, array_unique($keys), 'one Idempotency-Key across attempts');

        if ($expect['outcome'] === 'ok') {
            $this->assertNull($error, $error?->getMessage() ?? '');
            $this->assertSame($spec['email']['id'], $sent->getMessageId());
            $this->assertSame($spec['email'], $transport->getLastEmail());

            return;
        }

        $this->assertNotNull($error, 'the send fails');
        $actual = $error->toArray();
        foreach ($expect['error'] as $field => $value) {
            $this->assertArrayHasKey($field, $actual, $field);
            $this->assertSame($value, $actual[$field], $field);
        }
        $this->assertSame($expect['error']['type'], $error->getType());
        $this->assertSame($expect['error']['code'], $error->getErrorCode());
        $this->assertSame($expect['error']['status'], $error->getStatus());
        $this->assertSame($expect['error']['request_id'], $error->getRequestId());
        $this->assertSame($expect['error']['param'] ?? null, $error->getParam());
        $this->assertSame($expect['error']['issues'] ?? null, $error->getIssues());
        if (isset($expect['error_message'])) {
            $this->assertSame($expect['error_message'], $error->getMessage());
        }
        $this->assertStringStartsWith('coss.com could not send the email: ', $error->getMessage());
    }
}
