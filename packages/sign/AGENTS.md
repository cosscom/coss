# packages/sign — Sign (e-signatures)

Read together with the root `AGENTS.md` (conventions, tenancy rule, tests). Paths are from the
repository root.

Embeddable, compliant e-signatures (ESIGN/UETA, eIDAS simple electronic signatures): customers
upload PDFs, ask signers to sign them in their own app (embedded) or by email, and get a sealed
copy with an audit trail. Built so far: documents, signature requests with signers and fields, the
audit trail, signing sessions and the signer's actions (the signing app is `apps/sign`), settings,
webhooks and log lines, and completion's sealed PDF. Email delivery, templates and the builder come
next (see "Not built yet" in the root `AGENTS.md`).

- **Tables** (`packages/db/src/schema/sign.ts`): `sign_document` (`sdoc_`, an uploaded PDF: page
  sizes and text anchors, bytes in the document store), `sign_request` (`sreq_`), its ordered
  `sign_request_document` rows (a document can't be deleted while a request uses it: FK
  `restrict`, checked first for a clean `document_in_use`), `sign_signer` (`ssgn_`), `sign_field`
  (`sfld_`), `sign_event` (`sevt_`, the audit trail), `sign_session` (`sgs_`), `sign_settings`
  (`sset_`, one per environment) and `sign_fake_object` (document bytes without a bucket).
  Everything cascades from the environment.
