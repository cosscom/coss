---
"coss": minor
---

Add the `hook_endpoint.disabled` webhook event (`HookEndpointWebhookEvent`), sent to your webhook endpoints when a Hooks endpoint of one of your applications is disabled for failing. `verifyWebhook` takes a payload type for verifying Hooks deliveries: `verifyWebhook<MyPayload>(…)`.
