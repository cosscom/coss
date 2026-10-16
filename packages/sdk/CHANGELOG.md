# coss

## 0.4.0

### Minor Changes

- 5444ed6: `coss.apiKey.revoke()` (`DELETE /v1/api_key`): revokes the client's own API key at once.
- 4439171: Dedicated IPs: `coss.email.dedicatedIps.get()` reads the organization's dedicated IP pool (the Dedicated IPs add-on): its status while SES warms it up, its IPs and their deliveries. `Billing` gains `add_ons` and `features.dedicated_ips`, and the `email.dedicated_ip` meter.
- ad46699: DMARC: `coss.domains.dmarc.get()` (a domain's published DMARC record, the guided next step from `p=none` to `p=reject` with its readiness checks, and a summary of recent aggregate reports), `coss.domains.dmarc.reports.list()` and `.get()`, and the `domain.dmarc_report_received` webhook event (`DomainWebhookEvent`).
- 9734c4f: Domains: `bimi`, the result of the last BIMI check (the domain's `default._bimi` record, its logo and certificate URLs, the DMARC policy that applies and what keeps the logo from showing), with the new `DomainBimi`, `BimiStatus` and `BimiIssueCode` types.
- 7734ef4: Email templates: `coss.email.templates` (create, list, get, update, delete; `getDraft`, `updateDraft`, `publish`; `versions.list`, `versions.get`, `versions.restore`), sending a published template with `template_id`, `variables`, `template_version` and `locale` on `coss.email.send()` and `sendBatch()` (`SendEmailParams` is now `SendEmailContentParams | SendEmailTemplateParams`), and `Email.template`.
- 77505e7: `coss.environment.get()` (`GET /v1/environment`): the environment, project and organization the API key belongs to (with the organization's pinned API version) and the key itself. Any valid key can read it.
- 747e8f9: `coss.email.getBatch()` reads a batch sent with `sendBatch` back, with its emails' current statuses in request order.
- 0005212: One-click unsubscribe (RFC 8058): `unsubscribe` in tracking rules (`coss.email.tracking`) and in a
  send's `tracking` option, `tracking.unsubscribe` on emails, the `email.unsubscribed` event and the
  `unsubscribe` suppression reason. The MCP server's send tool takes `tracking.unsubscribe`.
- ffc8666: React Email: `coss.email.send()` and `sendBatch()` take a `react` component, rendered into `html` (and `text`, unless you pass one) by `@react-email/render`, a new optional peer dependency. The SDK still has no required dependencies.
- 4ea7298: `coss.webhookListeners` (`create`, `poll`, `delete`; `POST /v1/webhook_listeners`, `POST /v1/webhook_listeners/{id}/poll`, `DELETE /v1/webhook_listeners/{id}`): temporary listeners that receive the environment's events by long poll, so a CLI can forward them to a local server (`coss listen`). Polls hand out each event's body exactly as an endpoint would receive it, and take acknowledgements of earlier deliveries.

### Patch Changes

- 0a992f6: Logs: the `smtp` log source, for messages submitted to the SMTP relay (`smtp.coss.com`).

## 0.3.0

### Minor Changes

- 57a79b8: Email: `coss.email.list()` finds emails by recipient (`to`), status, a recipient's delivery status, subject text, category, batch and creation time (newest first, without content), and every email now has `failure` (`{ code, message }` once it has failed, otherwise `null`).
- 01979e0: Risk building blocks and rate limiting: `coss.risk.checkEmail()`, `coss.risk.checkIp()` and
  `coss.risk.classify()` (content scores for spam, phishing, malware and fraud), `content` on
  `coss.risk.assess()` with `signals.content` and `content.*` reasons and rule fields, content
  thresholds in `coss.risk.settings`, and `coss.risk.limit()` with `coss.risk.limitBuckets` for rate
  limiting your own endpoints.
- c6fa2fd: Risk: `checkout` details and `device` tokens on `coss.risk.assess()`, the new `coss/device` browser entry (`collectDevice()`), `coss.risk.calibration()`, `reason_weights` in risk settings, IP `privacy` data (VPN, proxy, relay) on assessments and `checkIp()`, and the new reasons and rule fields that come with them.

## 0.2.0

### Minor Changes

- a9040a1: Add the `hook_endpoint.disabled` webhook event (`HookEndpointWebhookEvent`), sent to your webhook endpoints when a Hooks endpoint of one of your applications is disabled for failing. `verifyWebhook` takes a payload type for verifying Hooks deliveries: `verifyWebhook<MyPayload>(…)`.
- a4dedda: Add `coss.hooks`, webhooks as a service: applications, event types, endpoints, messages (`coss.hooks.messages.send()`), deliveries and attempts, endpoint recovery, and portal sessions (`coss.hooks.portal.createSession()`).
- 0f8d9ca: Add `coss.risk.rules` (create, list, get, update, delete) and `coss.risk.settings` (get, update: thresholds, disabled reasons, captcha provider), the `captcha` assessment parameter, the `domain_age_days`, `captcha` and `login` signals, new reason codes (`email.domain_new`, `login.new_country`, `login.new_network`, `captcha.failed`, `captcha.missing`, `rule.matched`) and the `risk.assessment.reviewed` webhook event.
- a51deae: Webhook endpoints that fail every delivery for five days are now disabled automatically: `WebhookEndpoint` gains `disabled_reason`, `disabled_at` and `failing_since`. Add `coss.webhookEndpoints.recover()` to requeue an endpoint's failed deliveries since a time.

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
