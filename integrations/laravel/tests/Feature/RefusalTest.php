<?php

namespace Coss\Laravel\Tests\Feature;

use Coss\Laravel\Exceptions\UnsupportedMessageException;
use Coss\Laravel\Tests\Support\Mail\ReceiptMail;
use Coss\Laravel\Tests\Support\Mail\WelcomeMail;
use Coss\Laravel\Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Envelope;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\Part\Multipart\MixedPart;
use Symfony\Component\Mime\Part\TextPart;
use Symfony\Component\Mime\RawMessage;

/**
 * What coss.com can't send fails the send (and nothing reaches the API).
 */
final class RefusalTest extends TestCase
{
    public function test_two_tags(): void
    {
        $this->assertRefused('it has 2 tags', fn () => Mail::to('ada@example.com')->send(new WelcomeMail(['onboarding', 'drip'])));
    }

    public function test_a_sender_header(): void
    {
        $mailable = (new WelcomeMail)->withSymfonyMessage(fn (Email $message) => $message->sender('bounces@other.test'));

        $this->assertRefused('it has a Sender header', fn () => Mail::to('ada@example.com')->send($mailable));
    }

    public function test_a_separate_return_path(): void
    {
        $mailable = (new WelcomeMail)->withSymfonyMessage(fn (Email $message) => $message->returnPath('bounces@other.test'));

        $this->assertRefused('its Return-Path differs from the From address', fn () => Mail::to('ada@example.com')->send($mailable));
    }

    public function test_a_mismatched_envelope(): void
    {
        $transport = Mail::mailer('coss')->getSymfonyTransport();
        $email = (new Email)->from('hello@acme.test')->to('ada@example.com')->subject('Hi')->text('Hi');

        $this->assertRefused(
            'its envelope recipients differ',
            fn () => $transport->send($email, new Envelope(new Address('hello@acme.test'), [new Address('someone@else.test')])),
        );
        $this->assertRefused(
            'its envelope sender (bounces@acme.test) differs',
            fn () => $transport->send($email, new Envelope(new Address('bounces@acme.test'), [new Address('ada@example.com')])),
        );
    }

    public function test_a_header_given_twice(): void
    {
        $mailable = (new WelcomeMail)->withSymfonyMessage(function (Email $message): void {
            $message->getHeaders()->addTextHeader('X-Campaign', 'spring');
        });

        $this->assertRefused('the X-Campaign header is given more than once', fn () => Mail::to('ada@example.com')->send($mailable));
    }

    public function test_an_explicit_mime_body(): void
    {
        $mailable = (new WelcomeMail)->withSymfonyMessage(fn (Email $message) => $message->setBody(new MixedPart(
            new TextPart('replacement'),
            new TextPart('BEGIN:VCALENDAR', 'utf-8', 'calendar'),
        )));

        $this->assertRefused('it has a MIME body set with setBody()', fn () => Mail::to('ada@example.com')->send($mailable));
    }

    public function test_no_to_address(): void
    {
        $transport = Mail::mailer('coss')->getSymfonyTransport();
        $email = (new Email)->from('hello@acme.test')->bcc('hidden@example.com')->subject('Hi')->text('Hi');

        $this->assertRefused('it has no To address', fn () => $transport->send($email));
    }

    public function test_a_raw_message(): void
    {
        $transport = Mail::mailer('coss')->getSymfonyTransport();

        $this->assertRefused(
            'raw MIME messages',
            fn () => $transport->send(new RawMessage("Subject: Hi\r\n\r\nHi"), new Envelope(new Address('hello@acme.test'), [new Address('ada@example.com')])),
        );
    }

    public function test_more_than_one_from_address(): void
    {
        $mailable = (new WelcomeMail)->withSymfonyMessage(fn (Email $message) => $message->addFrom('sales@acme.test'));

        $this->assertRefused('more than one From address', fn () => Mail::to('ada@example.com')->send($mailable));
    }

    public function test_unknown_coss_options(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Unknown coss.com option "categroy"');

        (new ReceiptMail)->coss(['categroy' => 'billing']);
    }

    public function test_unknown_tracking_options(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Unknown coss.com tracking option "open"');

        (new ReceiptMail)->coss(['tracking' => ['open' => true]]);
    }

    private function assertRefused(string $message, \Closure $send): void
    {
        try {
            $send();
            $this->fail('The send should be refused.');
        } catch (UnsupportedMessageException $exception) {
            $this->assertStringContainsString($message, $exception->getMessage());
            $this->assertStringStartsWith("coss.com can't send this email: ", $exception->getMessage());
        }
        $this->assertSame([], $this->api->requests);
    }
}
