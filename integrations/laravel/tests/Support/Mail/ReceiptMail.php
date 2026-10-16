<?php

namespace Coss\Laravel\Tests\Support\Mail;

use Coss\Laravel\Concerns\SendsWithCoss;
use Illuminate\Mail\Mailable;

/** A classic build() mailable: tag(), metadata(), attach(), attachData() and an embedded image. */
class ReceiptMail extends Mailable
{
    use SendsWithCoss;

    public function __construct(public string $name = 'Ada') {}

    public function build(): static
    {
        return $this->subject('Your receipt ✓')
            ->view('receipt', ['logo' => dirname(__DIR__, 2).'/fixtures/logo.png'])
            ->text('receipt-text')
            ->tag('receipts')
            ->metadata('plan', 'free')
            ->metadata('order', '42')
            ->attach(dirname(__DIR__, 2).'/fixtures/receipt.pdf')
            ->attachData('héllo', 'notes.txt', ['mime' => 'text/plain']);
    }
}
