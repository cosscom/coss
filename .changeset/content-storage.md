---
"coss": minor
---

Content storage: `coss.email.storage` (`get`, `update`) switches an environment to `content_storage: "discard"`, which keeps each email's subject, body, headers, template variables and attachment filenames only until it is sent, fails or is canceled. Emails have `content_storage` (`mode` and `discarded_at`); `EmailContentStorage`, `ContentStorageMode`, `StorageSettings` and `UpdateStorageSettingsParams` are exported.
