---
"coss": minor
---

Add the `billing_error` error type (HTTP 402): the organization's plan or billing refused the request — `billing_hold` (live sending paused for an overdue invoice or the spend limit), `usage_limit_exceeded` (past the plan's monthly allowance), `plan_limit_reached` or `plan_feature_unavailable`. It is never retried.
