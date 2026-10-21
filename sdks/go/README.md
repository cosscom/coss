# coss.com SDK for Go

Every endpoint of the [coss.com](https://coss.com) API, typed, for Go 1.21+: email, Hooks,
Risk, webhooks and more, with retries, idempotency keys and webhook verification.

```sh
go get github.com/cosscom/coss-go
```

```go
import (
	"context"

	coss "github.com/cosscom/coss-go"
	cossclient "github.com/cosscom/coss-go/client"
)

client := cossclient.NewClient() // reads COSS_API_KEY

email, err := client.Email.Send(context.Background(), &coss.SendEmailBody{
	Body: &coss.SendEmailRequest{
		From:    "Acme <hello@acme.com>",
		To:      &coss.SendEmailRequestTo{StringList: []string{"ada@example.com"}},
		Subject: coss.String("Welcome to Acme"),
		HTML:    coss.String("<p>Thanks for signing up!</p>"),
	},
})
```

- Guide: [coss.com/docs/sdks/go](https://coss.com/docs/sdks/go) (options, errors, lists, webhooks)
- Every method: [reference.md](./reference.md), and each endpoint's page in the
  [API reference](https://coss.com/docs/api-reference)

This repository is a read-only mirror of
[sdks/go in cosscom/coss](https://github.com/cosscom/coss/tree/main/sdks/go), where the SDK is
generated from the API's OpenAPI document: open issues and pull requests there. MIT licensed.
