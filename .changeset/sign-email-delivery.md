---
"coss": minor
---

Sign: signers with `delivery: "email"` get their invitation, reminders and signed copy by email. `coss.sign.requests.remind(id)` asks for a reminder now, requests take `reminder_interval_days` and report `expired_at`, settings gain `email_from` and `reminder_interval_days`, and webhooks gain `sign_request.expired`.
