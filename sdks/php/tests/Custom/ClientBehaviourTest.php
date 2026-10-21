<?php

// Hand-written (listed in .fernignore): the generated client's request behaviour (headers,
// retries, idempotency keys).

namespace Coss\Tests\Custom;

use Coss\Coss;
use Coss\Email\Requests\SendEmailBody;
use Coss\Exceptions\CossApiException;
use Coss\Types\SegmentFilterConditionsItemKey;
use Coss\Types\SendEmailRequest;
use Coss\WebhookEndpoints\Requests\CreateWebhookEndpointRequest;
use Coss\WebhookEndpoints\Requests\UpdateWebhookEndpointRequest;
use GuzzleHttp\Psr7\Response;
use PHPUnit\Framework\Attributes\TestWith;
use PHPUnit\Framework\TestCase;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestInterface;
use Psr\Http\Message\ResponseInterface;

final class FakeApi implements ClientInterface
{
    /** @var list<RequestInterface> */
    public array $requests = [];

    /** @param list<int> $statuses */
    public function __construct(private array $statuses = [])
    {
    }

    public function sendRequest(RequestInterface $request): ResponseInterface
    {
        $this->requests[] = $request;
        $status = $this->statuses[count($this->requests) - 1] ?? 200;
        $openapi = json_decode((string) file_get_contents(__DIR__ . '/../../../../apps/api/openapi.json'), true);
        $body = $status >= 300
            ? '{"error":{"type":"api_error","code":"x","message":"No.","request_id":"req_1"}}'
            : json_encode($openapi['components']['schemas']['Email']['examples'][0]);
        return new Response($status, ['Content-Type' => 'application/json', 'Retry-After' => '0'], $body);
    }
}

final class ClientBehaviourTest extends TestCase
{
    private static function client(FakeApi $api): Coss
    {
        return new Coss('coss_test_key', options: ['baseUrl' => 'https://api.coss.test', 'client' => $api]);
    }

    private static function email(): SendEmailBody
    {
        return new SendEmailBody(['body' => new SendEmailRequest([
            'from' => 'hello@acme.test',
            'to' => ['someone@example.com'],
            'subject' => 'Hi',
            'text' => 'Hi',
        ])]);
    }

    public function testSendsTheCossHeaders(): void
    {
        $api = new FakeApi();
        self::client($api)->email->get('email_1');
        $request = $api->requests[0];
        $version = trim((string) file_get_contents(__DIR__ . '/../../../VERSION'));
        $this->assertSame('/v1/emails/email_1', $request->getUri()->getPath());
        $this->assertSame('Bearer coss_test_key', $request->getHeaderLine('Authorization'));
        $this->assertSame("coss-php/$version", $request->getHeaderLine('User-Agent'));
        $this->assertNotSame('', $request->getHeaderLine('Coss-Version'));
    }

    public function testRetriesAPostWithOneIdempotencyKey(): void
    {
        $api = new FakeApi([503, 409]);
        self::client($api)->email->send(self::email());
        $this->assertCount(3, $api->requests);
        $keys = array_unique(array_map(fn ($r) => $r->getHeaderLine('Idempotency-Key'), $api->requests));
        $this->assertCount(1, $keys);
        $this->assertNotSame('', $keys[0]);
    }

    public function testKeepsTheCallersIdempotencyKey(): void
    {
        $api = new FakeApi();
        $email = self::email();
        $email->idempotencyKey = 'order-42';
        self::client($api)->email->send($email);
        $this->assertSame('order-42', $api->requests[0]->getHeaderLine('Idempotency-Key'));
    }

    #[TestWith([400])]
    #[TestWith([402])]
    #[TestWith([404])]
    #[TestWith([422])]
    public function testNeverRetriesClientErrors(int $status): void
    {
        $api = new FakeApi([$status]);
        try {
            self::client($api)->email->get('email_1');
            $this->fail('No CossApiException');
        } catch (CossApiException $e) {
            $this->assertSame($status, $e->getCode());
        }
        $this->assertCount(1, $api->requests);
    }

    public function testNeverRetriesWhatTheApiDoesNotDeduplicate(): void
    {
        $api = new FakeApi([503]);
        try {
            self::client($api)->webhookEndpoints->create(new CreateWebhookEndpointRequest(['url' => 'https://example.com/hooks']));
            $this->fail('No CossApiException');
        } catch (CossApiException) {
        }
        $this->assertCount(1, $api->requests);
    }

    public function testSendsAnExplicitNullAndLeavesOmittedFieldsOut(): void
    {
        $api = new FakeApi();
        try {
            self::client($api)->webhookEndpoints->update('we_1', new UpdateWebhookEndpointRequest(['description' => null]));
        } catch (\Throwable) {
            // The fake answers with an email, not an endpoint: only the request matters here.
        }
        $this->assertSame('{"description":null}', (string) $api->requests[0]->getBody());
    }

    public function testSerializesIntegersWhereAUnionTakesANumber(): void
    {
        $condition = new SegmentFilterConditionsItemKey([
            'field' => 'property',
            'key' => 'seats',
            'op' => 'in',
            'value' => [1, 2.5],
        ]);
        $this->assertSame('{"field":"property","key":"seats","op":"in","value":[1,2.5]}', $condition->toJson());
    }

    public function testEscapesPathParameters(): void
    {
        $api = new FakeApi();
        try {
            self::client($api)->risk->users->forget('alice#secondary/1');
        } catch (\Throwable) {
            // The fake answers with an email: only the request matters here.
        }
        $this->assertSame('/v1/risk/users/alice%23secondary%2F1', $api->requests[0]->getUri()->getPath());
    }

    public function testLeavesAnOmittedUnionFieldOut(): void
    {
        $condition = new SegmentFilterConditionsItemKey(['field' => 'property', 'key' => 'plan', 'op' => 'exists']);
        $this->assertSame('{"field":"property","key":"plan","op":"exists"}', $condition->toJson());
        $condition = new SegmentFilterConditionsItemKey(['field' => 'property', 'key' => 'plan', 'op' => 'in', 'value' => ['pro']]);
        $this->assertSame('{"field":"property","key":"plan","op":"in","value":["pro"]}', $condition->toJson());
    }

    public function testKeepsHttpErrorsWithATimeoutOnGuzzle(): void
    {
        $history = [];
        $stack = \GuzzleHttp\HandlerStack::create(new \GuzzleHttp\Handler\MockHandler([
            new Response(422, ['Content-Type' => 'application/json'], '{"error":{"type":"invalid_request_error","code":"validation_error","message":"No.","request_id":"req_1"}}'),
        ]));
        $stack->push(\GuzzleHttp\Middleware::history($history));
        $coss = new Coss('coss_test_key', options: [
            'baseUrl' => 'https://api.coss.test',
            'client' => new \GuzzleHttp\Client(['handler' => $stack]),
            'timeout' => 5.0,
        ]);
        try {
            $coss->email->get('email_1');
            $this->fail('No CossApiException');
        } catch (CossApiException $e) {
            $this->assertSame(422, $e->getCode());
            $this->assertStringContainsString('validation_error', (string) $e->getBody());
        }
        $this->assertCount(1, $history);
    }
}
