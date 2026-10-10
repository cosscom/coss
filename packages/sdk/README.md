# coss

The official TypeScript SDK for COSS: one API key for email, and soon SMS, video, scheduling and more.

> **Not published yet.** The `coss` name on npm currently belongs to a third party, so
> `npm install coss` does **not** install this SDK. Inside this monorepo, depend on it with
> `"coss": "workspace:*"`, or build a tarball with `bun run build && bun pm pack`.

- Zero dependencies, ESM-only, fully typed.
- Every method returns `{ data, error }`. API and network failures are returned, never thrown.
- Retries transient failures automatically, and sends are idempotent.

## Quick start

```ts
import { Coss } from "coss";

const coss = new Coss({ apiKey: process.env.COSS_API_KEY });

const { data, error } = await coss.email.send({
  from: "Acme <onboarding@example.com>",
  to: "delivered@example.com",
  subject: "Hello from COSS",
  html: "<p>It works!</p>",
});

if (error) {
  console.error(error.type, error.code, error.message, error.request_id);
} else {
  console.log(data.id, data.status); // "email_01k…", "sent"
}

const { data: email } = await coss.email.get("email_01k…");
console.log(email?.recipients); // [{ address: "user@example.com", type: "to", status: "delivered", … }]

const { data: events } = await coss.email.listEvents("email_01k…"); // email.sent, email.delivered, …
```

Keys come in two kinds. `coss_live_…` keys belong to a project's **production** environment and
deliver email from your organization's verified domains. `coss_test_…` keys belong to
**development**: nothing is delivered, every email is recorded with `sandbox: true`, and delivery
events are simulated (send to `bounce@simulator.amazonses.com` or `complaint@…` to test failures).

Request and response fields use the API's snake_case names, such as `reply_to` and `created_at`.

A runnable example lives in [`examples/send-email.ts`](./examples/send-email.ts):

```sh
COSS_API_KEY=coss_test_… COSS_BASE_URL=http://localhost:3001 bun packages/sdk/examples/send-email.ts
```

## Options

```ts
new Coss({
  apiKey: "coss_test_…",           // default: process.env.COSS_API_KEY
  baseUrl: "https://api.coss.com", // default: process.env.COSS_BASE_URL, then https://api.coss.com
  timeout: 30_000,                 // per attempt, in ms
  maxRetries: 2,                   // 0 disables retries
  fetch: customFetch,              // default: the global fetch
  dangerouslyAllowBrowser: false,
});
```

The constructor throws in only two cases, both programmer errors:
- No API key is found.
- It runs where a `document` global exists (a browser, or a jsdom or happy-dom test environment)
  without `dangerouslyAllowBrowser: true`.

API keys are secrets, so call COSS from your server.

Each method also takes per-request options:

```ts
await coss.email.send(params, { idempotencyKey: "welcome-user_123", signal: controller.signal });
await coss.email.get(id, { signal });
```

## Webhooks

Webhook endpoints (set up in the dashboard) receive `email.sent`, `email.delivered`,
`email.delivery_delayed`, `email.bounced`, `email.complained` and `email.failed` events, signed
with [Standard Webhooks](https://www.standardwebhooks.com) headers. Verify them with the raw body:

```ts
import { verifyWebhook, WebhookVerificationError } from "coss";

export async function POST(request: Request) {
  try {
    const event = await verifyWebhook(await request.text(), request.headers, process.env.COSS_WEBHOOK_SECRET!);
    if (event.type === "email.bounced") console.log(event.data.recipient, event.data.bounce);
    return new Response("ok");
  } catch (error) {
    if (error instanceof WebhookVerificationError) return new Response("invalid", { status: 400 });
    throw error;
  }
}
```

Unlike other methods, `verifyWebhook` throws. Deliveries are retried for about a day and may arrive
out of order (use `data.occurred_at`) or more than once (deduplicate by `event.id`).

## Errors

`error` is a plain object:

```ts
interface CossError {
  type: CossErrorType;
  code: string;               // e.g. "invalid_api_key", "validation_error"
  message: string;
  status: number | null;      // null when no response was received
  request_id: string | null;  // include it when contacting support
  param?: string;
  issues?: { path: string; message: string }[]; // per-field validation problems
}
```

| `type`                  | Status            | Meaning                                                           |
| ----------------------- | ----------------- | ----------------------------------------------------------------- |
| `invalid_request_error` | 400 / 413 / 422   | Malformed JSON, payload too large, or failed validation (`issues`) |
| `authentication_error`  | 401               | `missing_api_key` or `invalid_api_key`                            |
| `permission_error`      | 403               | The key lacks the permission (`insufficient_permissions`)         |
| `not_found_error`       | 404               | No such resource in the key's environment                         |
| `idempotency_error`     | 409 / 422         | `request_in_progress`, or `idempotency_key_reused` with a different body |
| `rate_limit_error`      | 429               | Too many requests                                                 |
| `api_error`             | 5xx, other        | Server error. Also used for responses that are not a COSS error envelope (`unexpected_response`) |
| `connection_error`      | —                 | Network failure (`network_error`), or you aborted (`aborted`)      |
| `timeout_error`         | —                 | An attempt exceeded `timeout` (`request_timeout`)                 |

## Retries and idempotency

The SDK retries failed requests up to `maxRetries` times (default 2) on:
- connection errors and timeouts;
- `409`, `429` and `5xx` responses.

Other errors are returned immediately.

The wait between attempts grows exponentially (500 ms, 1 s, 2 s, … up to 8 s) with random jitter. When
the response has a `Retry-After` header, the SDK waits exactly that long instead. If `Retry-After` asks
for more than 60 s, the SDK returns the error rather than waiting.

Every `POST` carries an `Idempotency-Key` header. It is either the key you pass or a random UUID, and
the same key is reused on every retry of that call. The API stores the result for 24 hours, so a
retried send is never delivered twice:
- A repeat with the same key and the same body returns the original email.
- A repeat with the same key and a different body fails with `idempotency_key_reused`.

To make a send safe across process restarts too, pass your own key, derived from your data
(for example `welcome-${userId}`).

## Timeouts and cancellation

`timeout` applies to each attempt and covers reading the response body. Pass an `AbortSignal` to
cancel a call. Aborting stops the request in flight and any pending retry, and returns
`{ type: "connection_error", code: "aborted" }`.

## Runtime support

The SDK works on Node.js ≥ 22, Bun, Deno and Cloudflare Workers. It only needs the standard `fetch`,
`AbortSignal.timeout`/`AbortSignal.any` and `crypto.randomUUID`. It never uses Node built-ins.

The package is **ESM-only**:
- `import { Coss } from "coss"` works everywhere.
- On Node 22.12+ (and 20.19+), CommonJS can also `require("coss")` because Node supports `require(esm)` there.

Environment fallbacks read `process.env` where it exists. On Workers or Deno without env access,
pass `apiKey` (and `baseUrl`) explicitly.

## Development

```sh
bun run --cwd packages/sdk typecheck  # src (isolatedDeclarations) + tests
bun run --cwd packages/sdk test       # bun:test with a mocked fetch; no network
bun run --cwd packages/sdk build      # tsdown → dist/, then publint and attw
```

`src/version.ts` must match `version` in `package.json`, and a test enforces it.

`tsdown` rewrites the `exports`, `main`, `module` and `types` fields in `package.json` on every
build. The committed values are exactly what it generates.
