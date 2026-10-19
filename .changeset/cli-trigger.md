---
"coss": minor
"coss-cli": minor
---

Test webhook events: `coss.webhookEvents.test({ type, data })` (`POST /v1/webhook_events/test`) sends a sample event of a type to the environment's subscribed endpoints and open listeners, exactly like a real one (sandbox keys; every type but the live-only `domain.*`, `account.*` and `billing.*`). The SDK also exports `WEBHOOK_EVENT_TYPES`, `TEST_WEBHOOK_EVENT_TYPES` and `isLiveOnlyEventType`. The CLI gets `coss trigger <event-type>` (with `--data` and `-F`, so `coss listen` + `coss trigger` exercises a local handler), and `coss webhooks list`, `coss webhooks deliveries <endpoint>` and `coss webhooks retry <endpoint> <delivery>`.
