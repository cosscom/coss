<?php

namespace Coss\Laravel\Tests\Support;

use Coss\Laravel\CossOptions;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Symfony\Component\Mime\Email;

class InvoicePaid extends Notification
{
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Invoice paid')
            ->line('Thanks for paying.')
            ->withSymfonyMessage(fn (Email $message) => CossOptions::apply($message, [
                'category' => 'billing',
                'tags' => [['name' => 'invoice', 'value' => 'inv_1']],
                'idempotency_key' => 'invoice-inv_1-paid',
            ]));
    }
}
