---
"coss": patch
---

Billing: the `Meter` type gains `risk.phone_checks` (live phone checks, $0.01 each; every plan includes 100 a month). `coss.risk.checkPhone()` is no longer retried automatically: each answered live check is billed.
