<?php

namespace Coss\Laravel\Tests\E2E;

use Coss\Laravel\CossClientFactory;
use Coss\Laravel\Exceptions\CossTransportException;
use Coss\Laravel\Tests\Support\Mail\ReceiptMail;
use Coss\Laravel\Tests\TestCase;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

/**
 * Sends through a real coss.com API: the test app started by
 * `bun run --cwd apps/api serve:test`, whose JSON line goes in COSS_E2E. Skipped without it.
 */
final class SendTest extends TestCase
{
    /** @var array{base_url: string, sandbox_key: string, live_key: string, live_from: string} */
    private array $e2e;

    protected function setUp(): void
    {
        $json = getenv('COSS_E2E');
        if (! is_string($json) || $json === '') {
            $this->markTestSkipped('Set COSS_E2E to the JSON line `bun run --cwd apps/api serve:test` prints.');
        }
        $this->e2e = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        parent::setUp();
        $this->app->instance(CossClientFactory::class, new CossClientFactory);
        foreach (['live' => $this->e2e['live_key'], 'sandbox' => $this->e2e['sandbox_key']] as $mode => $key) {
            config()->set("mail.mailers.coss_{$mode}", ['transport' => 'coss', 'key' => $key, 'base_url' => $this->e2e['base_url']]);
        }
    }

    public function test_a_live_send(): void
    {
        $this->sendAndCheck('live', $this->e2e['live_key']);
    }

    public function test_a_sandbox_send(): void
    {
        $this->sendAndCheck('sandbox', $this->e2e['sandbox_key']);
    }

    public function test_a_live_send_from_an_unverified_domain_is_refused(): void
    {
        $mailable = (new ReceiptMail)->from('hello@unverified-'.bin2hex(random_bytes(4)).'.test');

        try {
            Mail::mailer('coss_live')->to('ada@example.com')->send($mailable);
            $this->fail('The send should be refused.');
        } catch (CossTransportException $exception) {
            $this->assertSame('domain_not_verified', $exception->getErrorCode());
            $this->assertSame(422, $exception->getStatus());
            $this->assertStringStartsWith('req_', (string) $exception->getRequestId());
        }
    }

    private function sendAndCheck(string $mode, string $key): void
    {
        $from = Address::create($this->e2e['live_from']);
        $mailable = (new ReceiptMail)
            ->from($from->getAddress(), $from->getName())
            ->replyTo('support@acme.test')
            ->withSymfonyMessage(function (Email $message): void {
                $message->getHeaders()->addTextHeader('X-Campaign', 'spring');
                $message->getHeaders()->addTextHeader('X-Greeting', 'Grüße');
            })
            ->coss([
                'category' => 'receipts',
                'tags' => ['plan' => 'pro'],
                'tracking' => ['opens' => true, 'clicks' => false],
                'idempotency_key' => "laravel-e2e-{$mode}-".bin2hex(random_bytes(8)),
            ]);

        $sent = Mail::mailer("coss_{$mode}")
            ->to(new Address('ada@example.com', 'Ada Lovelace'))
            ->cc('carol@example.com')
            ->bcc('dan@example.com')
            ->send($mailable);
        $id = $sent->getMessageId();
        $this->assertStringStartsWith('email_', $id);

        $email = $this->waitUntilSent($id, $key);
        $this->assertSame($mode === 'sandbox', $email['sandbox']);
        $this->assertSame(['Ada Lovelace <ada@example.com>'], $email['to']);
        $this->assertSame(['carol@example.com'], $email['cc']);
        $this->assertSame(['dan@example.com'], $email['bcc']);
        $this->assertSame(['support@acme.test'], $email['reply_to']);
        $this->assertSame('Your receipt ✓', $email['subject']);
        $this->assertSame('receipts', $email['category']);
        $this->assertEqualsCanonicalizing(
            [['name' => 'plan', 'value' => 'pro'], ['name' => 'order', 'value' => '42']],
            $email['tags'],
        );
        $headers = array_change_key_case($email['headers'], CASE_LOWER);
        $this->assertSame('spring', $headers['x-campaign']);
        $this->assertSame('=?UTF-8?B?R3LDvMOfZQ==?=', $headers['x-greeting']);

        $attachments = [];
        foreach ($email['attachments'] as $attachment) {
            $attachments[$attachment['filename']] = $attachment;
        }
        ksort($attachments);
        $this->assertSame(['logo.png', 'notes.txt', 'receipt.pdf'], array_keys($attachments));
        $this->assertNotNull($attachments['logo.png']['content_id']);
        $this->assertStringContainsString('cid:'.$attachments['logo.png']['content_id'], $email['html']);
        $this->assertNull($attachments['receipt.pdf']['content_id']);
        $this->assertNull($attachments['notes.txt']['content_id']);
        $this->assertSame('application/pdf', $attachments['receipt.pdf']['content_type']);
        $this->assertSame(9, $attachments['receipt.pdf']['size']);
    }

    /** Polls `GET /v1/emails/{id}` until the email is `sent` (at most 10 s). */
    private function waitUntilSent(string $id, string $key): array
    {
        $http = new Client(['base_uri' => rtrim($this->e2e['base_url'], '/').'/', 'http_errors' => true]);
        $deadline = microtime(true) + 10;
        do {
            $email = json_decode((string) $http->get("v1/emails/{$id}", [
                'headers' => ['Authorization' => "Bearer {$key}", 'Accept' => 'application/json'],
            ])->getBody(), true, flags: JSON_THROW_ON_ERROR);
            if ($email['status'] === 'sent') {
                return $email;
            }
            usleep(200_000);
        } while (microtime(true) < $deadline);

        $this->fail("Email {$id} is still {$email['status']} after 10 s.");
    }
}
