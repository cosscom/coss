---
"coss-cli": patch
---

`coss listen` forwards an event's `data.traceparent` as a `traceparent` header, as coss.com's own
webhook delivery does.
