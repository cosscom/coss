---
"coss": minor
---

Log drains: `format` (`ndjson`, `loki`, `datadog`, `otlp`) sends batches straight to Loki (Grafana
Cloud), Datadog or an OTLP/HTTP collector, and `auth_header` carries the intake's key (encrypted,
never returned; drains show `auth_header_name`).
