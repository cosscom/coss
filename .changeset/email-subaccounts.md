---
"coss": minor
---

Email for platforms: `coss.email.subaccounts` creates, reads, updates and deletes sub-accounts, one per user of your platform, each with its own quotas, suppression list and reputation (addressed by id or your own `uid`), and reports their sending per day (`stats`). Sends, batch sends and suppression calls take a `subaccount`, `coss.email.list` filters by it, and emails, suppressions and email webhook events carry `subaccount_id`. Domains can belong to a sub-account (`coss.domains.create({ name, subaccount })`, `coss.domains.list({ subaccount })`), and `coss.domains.update(id, { shared_with_subaccounts })` shares one of your own domains with your sub-accounts; domains carry `subaccount_id` and `shared_with_subaccounts`.
