<?php

namespace Coss\Laravel\Tests\Support\Mail;

use Illuminate\Mail\Attachment;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;

/** A mailable in Laravel's current style: envelope(), content(), attachments(), headers(). */
class WelcomeMail extends Mailable
{
    /**
     * @param  list<string>  $welcomeTags
     */
    public function __construct(private array $welcomeTags = ['onboarding']) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Welcome',
            tags: $this->welcomeTags,
            metadata: ['user_id' => '7'],
        );
    }

    public function content(): Content
    {
        return new Content(htmlString: '<p>Welcome aboard</p>');
    }

    public function headers(): Headers
    {
        return new Headers(
            messageId: 'welcome-7@acme.test',
            references: ['previous@acme.test'],
            text: ['X-Campaign' => 'Grüße'],
        );
    }

    public function attachments(): array
    {
        return [Attachment::fromData(fn () => 'a,b', 'report.csv')->withMime('text/csv')];
    }
}
