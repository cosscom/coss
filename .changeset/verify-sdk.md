---
"coss": minor
---

Verify: one-time codes by SMS or email. `coss.verify.start({ to })` sends a code (behind a fraud guard that stops SMS pumping before anything is sent), `coss.verify.check({ to, code })` checks the one the end user typed; also `get`, `list` and `cancel`.
