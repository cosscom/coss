<?php

namespace Coss\Laravel\Tests\Feature;

use Coss\Laravel\CossTransport;
use Coss\Laravel\Exceptions\CossTransportException;
use Coss\Laravel\Tests\Support\FakeApi;
use Coss\Laravel\Tests\Support\InvoicePaid;
use Coss\Laravel\Tests\Support\Mail\ReceiptMail;
use Coss\Laravel\Tests\Support\Mail\WelcomeMail;
use Coss\Laravel\Tests\TestCase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

final class MailerTest extends TestCase
{
    public function test_a_mailable_with_tags_metadata_attachments_an_embedded_image_and_coss_options(): void
    {
        $this->api->push(FakeApi::email('email_01kreceipt'));

        $mailable = (new ReceiptMail)->coss([
            'category' => 'billing',
            'tags' => ['plan' => 'pro', 'source' => 'checkout'],
            'scheduled_at' => Carbon::parse('2026-11-01 10:00:00.250', 'Europe/Berlin'),
            'tracking' => ['opens' => true, 'clicks' => false],
            'idempotency_key' => 'order-42',
        ]);
        $sent = Mail::mailer('coss')->to('ada@example.com', 'Ada Lovelace')->cc('carol@example.com')->send($mailable);

        $this->assertSame('email_01kreceipt', $sent->getMessageId());
        $this->assertCount(1, $this->api->requests);
        $request = $this->api->requests[0];
        $this->assertSame('order-42', $request->getHeaderLine('Idempotency-Key'));
        $this->assertSame('Bearer coss_test_conformance', $request->getHeaderLine('Authorization'));
        $this->assertSame('https://api.coss.test/v1/emails', (string) $request->getUri());

        $body = $this->api->body();
        $this->assertSame('Acme <hello@acme.test>', $body['from']);
        $this->assertSame(['Ada Lovelace <ada@example.com>'], $body['to']);
        $this->assertSame(['carol@example.com'], $body['cc']);
        $this->assertSame('Your receipt ✓', $body['subject']);
        $this->assertSame("Thanks for your order, Ada!\n", $body['text']);
        $this->assertArrayNotHasKey('headers', $body);

        $this->assertCount(3, $body['attachments']);
        // The view (and its embedded image) is rendered before the attachments are added.
        [$logo, $pdf, $notes] = $body['attachments'];
        $this->assertSame(['filename' => 'receipt.pdf', 'content' => 'JVBERi0xLjQK', 'content_type' => 'application/pdf'], $pdf);
        $this->assertSame(['filename' => 'notes.txt', 'content' => base64_encode('héllo'), 'content_type' => 'text/plain'], $notes);
        $this->assertSame('logo.png', $logo['filename']);
        $this->assertSame('iVBORw0KGgo=', $logo['content']);
        $this->assertSame('image/png', $logo['content_type']);
        // The HTML goes as Laravel rendered it, referring to the image by its content id.
        $this->assertStringContainsString('<img src="cid:'.$logo['content_id'].'"', $body['html']);
        $this->assertMatchesRegularExpression('/^[^<>\s]+@[^<>\s]+$/', $logo['content_id']);

        // coss() wins over tag() and replaces metadata of the same name in place.
        $this->assertSame('billing', $body['category']);
        $this->assertSame([
            ['name' => 'plan', 'value' => 'pro'],
            ['name' => 'order', 'value' => '42'],
            ['name' => 'source', 'value' => 'checkout'],
        ], $body['tags']);
        $this->assertSame('2026-11-01T09:00:00Z', $body['scheduled_at']);
        $this->assertSame(['opens' => true, 'clicks' => false], $body['tracking']);

        $transport = Mail::mailer('coss')->getSymfonyTransport();
        $this->assertInstanceOf(CossTransport::class, $transport);
        $this->assertSame('coss', (string) $transport);
        $this->assertSame('email_01kreceipt', $transport->getLastEmail()['id']);
        $this->assertStringContainsString('email_01kreceipt', $sent->getDebug());
    }