- **Documents** (`documents.ts`, `pdf.ts`): base64 in the request (at most 25 MB decoded, 500
  pages), refused unless pdf-lib loads it unencrypted and can flatten its form (it fills, flattens
  and seals it later) and pdf.js reads every page (none with a `/UserUnit`: pdf.js would scale it
  and pdf-lib wouldn't). Coordinates are PDF points from the top left of the page **as displayed**
  (crop box within the media box, `/Rotate` applied: pdf.js's viewport), for page sizes, anchors
  and fields alike. Anchors are
  `{{<type>:<key>}}` texts (`SIGN_ANCHOR_PATTERN`); one inside a longer text run is placed by its
  share of the run's characters (exact when it is a run of its own). Bytes go to the store before
  the row; a failed insert deletes them.
- **Requests** (`requests.ts`, `fields.ts`): one transaction stores the request, inline documents,
  signers, fields and the `created` (and `sent`) events. Fields must fit on their page; an anchored
  field is placed over every occurrence (none → `invalid_fields`); every signer needs a
  `signature` field; signer emails are unique per request (case-insensitive). `delivery: email` →
  `authentication: email_link`, `embedded` → `customer_asserted`. `Idempotency-Key` through
  `withIdempotencyKey`; a replay (or any failure before commit) deletes the bytes of the inline
  documents it stored (only those without a row: a commit whose answer was lost keeps them). Send
  (draft → sent) and cancel (draft/sent → canceled) return the request as is when it is already
  there; a draft past its `expires_at` can't be sent (`invalid_expiry`).
- **Audit trail** (`events.ts`): `appendSignEvent(tx, …)` locks the request row, numbers events
  gaplessly and hashes each (`signEventHash`: SHA-256 of the canonical JSON of the event and the
  previous hash). Never update or delete `sign_event` rows; `verifySignEventChain` must stay
  `null` for every request. Events record the actor (`api_key`, `signer`, `dashboard`, `system`),
  IP and user agent, and the documents' SHA-256 where it matters.
- **Recording** (`record.ts`): every event goes through `recordSignEvent(tx, context, …)`: the
  audit trail event, its `sign_request.*` webhook (`SIGN_WEBHOOK_EVENT_OF`: sent, viewed,
  signer_signed, declined, completed, canceled; id = the event's id; never documents or field
  values) and a log line (`source: sign`, type `sign_request.<event>`), in the caller's
  transaction. `SIGN_WEBHOOK_EVENT_TYPES` is spread into `@coss/email`'s `WEBHOOK_EVENT_TYPES`
  (and the test events), mirrored by the SDK.
- **Sessions** (`sessions.ts`): `createSignSession` mints a `cosss_` token (only its sha256 is
  stored) for an `embedded` signer of a `sent`, unexpired request (`signer_not_embedded`,
  `request_not_signable`, `signer_finished`); the link is `<SIGN_PUBLIC_URL>/s/<id>#<token>`.
  `authenticateSignSession` is system-level (resolves the org from the session), constant-time,
  `null` for every failure, read-only for suspended organizations.
- **Signing** (`signing.ts`, through a session): `openSigning` (the signer's view; records
  `viewed` once), `consentToSign` (the exact consent text's SHA-256 must match what the page
  showed), `readSigningDocument` (only after consent), `signAsSigner` (field values — `date_signed`,
  `name` and `email` filled by coss.com, `text`/`checkbox` by the signer — plus a PNG signature and
  initials of at most 512 KB, stored at `orgs/<org>/<env>/signatures/<signer>-<kind>-<attempt>.png` with
  their SHA-256; sequential order: `not_signers_turn`; the last signature completes the request
  with a `completed` event by `system`) and `declineAsSigner` (declines the whole request).
  Every action locks the request row, re-reads the signer and re-checks
  `checkSignable`/`checkSignerOpen` (two tabs can't both sign). Reads inside a transaction run one
  after another (a transaction's client runs one query at a time).
- **Completion** (`complete.ts`, `completed-pdf.ts`, `seal/`): the last signature makes the request
  `completed` (event by `system`); the worker's `sign-completions` loop (`runDueSignCompletions`,
  leased with `seal_lease_until`, fenced on it, retried with backoff in `seal_next_attempt_at`)
  builds the completed document — the PDFs (forms flattened) with each field's value drawn in its
  box (`placement` maps as-displayed points to the page's own space for every `/Rotate`), then
  certificate pages (signers, identification, consent hashes, document hashes, the audit trail up
  to `completed`) in Cal Sans/Paper Mono (`assets/`, OFL; glyphs a font lacks become "?") — seals
  it, stores it at `orgs/<org>/<env>/requests/<id>/signed.pdf` and records `sealed` (with its
  SHA-256), whose webhook is `sign_request.completed`: that webhook means "ready to download".
- **Seal** (`seal/`): PAdES (`/SubFilter /ETSI.CAdES.detached`) in an invisible signature field,
  `/ByteRange` over everything but the 32 KB `/Contents` placeholder, saved without object streams.
  The CMS (`cms.ts`, pkijs + asn1js — keep them the same copies, `seal/crypto.ts`) signs content
  type, message digest and `signingCertificateV2`, and with a TSA (`tsa.ts`, RFC 3161) carries a
  `signatureTimeStampToken` over the signature value (B-T). Sealers: `KmsSealer` (KMS `Sign` with
  `MessageType: DIGEST`, RSA PKCS #1 v1.5 or ECDSA, chain from `SIGN_SEAL_CERTIFICATE_CHAIN`) and
  `LocalSealer` (a self-signed key per process). `sealerFromEnv` (`./runtime`) reads
  `signSealEnvShape` (`./env`). No DSS/LTV yet. Verify with `readPdfSeal` + pkijs (tests) or
  `openssl cms -verify -binary -inform DER -content <signed bytes>`.
- **Settings** (`settings.ts`): `allowed_origins` (≤ 10, `checkedSignOrigin`: https, plus
  `http://localhost` in sandbox), display name, accent color, theme, and the consent text
  (`null`: `DEFAULT_SIGN_DISCLOSURE`, `{name}` = display name, else the organization's name —
  have counsel review changes to it).
- **Store** (`store.ts`): `DocumentStore` (`put/get/delete/deleteOrganization`), keys
  `orgs/<org>/<env>/documents/<id>.pdf`. Only `FakeDocumentStore` exists: the API turns Sign off
  in production (`signService: null` → 503 `sign_unavailable`) until the S3 store lands.
  Organization deletion removes `sign_fake_object` rows in batches.
- **Retention**: `RETENTION_POLICY` `signature_requests` — kept until the customer deletes them.
