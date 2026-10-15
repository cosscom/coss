---
"coss": minor
---

Email templates: `coss.email.templates` (create, list, get, update, delete; `getDraft`, `updateDraft`, `publish`; `versions.list`, `versions.get`, `versions.restore`), sending a published template with `template_id`, `variables`, `template_version` and `locale` on `coss.email.send()` and `sendBatch()` (`SendEmailParams` is now `SendEmailContentParams | SendEmailTemplateParams`), and `Email.template`.