    public function test_tag_becomes_the_category_and_metadata_the_tags(): void
    {
        $this->api->push(FakeApi::email());

        Mail::to('ada@example.com')->send(new WelcomeMail);

        $body = $this->api->body();
        $this->assertSame('onboarding', $body['category']);
        $this->assertSame([['name' => 'user_id', 'value' => '7']], $body['tags']);
        $this->assertSame('<p>Welcome aboard</p>', $body['html']);
        $this->assertArrayNotHasKey('text', $body);
        // Message-ID is reserved; References and custom text headers are sent, encoded.
        $this->assertSame(['References' => '<previous@acme.test>', 'X-Campaign' => '=?UTF-8?B?R3LDvMOfZQ==?='], $body['headers']);
        $this->assertSame([['filename' => 'report.csv', 'content' => base64_encode('a,b'), 'content_type' => 'text/csv']], $body['attachments']);
        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}$/', $this->api->requests[0]->getHeaderLine('Idempotency-Key'));
    }

    public function test_a_notification_with_coss_options(): void
    {
        $this->api->push(FakeApi::email('email_01kinvoice'));

        Notification::route('mail', 'ada@example.com')->notify(new InvoicePaid);

        $body = $this->api->body();
        $this->assertSame(['ada@example.com'], $body['to']);
        $this->assertSame('Invoice paid', $body['subject']);
        $this->assertStringContainsString('Thanks for paying.', $body['html']);
        $this->assertStringContainsString('Thanks for paying.', $body['text']);
        $this->assertSame('billing', $body['category']);
        $this->assertSame([['name' => 'invoice', 'value' => 'inv_1']], $body['tags']);
        $this->assertSame('invoice-inv_1-paid', $this->api->requests[0]->getHeaderLine('Idempotency-Key'));
        $this->assertArrayNotHasKey('headers', $body);
    }

    public function test_always_to_rewrites_the_message_so_it_still_sends(): void
    {
        $this->api->push(FakeApi::email());
        Mail::alwaysTo('dev@acme.test');

        Mail::to('ada@example.com')->cc('carol@example.com')->send(new WelcomeMail);

        $body = $this->api->body();
        $this->assertSame(['dev@acme.test'], $body['to']);
        $this->assertArrayNotHasKey('cc', $body);
    }

    public function test_a_queued_mailable_keeps_its_coss_options(): void
    {
        $this->api->push(FakeApi::email());

        $mailable = unserialize(serialize((new ReceiptMail)->coss(['category' => 'billing'])->coss(['idempotency_key' => 'k-1'])));
        Mail::to('ada@example.com')->send($mailable);

        $this->assertSame('billing', $this->api->body()['category']);
        $this->assertSame('k-1', $this->api->requests[0]->getHeaderLine('Idempotency-Key'));
    }

    public function test_an_api_error_is_thrown_from_the_send(): void
    {
        $this->api->push(['status' => 422, 'body' => ['error' => [
            'type' => 'invalid_request_error',
            'code' => 'domain_not_verified',
            'message' => 'The domain acme.test is not verified.',
            'param' => 'from',
            'request_id' => 'req_1',
        ]]]);

        try {
            Mail::to('ada@example.com')->send(new WelcomeMail);
            $this->fail('The send should fail.');
        } catch (CossTransportException $exception) {
            $this->assertSame('domain_not_verified', $exception->getErrorCode());
            $this->assertSame('invalid_request_error', $exception->getType());
            $this->assertSame(422, $exception->getStatus());
            $this->assertSame('req_1', $exception->getRequestId());
            $this->assertSame('from', $exception->getParam());
            $this->assertNull($exception->getIssues());
            $this->assertSame('coss.com could not send the email: The domain acme.test is not verified. (domain_not_verified)', $exception->getMessage());
        }
    }

    public function test_the_mailer_settings_win_over_services(): void
    {
        config()->set('mail.mailers.coss', [
            'transport' => 'coss',
            'key' => 'coss_live_mailer',
            'base_url' => 'https://eu.api.coss.test',
            'max_retries' => 0,
        ]);
        $this->api->push(['status' => 503, 'body' => '']);

        $this->expectException(CossTransportException::class);
        try {
            Mail::to('ada@example.com')->send(new WelcomeMail);
        } finally {
            $this->assertCount(1, $this->api->requests);
            $this->assertSame('Bearer coss_live_mailer', $this->api->requests[0]->getHeaderLine('Authorization'));
            $this->assertSame('https://eu.api.coss.test/v1/emails', (string) $this->api->requests[0]->getUri());
            $this->assertSame([], $this->sleeps);
        }
    }
}
