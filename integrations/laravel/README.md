# coss.com for Laravel

Send your Laravel app's mail (Mailables, notifications, `Mail::raw()` …) through
[coss.com](https://coss.com): switch the mailer, keep your call sites.

Docs: [coss.com/docs/integrations/laravel](https://coss.com/docs/integrations/laravel)

Requires PHP 8.2+ and Laravel 12 or 13.

## Install

```sh
composer require coss/laravel
```

The service provider is auto-discovered. Add a mailer to `config/mail.php`:

```php
'mailers' => [
    // …
    'coss' => [
        'transport' => 'coss',
    ],
],
```

and your API key to `config/services.php`:

```php
'coss' => [
    'key' => env('COSS_API_KEY'),
],
```

Then set `MAIL_MAILER=coss` and `COSS_API_KEY=coss_live_…` in `.env` (a `coss_test_…` key sends
from a sandbox environment: nothing is delivered). Live sends need a verified domain for the
From address (`MAIL_FROM_ADDRESS`).

## Configuration

Each setting is read from the mailer's own config, then `services.coss`, then the environment:

| Key           | Default                 | Environment     |                                     |
| ------------- | ----------------------- | --------------- | ----------------------------------- |
| `key`         | —                       | `COSS_API_KEY`  | Required. Checked on the first send, never while the app boots. |
| `base_url`    | `https://api.coss.com`  | `COSS_BASE_URL` |                                     |
| `timeout`     | `30`                    |                 | Seconds per attempt.                |
| `max_retries` | `2`                     |                 | Retries after the first attempt.    |

Network errors, timeouts, 409, 429 and 5xx responses are retried with backoff (honouring
`Retry-After` up to 60 seconds), always with the same `Idempotency-Key`, so a retried send is
never sent twice.

## Usage

Send as usual:

```php
Mail::to($user)->send(new OrderShipped($order));
```

The sent message's id is the coss.com email id; look it up in the dashboard or with the API:

```php
$sent = Mail::to($user)->send(new OrderShipped($order));
$sent->getMessageId(); // "email_01k…"
```

What maps where:

- From, To, Cc, Bcc, Reply-To, the subject, the HTML and text bodies and attachments are sent as
  they are. Embedded images (`$message->embed()`, `embedData()`, inline parts) keep their
  `cid:` references.
- `tag('receipts')` (or `Envelope(tags: […])`) becomes the email's **category**. coss.com files an
  email under one category, so more than one tag is refused.
- `metadata('plan', 'pro')` becomes a **tag** (`{ "name": "plan", "value": "pro" }`).
- Other headers are sent as custom headers (values encoded as needed). Headers coss.com sets
  itself (`Message-ID`, `Date`, `Content-Type`, `X-SES-*` …) are dropped.

## coss.com options

For coss.com's own fields, add the `SendsWithCoss` trait to a Mailable and call `coss()`:

```php
use Coss\Laravel\Concerns\SendsWithCoss;
use Illuminate\Mail\Mailable;

class OrderShipped extends Mailable
{
    use SendsWithCoss;
    // …
}

Mail::to($user)->send((new OrderShipped($order))->coss([
    'category' => 'receipts',                      // wins over tag()
    'tags' => ['plan' => 'pro'],                   // or [['name' => 'plan', 'value' => 'pro']]; merged over metadata()
    'scheduled_at' => now()->addHour(),            // a DateTimeInterface (sent as UTC) or an ISO 8601 string
    'tracking' => ['opens' => true, 'clicks' => false, 'unsubscribe' => false],
    'idempotency_key' => "order-{$order->id}-shipped",
]));
```

Queued mailables keep their options. Unknown keys throw an `InvalidArgumentException`.

In a notification (or on any Symfony `Email`), use `CossOptions::apply()`:

```php
use Coss\Laravel\CossOptions;
use Symfony\Component\Mime\Email;

public function toMail(object $notifiable): MailMessage
{
    return (new MailMessage)
        ->subject('Invoice paid')
        ->line('Thanks!')
        ->withSymfonyMessage(fn (Email $message) => CossOptions::apply($message, [
            'category' => 'billing',
        ]));
}
```

`idempotency_key` defaults to a random key per message (reused by the client's own retries). Set
your own to make a send safe to repeat: a second send with the same key isn't sent again, and
coss.com returns the first email.

## Errors

When coss.com refuses or can't take an email (after the retries), the send throws
`Coss\Laravel\Exceptions\CossTransportException`, a Symfony `TransportException`:

```php
use Coss\Laravel\Exceptions\CossTransportException;

try {
    Mail::to($user)->send(new OrderShipped($order));
} catch (CossTransportException $e) {
    $e->getMessage();    // "coss.com could not send the email: … (domain_not_verified)"
    $e->getType();       // "invalid_request_error", "rate_limit_error", "connection_error", "timeout_error" …
    $e->getErrorCode();  // "domain_not_verified"
    $e->getStatus();     // 422, or null without a response
    $e->getRequestId();  // "req_…" (quote it to support)
    $e->getParam();      // "from"
    $e->getIssues();     // [['path' => 'to', 'message' => '…'], …] or null
}
```

What coss.com can't send fails the send with a
`Coss\Laravel\Exceptions\UnsupportedMessageException` instead of being dropped: raw MIME
messages, a body set with `setBody()` (including signed messages), a `Sender` header or `Return-Path` other than the From address, an envelope whose
recipients differ from To + Cc + Bcc, a header given more than once, more than one From
address, and more than one tag. (`Mail::alwaysTo()` rewrites the message itself, so it works.)

A missing API key throws `Coss\Laravel\Exceptions\MissingApiKeyException` from the send. All
three implement `Coss\Laravel\Exceptions\CossException`.

## Development

```sh
composer install
composer lint   # Pint
composer test   # PHPUnit, including integrations/conformance
```

The end-to-end tests run against the API's test app when `COSS_E2E` holds the JSON line that
`bun run --cwd apps/api serve:test` prints (from the coss repository), and are skipped otherwise.

## License

MIT
