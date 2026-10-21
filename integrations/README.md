# coss.com framework drivers

Mail drivers that send a framework's own messages through the coss.com API (`POST /v1/emails`),
so an app switches to coss.com by changing configuration, not call sites:

| Directory  | Package                          | Framework               | Docs                                      |
| ---------- | -------------------------------- | ----------------------- | ----------------------------------------- |
| `laravel/` | `coss/laravel` (Packagist)       | Laravel 12–13, PHP 8.2+ | [coss.com/docs/integrations/laravel](https://coss.com/docs/integrations/laravel) |
| `rails/`   | `coss-rails` (RubyGems)          | Rails 7.2–8.1, Ruby 3.2+ | [coss.com/docs/integrations/rails](https://coss.com/docs/integrations/rails) |
| `django/`  | `coss-django` (PyPI)             | Django 5.2–6.1, Python 3.10+ | [coss.com/docs/integrations/django](https://coss.com/docs/integrations/django) |

For everything beyond sending a framework's mail, use the SDK of the language
([`sdks/`](../sdks/AGENTS.md): Python, Go, Ruby, PHP, Java and .NET, generated from the OpenAPI
document). The drivers keep their own small clients; they don't depend on those SDKs (yet).

The JavaScript integrations (Nodemailer, Better Auth, Auth.js) live in the `coss` package itself
(`packages/sdk`). Each driver here is MIT licensed (its own `LICENSE`), has no dependency beyond
its framework (each has a small HTTP client of its own), and is not a Bun workspace: turbo, Biome
and the Docker images never see it.

## Rules every driver follows

These match the JavaScript integrations (`packages/sdk/src/core/{http,mime,integration}.ts`). A
change here is a change to all of them.

### The request

- `POST {base_url}/v1/emails`, the base URL from the driver's configuration, else the
  `COSS_BASE_URL` environment variable, else `https://api.coss.com` (trailing slashes trimmed), JSON body (UTF-8, not ASCII-escaped is fine either way), with these headers:
  `Authorization: Bearer <key>`, `Content-Type: application/json`, `Accept: application/json`,
  `Coss-Version: 2026-10-10` (the SDK's `API_VERSION`), `User-Agent: coss-<driver>/<version>` (e.g.
  `coss-laravel/0.1.0`), and `Idempotency-Key`.
- One message is one request. Batches (`/v1/emails/batch`) are all-or-nothing, which doesn't fit
  any framework's per-message results.
- The API key comes from the driver's configuration, else the `COSS_API_KEY` environment
  variable. A missing key fails the send with a clear message naming both (never the app's boot).

### Retries

- Every attempt has a timeout (default 30 s; the PHP, Ruby and Python HTTP clients apply it to
  connecting and to each read or write rather than as one deadline); retries default to 2 (so at
  most 3 attempts).
- Retried: network errors, timeouts, 409 (an idempotent request still in progress), 429 and 5xx.
  Never retried: any other status, including 402.
- The wait before retry `n` (0-based) is `Retry-After` when the response has one (delay-seconds or
  an HTTP date, in milliseconds), else `min(500 · 2ⁿ, 8000) · (1 − random · 0.25)` ms with
  `random ∈ [0, 1)`. A `Retry-After` above 60 s gives up and returns that response's error.
- The `Idempotency-Key` is generated once per message (a random UUID) unless the message sets
  its own, and every attempt reuses it.
- Tests inject the sleep, the random source and the HTTP transport.

### Errors

Every failed request becomes the driver's error type carrying `type`, `code`, `message`, `status` (null
when there was no response), `request_id` (null when unknown), and the envelope's `param` and
`issues` when present. Its message reads
`coss.com could not send the email: <message> (<code>)`, followed by ` <path>: <message>; …` when
there are issues.

- An error response with the envelope `{ "error": { type, code, message, param?, issues?,
  request_id } }` maps field by field. A `type` outside `invalid_request_error`,
  `authentication_error`, `permission_error`, `not_found_error`, `idempotency_error`,
  `rate_limit_error`, `billing_error`, `api_error` becomes `api_error`; a missing `code` becomes
  `unknown_error`; a missing `request_id` falls back to the `X-Request-Id` header.
- An error response without that envelope (no JSON, or no string `message`): type `api_error`,
  code `unexpected_response`, message
  `The coss.com API returned an unexpected HTTP <status> response.`
- A 2xx whose body isn't JSON: type `api_error`, code `invalid_response`.
- A network error: type `connection_error`, code `network_error`. A timeout: type
  `timeout_error`, code `request_timeout`. Both with `status` null.

### The message

- **Addresses** are `addr`, or `Name <addr>` with the name trimmed and wrapped in double quotes
  (escaping `"` and `\`) when it contains any of `"<>,;:@()[]\`. `to`, `cc`, `bcc` and `reply_to`
  are always arrays; empty ones are left out, as are an empty `html` or `text`.
- **Subject, html, text** are sent as they are (UTF-8). The framework's own encoding of them never
  reaches the API.
- **Attachments**: `{ filename, content, content_type?, content_id? }`. `content` is standard,
  padded base64 without line breaks. `content_type` is the media type only, lowercase
  (`text/plain; charset=utf-8` → `text/plain`). An inline attachment (or one with a Content-ID)
  gets `content_id` without angle brackets. A missing filename becomes `attachment-<n>` (1-based).
- **Headers**: names kept as given; any header the API reserves is dropped silently, because
  frameworks set them on every message: `from`, `to`, `cc`, `bcc`, `reply-to`, `subject`,
  `sender`, `return-path`, `date`, `message-id`, `mime-version`, `content-type`,
  `content-transfer-encoding`, `content-disposition`, `dkim-signature`, `received` and anything
  starting with `x-ses-` (case-insensitive; `RESERVED_HEADERS` in `packages/email/src/schemas.ts`).
  Values are unfolded (a line break and the whitespace after it become one space), other control
  characters become spaces, then trimmed; a value that is still not printable ASCII becomes RFC 2047
  encoded-words, `=?UTF-8?B?<base64>?=`, each holding at most 45 bytes of UTF-8 (whole characters
  only), joined by single spaces. A header left empty is dropped. Anything else the API refuses (more
  than 15 headers, a bad name) comes back as the API's own 422.
- **coss.com's own fields** (`category`, `tags`, `scheduled_at`, `tracking`, the idempotency key)
  get one native extension point per framework and never travel as headers. Tags are given as a
  map (`{ plan: "pro" }`) or a list of `{ name, value }` and sent as a list of `{ name, value }` (map
  order kept). A `scheduled_at` date-time is sent as UTC, `YYYY-MM-DDTHH:MM:SSZ` (fractions dropped);
  a string is sent as given.
- **What coss.com can't send fails the send** with a clear message instead of being dropped: raw
  MIME messages, an envelope that differs from the headers (a `Sender`, `Return-Path` or envelope
  sender naming another address than From, envelope recipients other than to + cc + bcc), more
  than one From address, no To address (the API needs one, and Cc or Bcc addresses are never moved
  into To), a header with several values, and alternative parts other than one HTML part. A `Sender` or `Return-Path` naming the From address is harmless and dropped like the other
  reserved headers. These refusals, like a missing API key, raise the driver's own exceptions
  (below), never the request error above, and they are raised before any request is made.

| Driver  | Request failures | Refusals | Missing API key |
| ------- | ---------------- | -------- | --------------- |
| Laravel | `Coss\Laravel\Exceptions\CossTransportException` (a Symfony `TransportException`) | `UnsupportedMessageException` | `MissingApiKeyException` (both Symfony `LogicException`s, so a failover mailer doesn't silently fall back) |
| Rails   | `Coss::Rails::DeliveryError` | `Coss::Rails::UnsupportedMessageError` | `Coss::Rails::ConfigurationError` (all `Coss::Rails::Error`) |
| Django  | `coss_django.CossError` | `ValueError` (raised even with `fail_silently`, like Django's own bad-header errors) | `ImproperlyConfigured` |

### What a send returns

The email's coss.com id (`email_…`) is exposed the framework's way (Laravel: the sent message's
message id; Rails: the delivery's return value and `message.coss_email`; Django:
`message.coss_email`). Drivers never retry a whole send themselves beyond the client's retries.

## Conformance

`conformance/http.json` (retries, `Retry-After`, error mapping) and `conformance/message.json`
(a canonical message and the exact request body it becomes) are run by every driver's tests. `conformance/webhooks.json`
(webhook and log drain signature checks) is the generated SDKs' (`sdks/`), checked against the
TypeScript SDK by `packages/sdk/test/webhooks-conformance.test.ts`.
Header names in `message.json` compare case-insensitively (frameworks normalize them).

End to end: `bun run --cwd apps/api serve:test` (needs `TEST_DATABASE_URL`) starts the API's test
app on a port and prints `{ base_url, sandbox_key, live_key, live_from }`; each driver's e2e test
reads it from `COSS_E2E` (that JSON) and is skipped without it.

| Driver  | Lint                        | Tests                        |
| ------- | --------------------------- | ---------------------------- |
| Laravel | `composer lint` (Pint)      | `composer test` (PHPUnit)    |
| Rails   | `bundle exec rubocop`       | `bundle exec rake test`      |
| Django  | `uv run ruff check && uv run ruff format --check` | `uv run pytest` |

## Releases

Each driver's version lives in one file (`laravel/src/Version.php`, `rails/lib/coss/rails/version.rb`,
`django/src/coss_django/__init__.py`) next to its `CHANGELOG.md`: bump both in the pull request.
Merging a version that isn't on its registry yet publishes it from CI
(`.github/workflows/release-integrations.yml`, never from a laptop) after running its lint and
tests, and tags `coss-<driver>@<version>`.

The workflow's jobs are skipped until the repository variable `INTEGRATIONS_PUBLISH` is `true`.
Before setting it, once:

1. **PyPI**: add a (pending) trusted publisher for the project `coss-django`: owner `cosscom`,
   repository `coss`, workflow `release-integrations.yml`, environment `pypi`. Create the `pypi`
   environment in the repository settings (deployment branch `main`).
2. **RubyGems**: add a (pending) trusted publisher for the gem `coss-rails` with the same
   repository, workflow and the environment `rubygems`, and create that environment (branch `main`).
3. **Packagist**: create the public repository `cosscom/coss-laravel` (empty, description "Read-only
   mirror of integrations/laravel in cosscom/coss"), add a deploy key with write access to it,
   store the private key as the secret `COSS_LARAVEL_DEPLOY_KEY` of a `packagist` environment
   (branch `main`), and after the first push submit the mirror on packagist.org as `coss/laravel`
   (Packagist's GitHub hook then picks up each `v<version>` tag). Never commit to the mirror.
