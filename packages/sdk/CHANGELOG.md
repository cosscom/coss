# coss

## 0.1.0

### Minor Changes

- 5957659: Send the `Coss-Version` header with every request (`API_VERSION`, overridable with the `apiVersion` client option), and add `api_version` to webhook endpoints and webhook events.
- 503172a: Add `coss.auditEvents.list()` and `coss.auditEvents.get()` to read the organization's audit log.
- f44f537: Add `coss.email.sendBatch()` to queue up to 100 emails in one atomic, idempotent request.
- f0a68ac: Add `coss.billing` to read the organization's billing: `get()` (plan, this month's usage and estimate, standing, limits), `usage()`, `invoices.list()`/`invoices.get()` and `credits.list()`. Add the `billing.*` webhook event types (`BillingWebhookEvent`, part of `WebhookEvent`).
- cd9bbf8: Add the `billing_error` error type (HTTP 402): the organization's plan or billing refused the request — `billing_hold` (live sending paused for an overdue invoice or the spend limit), `usage_limit_exceeded` (past the plan's monthly allowance), `plan_limit_reached` or `plan_feature_unavailable`. It is never retried.
- 65c1177: Add `coss.domains.tracking.create()` and `coss.domains.tracking.delete()` to set up a custom tracking domain (e.g. `links.acme.com`) for a sending domain, and the `tracking` field on `Domain`.
- 7ab096a: Add `coss.logs.list()` and `coss.logs.get()` to read an environment's logs: API requests, email events and webhook delivery attempts.
- 50fde5b: Add `coss.logDrains` (create, list, get, update, delete, and `batches.list`/`batches.get`) to stream an environment's log and audit events to an HTTPS endpoint, and `verifyLogDrainBatch()` to verify and parse the signed NDJSON batches.
- 0c00824: Receive email: `coss.email.received` lists, retrieves and deletes the emails an environment received, downloads their raw message (`getRaw`) and attachments (`getAttachment`) as bytes, and returns the environment's inbound address (`address()`). `coss.domains.receiving` starts and stops receiving at a domain's hostname, and `Domain.receiving` describes it. `WebhookEvent` includes the new `email.received` event (`ReceivedEmailWebhookEvent`).
- f35bf25: Add `coss.email.reschedule()` to move a scheduled email to a new time, and the `email.rescheduled` event type (`data.reschedule`).
- 1be79bb: Add `coss.risk`: `assess()` sign-ups, logins and other events for an `allow`/`review`/`block` decision with reasons, report outcomes with `feedback()`, read past assessments (`coss.risk.assessments`), manage allow and block lists (`coss.risk.lists`) and forget deleted users (`coss.risk.users.forget()`). Webhooks gain the `risk.assessment.review` event and logs the `risk` source.
- 6c62053: Add `coss.webhookEndpoints.rollSecret()` to replace an endpoint's signing secret while the previous one keeps signing for a grace period, and `previous_secret_expires_at` to webhook endpoints.
- 5b6db5c: Add `coss.email.tracking` to read and change the environment's open and click tracking settings: `get()`, `updateDefault()`, `removeDefault()`, `updateCategory()` and `removeCategory()`.
