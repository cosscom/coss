---
"coss-cli": minor
---

The coss.com CLI (`npm i -g coss-cli`, command `coss`): `coss login` (in the browser, or `--manual` with an API key), `logout`, `whoami`, `coss emails send` (test emails, `--simulate bounced|complained|delivered|suppressed`, `--wait`), `coss logs tail`, and `coss listen --forward-to localhost:3000/webhooks` to receive the environment's webhook events on your machine, signed with a stable `whsec_` secret.
