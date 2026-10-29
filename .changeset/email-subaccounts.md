---
"coss": minor
---

Email for platforms: `coss.email.subaccounts` creates, reads, updates and deletes sub-accounts, one per user of your platform, each with its own quotas, suppression list and reputation (addressed by id or your own `uid`), and reports their sending per day (`stats`). Sends, batch sends and suppression calls take a `subaccount`, `coss.email.list` filters by it, and emails, suppressions and email webhook events carry `subaccount_id`.
