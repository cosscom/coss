# packages/sign — Sign (e-signatures)

Read together with the root `AGENTS.md` (conventions, tenancy rule, tests). Paths are from the
repository root.

Embeddable, compliant e-signatures (ESIGN/UETA, eIDAS simple electronic signatures): customers
upload PDFs, ask signers to sign them in their own app (embedded) or by email, and get a sealed
copy with an audit trail. Built so far: documents, signature requests with signers and fields, and
the audit trail. Signing sessions, the signing app, completion and sealing, email delivery,
templates and the builder come next (see "Not built yet" in the root `AGENTS.md`).

- **Tables** (`packages/db/src/schema/sign.ts`): `sign_document` (`sdoc_`, an uploaded PDF: page
  sizes and text anchors, bytes in the document store), `sign_request` (`sreq_`), its ordered
  `sign_request_document` rows (a document can't be deleted while a request uses it: FK
  `restrict`, checked first for a clean `document_in_use`), `sign_signer` (`ssgn_`), `sign_field`
  (`sfld_`), `sign_event` (`sevt_`, the audit trail) and `sign_fake_object` (document bytes without
  a bucket). Everything cascades from the environment.
- **Documents** (`documents.ts`, `pdf.ts`): base64 in the request (at most 25 MB decoded, 500
  pages), refused unless pdf-lib loads it unencrypted (it fills and seals it later) and pdf.js
  reads every page (none with a `/UserUnit`: pdf.js would scale it and pdf-lib wouldn't). Coordinates are PDF points from the top left of the page **as displayed** (crop box,
  `/Rotate` applied: pdf.js's viewport), for page sizes, anchors and fields alike. Anchors are
  `{{<type>:<key>}}` texts (`SIGN_ANCHOR_PATTERN`); one inside a longer text run is placed by its
  share of the run's characters (exact when it is a run of its own). Bytes go to the store before
  the row; a failed insert deletes them.
- **Requests** (`requests.ts`, `fields.ts`): one transaction stores the request, inline documents,
  signers, fields and the `created` (and `sent`) events. Fields must fit on their page; an anchored
  field is placed over every occurrence (none → `invalid_fields`); every signer needs a
  `signature` field; signer emails are unique per request (case-insensitive). `delivery: email` →
  `authentication: email_link`, `embedded` → `customer_asserted`. `Idempotency-Key` through
  `withIdempotencyKey`; a replay (or any failure before commit) deletes the bytes of the inline
  documents it stored. Send (draft → sent) and cancel (draft/sent → canceled) return the request
  as is when it is already there.
- **Audit trail** (`events.ts`): `appendSignEvent(tx, …)` locks the request row, numbers events
  gaplessly and hashes each (`signEventHash`: SHA-256 of the canonical JSON of the event and the
  previous hash). Never update or delete `sign_event` rows; `verifySignEventChain` must stay
  `null` for every request. Events record the actor (`api_key`, `signer`, `dashboard`, `system`),
  IP and user agent, and the documents' SHA-256 where it matters.
- **Store** (`store.ts`): `DocumentStore` (`put/get/delete/deleteOrganization`), keys
  `orgs/<org>/<env>/documents/<id>.pdf`. Only `FakeDocumentStore` exists: the API turns Sign off
  in production (`signService: null` → 503 `sign_unavailable`) until the S3 store lands.
  Organization deletion removes `sign_fake_object` rows in batches.
- **Retention**: `RETENTION_POLICY` `signature_requests` — kept until the customer deletes them.
