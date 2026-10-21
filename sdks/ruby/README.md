# coss.com SDK for Ruby

Every endpoint of the [coss.com](https://coss.com) API for Ruby 3.3+: email, Hooks, Risk,
webhooks and more, with retries, idempotency keys and webhook verification. For Action Mailer,
use [coss-rails](https://coss.com/docs/integrations/rails).

```sh
bundle add coss
```

```ruby
require "coss"

client = Coss::Client.new # reads COSS_API_KEY

email = client.email.send_(
  from: "Acme <hello@acme.com>",
  to: ["ada@example.com"],
  subject: "Welcome to Acme",
  html: "<p>Thanks for signing up!</p>"
)
```

- Guide: [coss.com/docs/sdks/ruby](https://coss.com/docs/sdks/ruby) (options, errors, lists, webhooks)
- Every method: [reference.md](./reference.md), and each endpoint's page in the
  [API reference](https://coss.com/docs/api-reference)

The SDK is generated from the API's OpenAPI document in
[cosscom/coss](https://github.com/cosscom/coss/tree/main/sdks/ruby). MIT licensed.
