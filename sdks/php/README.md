# coss.com SDK for PHP

Every endpoint of the [coss.com](https://coss.com) API, typed, for PHP 8.1+: email, Hooks,
Risk, webhooks and more, with retries, idempotency keys and webhook verification. For Laravel's
mailer, use [coss/laravel](https://coss.com/docs/integrations/laravel).

```sh
composer require coss/coss
```

It uses the project's [PSR-18](https://www.php-fig.org/psr/psr-18/) HTTP client (without one:
`composer require guzzlehttp/guzzle`).

```php
use Coss\Coss;
use Coss\Email\Requests\SendEmailBody;
use Coss\Types\SendEmailRequest;

$client = new Coss(); // reads COSS_API_KEY

$email = $client->email->send(new SendEmailBody([
    'body' => new SendEmailRequest([
        'from' => 'Acme <hello@acme.com>',
        'to' => ['ada@example.com'],
        'subject' => 'Welcome to Acme',
        'html' => '<p>Thanks for signing up!</p>',
    ]),
]));
```

- Guide: [coss.com/docs/sdks/php](https://coss.com/docs/sdks/php) (options, errors, lists, webhooks)
- Every method: [reference.md](./reference.md), and each endpoint's page in the
  [API reference](https://coss.com/docs/api-reference)

This repository is a read-only mirror of
[sdks/php in cosscom/coss](https://github.com/cosscom/coss/tree/main/sdks/php), where the SDK is
generated from the API's OpenAPI document: open issues and pull requests there. MIT licensed.
