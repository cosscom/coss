# coss.com SDK for Python

Every endpoint of the [coss.com](https://coss.com) API, typed, for Python 3.10+: email,
Hooks, Risk, webhooks and more, with retries, idempotency keys and webhook verification.

```sh
pip install cosscom
```

```python
from coss import Coss

client = Coss()  # reads COSS_API_KEY

email = client.email.send(
    from_="Acme <hello@acme.com>",
    to=["ada@example.com"],
    subject="Welcome to Acme",
    html="<p>Thanks for signing up!</p>",
)
```

- Guide: [coss.com/docs/sdks/python](https://coss.com/docs/sdks/python) (options, errors, lists, webhooks)
- Every method: [reference.md](./reference.md), and each endpoint's page in the
  [API reference](https://coss.com/docs/api-reference)

The SDK is generated from the API's OpenAPI document in
[cosscom/coss](https://github.com/cosscom/coss/tree/main/sdks/python). MIT licensed.
