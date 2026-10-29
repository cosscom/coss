---
"coss": minor
---

Inboxes: `coss.inboxes` gives an AI agent its own email address (`create`, `list`, `get`, `update`, `delete`), with received mail kept as threads (`coss.inboxes.threads`) and messages sent and replied from the address (`coss.inboxes.messages.send`, `.reply`). New webhook event `inbox.message.received`.
