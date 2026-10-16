---
"coss": minor
---

Broadcasts: `coss.email.broadcasts` (`create`, `list`, `get`, `update`, `remove`, `send`, `cancel`, `pause`, `resume`, `test`, `listEmails`) send one marketing email to an audience or a segment, with `{{{contact.<key>|fallback}}}` templates, scheduling, throttling at the plan's marketing rate and per-broadcast `stats`. Adds the `broadcast.sending`, `broadcast.sent`, `broadcast.paused`, `broadcast.canceled` and `broadcast.failed` webhook events and `broadcast_id` on emails.
