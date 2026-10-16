# coss-django

A Django email backend that sends your app's email through the [coss.com](https://coss.com) API.
Switch by changing settings, not call sites: `send_mail`, `EmailMessage`, `mail_admins`, password
reset emails and every other Django email keep working.

Docs: [coss.com/docs/integrations/django](https://coss.com/docs/integrations/django)

Django 5.2–6.1, Python 3.10+. No dependencies besides Django.

## Install

```sh
pip install coss-django   # or: uv add coss-django
```

## Settings

```python
# settings.py
EMAIL_BACKEND = "coss_django.EmailBackend"
COSS_API_KEY = env("COSS_API_KEY")  # coss_live_… or coss_test_…
DEFAULT_FROM_EMAIL = "Acme <hello@acme.com>"  # a verified domain of yours
```

On Django 6.1, which configures email with `MAILERS`, put the same options in `OPTIONS`:

```python
MAILERS = {
    "default": {
        "BACKEND": "coss_django.EmailBackend",
        "OPTIONS": {"api_key": env("COSS_API_KEY")},
    },
}
```

| Setting | Backend option | Default |
| --- | --- | --- |
| `COSS_API_KEY` | `api_key` | the `COSS_API_KEY` environment variable |
| `COSS_BASE_URL` | `base_url` | the `COSS_BASE_URL` environment variable, else `https://api.coss.com` |
| `COSS_TIMEOUT` | `timeout` | `30` (seconds, per attempt) |
| `COSS_MAX_RETRIES` | `max_retries` | `2` |

Options passed to the backend (`get_connection("coss_django.EmailBackend", api_key=…)` or
`MAILERS` `OPTIONS`) win over the settings. A missing API key fails the first send with
`ImproperlyConfigured`, never your app's startup.

## Usage

Nothing changes:

```python
from django.core.mail import EmailMultiAlternatives, send_mail

send_mail("Welcome", "Thanks for signing up!", None, ["ada@example.com"])

message = EmailMultiAlternatives(
    subject="Your receipt",
    body="Thanks for your order!",
    to=["Ada Lovelace <ada@example.com>"],
    reply_to=["support@acme.com"],
    headers={"List-Unsubscribe": "<https://acme.com/unsubscribe>"},
)
message.attach_alternative("<p>Thanks for your order!</p>", "text/html")
message.attach_file("receipt.pdf")
message.send()

message.coss_email["id"]  # "email_…": the email in coss.com (API, dashboard)
```

Each message is one request (`POST /v1/emails`). After a successful send, `message.coss_email`
holds the email as the API returned it. `send_messages()` returns the number of messages
coss.com accepted; messages without recipients are skipped, as Django's SMTP backend does.

Inline images are attachments with a `Content-ID` (`<img src="cid:logo@acme">` in the HTML):

```python
from email.message import MIMEPart  # Django 6.0+; on 5.2 use email.mime.image.MIMEImage

logo = MIMEPart()
logo.set_content(
    png_bytes,
    maintype="image",
    subtype="png",
    disposition="inline",
    filename="logo.png",
    cid="<logo@acme>",
)
message.attach(logo)
```

## coss.com options

Set `coss` on a message:

```python
from datetime import datetime, timedelta, timezone

message.coss = {
    "category": "receipts",  # suppressions per category
    "tags": {"plan": "pro", "order": "42"},  # or [{"name": "plan", "value": "pro"}]
    "scheduled_at": datetime.now(timezone.utc) + timedelta(hours=1),  # or an ISO 8601 string
    "tracking": {"opens": True, "clicks": False},  # and "unsubscribe" (one-click)
    "idempotency_key": "order-42",  # a retry with the same key never sends twice
}
message.send()
```

Unknown keys and invalid values raise `ValueError`. A `datetime` is sent in UTC
(`YYYY-MM-DDTHH:MM:SSZ`, fractions dropped); a naive one is taken to be in Django's current time
zone (`TIME_ZONE`, unless you activated another one). A string is sent as given. Without an
`idempotency_key`, each send gets a random one, reused by its retries.

## Errors

When coss.com refuses an email or can't be reached, the send raises `coss_django.CossError`:

```python
from coss_django import CossError

try:
    message.send()
except CossError as error:
    error.code  # e.g. "domain_not_verified"
    error.type  # "invalid_request_error", …, "connection_error", "timeout_error"
    error.status  # HTTP status, None without a response
    error.request_id  # "req_…", quote it to support
    error.message  # the API's message
    error.param  # the field it is about, when there is one
    error.issues  # [{"path": "to", "message": "…"}] for validation errors
```

`str(error)` reads `coss.com could not send the email: <message> (<code>)`. Network errors,
timeouts, 409, 429 and 5xx responses are retried with backoff (honouring `Retry-After` up to 60
seconds) before that. With `fail_silently=True`, these failures and a missing API key are
swallowed and the message isn't counted.

What coss.com can't send raises `ValueError` before anything is sent, `fail_silently` or not
(like a bad header with Django's SMTP backend):

- alternatives other than one `text/html` part, or a `content_subtype` other than `plain`/`html`;
- a `Bcc` header, a `Sender` or `Return-Path` other than `from_email`, and `From`, `To` or `Cc`
  headers that name other addresses than the message's `from_email`, `to` or `cc` (Django sends
  those to the SMTP server separately; coss.com sends one message to the addresses it shows —
  matching headers are fine, and their display names are used);
- a subject with a line break, a header given twice, and multipart attachments.

A `Reply-To` header replaces `reply_to`, as Django documents. Headers coss.com sets itself
(`Message-ID`, `Date`, `Content-Type`, …) are dropped; non-ASCII header values are sent as RFC 2047
encoded-words.

## Tests

Django's test runner swaps in the locmem backend, so your tests never call coss.com.

## License

MIT
