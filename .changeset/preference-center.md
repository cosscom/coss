---
"coss": minor
---

Marketing email: `stream: "marketing"` on sends (one-click unsubscribe headers and a CAN-SPAM footer added by coss.com) and `stream` on emails, double opt-in (`double_opt_in` on `coss.email.contacts.upsert()`, `resendConfirmation()`, confirmation settings in `coss.email.marketingSettings`), `coss.email.contacts.createPreferenceLinks()`, the `contact.unsubscribed` and `contact.confirmed` events (with `topic`), and `unsubscribe` on `email.suppressed` event data.
