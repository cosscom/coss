---
"coss": minor
---

Integrations: `coss/nodemailer` (a Nodemailer transport, `cossTransport()` and `withCoss()`), `coss/better-auth` (`cossEmail()`: Better Auth's verification, password reset, change-email, delete-account, magic link, one-time code and invitation emails) and `coss/authjs` (an Auth.js email provider). They send through `coss.email.send`, throw a `CossSendError` on failure, and add no dependencies: Nodemailer, Better Auth and `@auth/core` are optional peer dependencies.
