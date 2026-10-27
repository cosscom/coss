---
"coss": minor
---

Sign: `coss.sign.sessions.create()` makes a signing link for a signer who signs in your app, `coss.sign.settings` reads and changes the signing page's settings (embedding origins, branding, consent text), the new `coss/sign` entry's `mountSigning()` embeds the signing page in an iframe, and webhooks gain the `sign_request.*` events (`SignRequestWebhookEvent`).
