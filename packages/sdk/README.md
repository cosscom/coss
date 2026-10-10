# coss

The official TypeScript SDK for COSS: one API key for email, and soon SMS, video, scheduling and more.

> **Not published yet.** The `coss` name on npm currently belongs to a third party, so
> `npm install coss` does **not** install this SDK. Inside this monorepo, depend on it with
> `"coss": "workspace:*"`, or build a tarball with `bun run build && bun pm pack`.

- Zero dependencies, ESM-only, fully typed.
- `coss.email`, `coss.domains` and `coss.webhookEndpoints` behind one API key.
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

## Domains

Live keys can only send from a verified domain. Domains belong to the **organization**, so a
`coss_test_…` key manages the same list a `coss_live_…` key does.

```ts
const { data: domain } = await coss.domains.create({ name: "acme.com" });

// Publish these, then check them. `records` carries the result of the last check.
for (const record of domain?.records ?? []) {
  console.log(record.type, record.name, record.value, record.status); // "CNAME", "…", "…", "missing"
}

const { data: checked } = await coss.domains.verify(domain!.id);
console.log(checked?.status, checked?.can_send); // "verified", true

await coss.domains.list();
await coss.domains.get(domain!.id);
await coss.domains.delete(domain!.id);
```

`verify` asks the provider and DNS right away instead of waiting for the background check, so it is
rate limited: a second call within a few seconds answers `429` (the SDK waits out `Retry-After` and
retries). Verification gives up after 72 hours and the domain becomes `failed`; calling `verify`
again then starts over with fresh DKIM records, which have to be published too. The `dmarc` record
is recommended rather than required (`required: false`).

## Webhook endpoints

Endpoints belong to the API key's own **environment**, so sandbox and production receivers stay
separate. The signing secret is returned only when the endpoint is created.

```ts
const { data: endpoint } = await coss.webhookEndpoints.create({
  url: "https://example.com/webhooks/coss",
  description: "Billing service",
  event_types: ["email.bounced", "email.complained"], // omit for every event type
});
console.log(endpoint?.secret); // "whsec_…" — store it now, it is not returned again

await coss.webhookEndpoints.update(endpoint!.id, { enabled: false }); // pause without deleting
await coss.webhookEndpoints.list();
await coss.webhookEndpoints.get(endpoint!.id);
await coss.webhookEndpoints.delete(endpoint!.id);
```

`update` only changes the fields you pass, and never the signing secret, so receivers keep
verifying deliveries. `event_types: []` means every event type, including ones added later.

## Suppressions

Each environment has a suppression list. Sends skip suppressed recipients: they get the status
`suppressed` and an `email.suppressed` event, and the rest of the email is still sent. Permanent
bounces and spam complaints add an address for every email (`scope: "*"`) automatically.

An entry can also cover a single category. That makes the list a good backend for unsubscribe
links:

```ts
// The recipient unsubscribed from marketing email.
await coss.email.suppressions.add({ address: "jane@example.com", scope: "marketing" });

// Skipped: the email has the suppressed category.
await coss.email.send({ ...params, to: "jane@example.com", category: "marketing" });
// Delivered: receipts are not suppressed.
await coss.email.send({ ...params, to: "jane@example.com", category: "receipts" });

const { data: check } = await coss.email.suppressions.check({
  address: "jane@example.com",
  category: "marketing",
}); // { suppressed: true, suppressions: [{ id: "sup_01k…", scope: "marketing", … }] }

const { data: page } = await coss.email.suppressions.list({ limit: 50 }); // newest first
// Next page: list({ after: page.data.at(-1).id }) while page.has_more.
await coss.email.suppressions.remove("sup_01k…"); // e.g. when they resubscribe
```

Move whole lists in and out in bulk. `import` sends 1,000 entries per request and adds up the
results; invalid entries are skipped and reported by their position, and entries already on the
list are left unchanged, so importing again is safe:

```ts
const { data: result } = await coss.email.suppressions.import({
  suppressions: [{ address: "jane@example.com" }, { address: "joe@example.com", scope: "marketing" }],
}); // { created: 2, existing: 0, invalid: [] }

// CSV with the columns address,scope,reason,created_at,email_id,id (oldest first).
const { data: csv } = await coss.email.suppressions.export({ reason: "bounce" });
```

Imported entries have the reason `import`. The dashboard imports and exports the same CSV.

## Webhooks

Webhook endpoints receive `email.sent`, `email.delivered`, `email.delivery_delayed`,
`email.bounced`, `email.complained` and `email.failed` events, signed with
[Standard Webhooks](https://www.standardwebhooks.com) headers. Verify them with the raw body:

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
| `rate_limit_error`      | 429               | Too many requests with the key (`rate_limited`), the send quota is used up (`quota_exceeded`), or a domain was checked moments ago (`domain_recently_checked`) |
| `api_error`             | 5xx, other        | Server error. Also used for responses that are not a COSS error envelope (`unexpected_response`) |
| `connection_error`      | —                 | Network failure (`network_error`), or you aborted (`aborted`)      |
| `timeout_error`         | —                 | An attempt exceeded `timeout` (`request_timeout`)                 |

## Retries and idempotency

The SDK retries failed requests up to `maxRetries` times (default 2) on:
- connection errors and timeouts;
- `409`, `429` and `5xx` responses.

Other errors are returned immediately.

`webhookEndpoints.create()` never retries automatically, regardless of `maxRetries`: the API does
not deduplicate endpoint creation, even with an `Idempotency-Key`. If the response is lost, creation
may still have succeeded. List endpoints and delete the endpoint with the unknown secret before
creating a replacement.

The wait between attempts grows exponentially (500 ms, 1 s, 2 s, … up to 8 s) with random jitter. When
the response has a `Retry-After` header, the SDK waits exactly that long instead. If `Retry-After` asks
for more than 60 s, the SDK returns the error rather than waiting.

Every `POST` carries an `Idempotency-Key` header. It is either the key you pass or a random UUID, and
the same key is reused on every retry of that call. For email sends, the API stores the result for 24 hours, so a
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
