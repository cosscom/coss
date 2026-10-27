---
"coss": minor
---

Sign: completed requests get a sealed, signed PDF (the documents as signed and a certificate of completion). `SignRequest.signed_document` says when it is ready, `coss.sign.requests.signedDocument(id)` downloads it, and the `sign_request.completed` webhook now arrives once it is ready. The audit trail gains the `sealed` event.
