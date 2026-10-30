---
"coss": minor
---

OpenTelemetry: with `@opentelemetry/api` installed (an optional peer dependency), every call gets a
client span and sends its context as `traceparent`. The API stores it on the emails and text
messages a call sends and echoes it in their log lines and webhooks (`data.traceparent`, typed on
`EmailWebhookEventData` and `SmsWebhookEventData`). `tracing: false` turns it off.
