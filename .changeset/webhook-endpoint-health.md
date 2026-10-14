---
"coss": minor
---

Webhook endpoints that fail every delivery for five days are now disabled automatically: `WebhookEndpoint` gains `disabled_reason`, `disabled_at` and `failing_since`. Add `coss.webhookEndpoints.recover()` to requeue an endpoint's failed deliveries since a time.
