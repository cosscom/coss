---
"coss": minor
---

Budgets: the `billing.budget_threshold_reached`, `billing.budget_hold_placed` and `billing.budget_hold_lifted` webhook events (a member's, project's or API key's monthly budget), and the `BudgetScope` type. Sends over a budget fail with `billing_error` `budget_exceeded`; a broadcast waits with `pause_reason: "budget_exceeded"`.
