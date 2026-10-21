# coss.com SDK for .NET

Every endpoint of the [coss.com](https://coss.com) API, typed, for .NET 8+, .NET Framework 4.6.2+
and .NET Standard 2.0: email, Hooks, Risk, webhooks and more, with retries, idempotency keys and
webhook verification.

```sh
dotnet add package Coss
```

```csharp
using Coss;

var client = new CossClient(); // reads COSS_API_KEY

var email = await client.Email.SendAsync(new SendEmailBody
{
    Body = new SendEmailRequest
    {
        From = "Acme <hello@acme.com>",
        To = new[] { "ada@example.com" },
        Subject = "Welcome to Acme",
        Html = "<p>Thanks for signing up!</p>",
    },
});
```

- Guide: [coss.com/docs/sdks/dotnet](https://coss.com/docs/sdks/dotnet) (options, errors, lists, webhooks)
- Every method: [reference.md](./reference.md), and each endpoint's page in the
  [API reference](https://coss.com/docs/api-reference)

The SDK is generated from the API's OpenAPI document in
[cosscom/coss](https://github.com/cosscom/coss/tree/main/sdks/dotnet). MIT licensed.
