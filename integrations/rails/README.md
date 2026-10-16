# coss-rails

An Action Mailer delivery method that sends your Rails app's emails through the
[coss.com](https://coss.com) API. Switch by changing configuration, not call sites.

Rails 7.2–8.1, Ruby 3.2+. Docs: [coss.com/docs/integrations/rails](https://coss.com/docs/integrations/rails).

## Install

```ruby
# Gemfile
gem "coss-rails"
```

## Configure

```ruby
# config/environments/production.rb
config.action_mailer.delivery_method = :coss
config.action_mailer.coss_settings = {
  api_key: Rails.application.credentials.coss_api_key, # default: ENV["COSS_API_KEY"]
}
```

| Setting           | Default                 |                                                                  |
| ----------------- | ----------------------- | ---------------------------------------------------------------- |
| `api_key`         | `ENV["COSS_API_KEY"]`   | A missing key fails the delivery (`Coss::Rails::ConfigurationError`), never the boot. |
| `base_url`        | `ENV["COSS_BASE_URL"]`, else `https://api.coss.com` |                                   |
| `timeout`         | `30`                    | Seconds per attempt (Net::HTTP's open, read and write timeouts). |
| `max_retries`     | `2`                     | Network errors, timeouts, 409, 429 and 5xx are retried with backoff (and `Retry-After`), with the same `Idempotency-Key`. |
| `return_response` | `false`                 | Makes `deliver_now!` return the email coss.com accepted (see below). |

The Railtie registers `:coss` before Action Mailer applies `config.action_mailer.*`. Without
Rails, call `Coss::Rails.install(ActionMailer::Base)`, or use the delivery method with Mail
directly: `mail.delivery_method Coss::Rails::DeliveryMethod, api_key: "coss_live_…"`.

## Send

Mailers stay as they are: from, to, cc, bcc, reply-to, subject, the text and HTML bodies,
attachments (`attachments[...]` and `attachments.inline[...]`, referenced as
`attachments["logo.png"].url`) and custom headers (`headers["X-Campaign"] = "spring"`) all go
through. `deliver_later` works as usual.

### coss.com options

The Railtie adds `coss(...)` to every mailer (it includes `Coss::Rails::Mailer` into
`ActionMailer::Base`). Call it in an action:

```ruby
class ReceiptMailer < ApplicationMailer
  def receipt(order)
    coss category: "receipts",
         tags: { plan: order.plan },                  # or [{ name: "plan", value: "pro" }]
         scheduled_at: 1.hour.from_now,               # Time/DateTime/TimeWithZone (sent as UTC) or a String
         tracking: { opens: true, clicks: false },
         idempotency_key: "receipt-#{order.id}"       # default: a random key per message
    mail to: order.email, subject: "Your receipt"
  end
end
```

The options are stored on the message (`message.coss_options`), so they survive `deliver_later`
(the job runs the action again). A later `coss` call replaces the options it gives; unknown
options raise `ArgumentError`.

### What a delivery returns

```ruby
message = ReceiptMailer.receipt(order).deliver_now
message.coss_email # => { "object" => "email", "id" => "email_01k…", "status" => "queued", … }
```

With `return_response: true`, `deliver_now!` (and `Mail::Message#deliver!`) return that Hash
instead of the message. (`deliver_now` always returns the message: that is Action Mailer's.)

## Errors

Everything this gem raises is a `Coss::Rails::Error`; `raise_delivery_errors` decides, as for any
delivery method, whether `deliver_now` raises it.

- `Coss::Rails::DeliveryError`: coss.com refused the email or couldn't be reached. Readers: `type`
  (`invalid_request_error`, `authentication_error`, `permission_error`, `not_found_error`,
  `idempotency_error`, `rate_limit_error`, `billing_error`, `api_error`, or `connection_error` /
  `timeout_error` without a response), `code` (e.g. `domain_not_verified`), `status` (`nil` without
  a response), `request_id` (`req_…`, quote it to support), `param`, `issues` and
  `error_message`. Its message reads
  `coss.com could not send the email: <message> (<code>)`.
- `Coss::Rails::UnsupportedMessageError`: the message uses something coss.com can't send, so it
  isn't sent at all: a `Sender` header, Return-Path or SMTP envelope (`smtp_envelope_from`,
  `smtp_envelope_to`) other than the From address and recipients, no To address, a header given
  more than once, or a part that is
  neither the text body, the one HTML body nor an attachment (e.g. a `text/calendar`
  alternative; attach invites instead).
- `Coss::Rails::ConfigurationError`: no API key.

Headers coss.com sets itself (`Date`, `Message-ID`, `MIME-Version`, `Content-Type`, …) are
dropped. Non-ASCII header values are sent as RFC 2047 encoded-words.

## License

MIT
