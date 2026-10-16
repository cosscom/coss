<?php

namespace Coss\Laravel\Tests\Conformance;

use Coss\Laravel\CossTransport;
use Coss\Laravel\Http\CossClient;
use Coss\Laravel\Mime;
use Coss\Laravel\Tests\Support\Conformance;
use Coss\Laravel\Tests\Support\FakeApi;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

/**
 * integrations/conformance/message.json: how a message becomes the request body.
 */
final class MessageConformanceTest extends TestCase
{
    public static function headerValues(): iterable
    {
        foreach (Conformance::load('message')['header_values'] as $case) {
            yield json_encode($case['value'], JSON_UNESCAPED_UNICODE) => [$case['value'], $case['sent']];
        }
    }

    #[DataProvider('headerValues')]
    public function test_header_value(string $value, ?string $sent): void
    {
        $encoded = Mime::encodeHeaderValue($value);
        $this->assertSame($sent, $encoded === '' ? null : $encoded);

        // And through the transport: an empty value leaves the header out.
        $api = new FakeApi([FakeApi::email()]);
        $email = $this->minimal();
        $email->getHeaders()->addTextHeader('X-Value', $value);
        $this->transport($api)->send($email);
        $this->assertSame($sent, $api->body()['headers']['X-Value'] ?? null);
    }

    public static function addresses(): iterable
    {
        foreach (Conformance::load('message')['addresses'] as $case) {
            yield $case['formatted'] => [$case['address'], $case['name'], $case['formatted']];
        }
    }

    #[DataProvider('addresses')]
    public function test_address(string $address, ?string $name, string $formatted): void
    {
        $this->assertSame($formatted, Mime::formatAddress($address, $name));

        $api = new FakeApi([FakeApi::email()]);
        $email = $this->minimal()->to(new Address($address, $name ?? ''));
        $this->transport($api)->send($email);
        $this->assertSame([$formatted], $api->body()['to']);
    }

    public static function mediaTypes(): iterable
    {
        foreach (Conformance::load('message')['media_types'] as $case) {
            yield json_encode($case['given']) => [$case['given'], $case['sent']];
        }
    }

    #[DataProvider('mediaTypes')]
    public function test_media_type(?string $given, ?string $sent): void
    {
        $this->assertSame($sent, Mime::mediaType($given));
    }

    public static function reservedHeaders(): iterable
    {
        foreach (Conformance::load('message')['reserved_headers'] as $name) {
            yield $name => [$name];
        }
    }

    #[DataProvider('reservedHeaders')]
    public function test_reserved_header_is_dropped(string $name): void
    {
        $this->assertTrue(Mime::isReservedHeader($name));
        $this->assertTrue(Mime::isReservedHeader(strtoupper($name)));

        $email = $this->minimal();
        $headers = $email->getHeaders();
        if (! $headers->has($name)) {
            match (strtolower($name)) {
                // Address headers are the message's own fields; Sender and Return-Path naming
                // the From address are the same envelope, so they are dropped too.
                'cc', 'bcc', 'reply-to' => $headers->addMailboxListHeader($name, ['someone@example.com']),
                'sender' => $headers->addMailboxHeader($name, 'hello@acme.test'),
                'return-path' => $headers->addPathHeader($name, 'hello@acme.test'),
                'date' => $headers->addDateHeader($name, new \DateTimeImmutable),
                'message-id' => $headers->addIdHeader($name, 'custom@acme.test'),
                'content-type' => $headers->addParameterizedHeader($name, 'text/plain', ['charset' => 'utf-8']),
                default => $headers->addTextHeader($name, 'value'),
            };
        }
        $headers->addTextHeader('X-Kept', 'yes');

        $api = new FakeApi([FakeApi::email()]);
        $this->transport($api)->send($email);
        $this->assertSame(['X-Kept' => 'yes'], $api->body()['headers']);
    }

    public static function messages(): iterable
    {
        foreach (Conformance::load('message')['messages'] as $name => $message) {
            yield $name => [$message];
        }
    }

    #[DataProvider('messages')]
    public function test_message(array $message): void
    {
        $api = new FakeApi([FakeApi::email()]);
        $this->transport($api)->send(Conformance::email($message['input']));

        $this->assertCount(1, $api->requests);
        $this->assertEquals(Conformance::normalizeBody($message['body']), Conformance::normalizeBody($api->body()));
        // Same order too (assertEquals ignores key order).
        $this->assertSame(array_keys($message['body']), array_keys($api->body()));
        $key = $api->requests[0]->getHeaderLine('Idempotency-Key');
        if (isset($message['idempotency_key'])) {
            $this->assertSame($message['idempotency_key'], $key);
        } else {
            $this->assertMatchesRegularExpression('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/', $key);
        }
    }

    private function minimal(): Email
    {
        return Conformance::email(Conformance::load('message')['messages']['minimal']['input']);
    }

    private function transport(FakeApi $api): CossTransport
    {
        return new CossTransport(new CossClient('coss_test_conformance', 'https://api.coss.test', handler: $api, sleep: static fn () => null));
    }
}
