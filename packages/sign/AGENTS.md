# packages/sign — Sign (e-signatures)

Read together with the root `AGENTS.md` (conventions, tenancy rule, tests). Paths are from the
repository root.

Embeddable, compliant e-signatures (ESIGN/UETA, eIDAS simple electronic signatures): customers
upload PDFs, ask signers to sign them in their own app (embedded) or by email, and get a sealed
copy with an audit trail. Built so far: documents, signature requests with signers and fields, the
audit trail, signing sessions and the signer's actions (the signing app is `apps/sign`), settings,
webhooks and log lines, completion's sealed PDF, email delivery with reminders and expiry,
templates and the embedded builder. See "Not built yet" in the root `AGENTS.md` for what's left.

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
  `signatureTimeStampToken` over the signature value (B-T); the token must be over that value, carry the nonce (compared as a number) and verify with its time-stamping certificate. Sealers: `KmsSealer` (KMS `Sign` with
  `MessageType: DIGEST`, RSA PKCS #1 v1.5 or ECDSA, chain from `SIGN_SEAL_CERTIFICATE_CHAIN`) and
  `LocalSealer` (a self-signed key per process). `sealerFromEnv` (`./runtime`) reads
  `signSealEnvShape` (`./env`). No DSS/LTV yet. Verify with `readPdfSeal` + pkijs (tests) or
  `openssl cms -verify -binary -inform DER -content <signed bytes>`.
- **Email delivery** (`notifications.ts`, `emails.ts`; the worker's `sign-notifications` loop,
  `runDueSignNotifications`): expires `sent` requests past `expires_at` (`expired`, webhook
  `sign_request.expired`); invites `delivery: email` signers whose turn it is (`notified`);
  reminds them every `reminder_interval_days` (request, defaulting to the settings') up to
  `MAX_SIGN_REMINDERS`, or when asked (`requestSignReminders`, `POST …/remind`: once an hour per
  signer, `reminder_not_due` otherwise); emails each email signer their copy once sealed (PDF
  attached up to 10 MB, always a link). Every email has a fresh 30-day session link
  (`mintSignSession`; never past `expires_at`) and a stable idempotency key
  (`sign-invite:`/`sign-remind:<n>`/`sign-copy:` + signer id), and the signer row moves by
  compare-and-set after the send (request row locked first, as signing does), so a crash in between replays the same email (the replay's own, never-emailed session is deleted, and its event names no session) (an invitation
  only moves `pending` to `notified`, never back from `viewed`/`signed`). A failed email puts that
  signer in backoff (`email_failures`, `email_retry_at`: 1, 2, 4… minutes, at most 6 hours), so it
  never holds up anyone else's. A suspended organization's signers (an admin suspension or its reputation's) get nothing until it is
  reinstated (coss.com's sender must never carry its mail). Emails go
  through an injected `SignMailer` (never `@coss/email`): the worker's
  `apps/worker/src/sign-mailer.ts` sends from the settings' `email_from` in the request's
  environment (checked against the live provider's verified domains when set over the API), else
  — or when that domain stops being verified — from coss.com's sender
  (`SIGN_NOTIFICATIONS_FROM`, default `NOTIFICATIONS_FROM`'s address, in
  `NOTIFICATIONS_ENVIRONMENT_ID`) as "<requester> via coss.com"; sandbox environments always send
  in their own (fake) environment. coss.com's sender never carries the requester's `message`
  (abuse): `SignEmail.cossContent` is the copy without it, used whenever the mailer falls back.
  Subjects are one line. The mailer sends nothing when the key already exists in either
  environment (a retry whose route changed). Bodies are discarded after sending (they hold
  links); tracking is off.
- **Templates** (`templates.ts`; tables `sign_template` (`stpl_`), `sign_template_document`,
  `sign_template_field` (`stfld_`)): documents, `roles` (`{ key, name }`) and fields per role
  (positions; anchors resolved when saved, by `placeSignerFields` with `requireSignature: false`,
  so a template can be saved incomplete; `ready` says when every role has a signature field).
  `documents`/`roles`/`fields` in an update replace the whole list. Templates keep their
  documents from deletion like requests (`document_in_use`). `createRequestFromTemplate` names one
  signer per role (in the template's role order), fills `merge_fields` into `text` fields with a
  `merge_key` (`sign_field.prefilled`: shown, not editable; `signAsSigner` refuses another value),
  records `template_id`, and goes through `SignService.create` with the template request as the
  idempotency hash (`hashSource`).
- **Builder sessions** (`builder.ts`, `sign_builder_session` (`sbs_`), tokens `cossb_`): like
  signing sessions, for one template; the builder (`apps/sign` `/b/<id>`) uploads documents into
  the template at once and saves only the template's own documents, so a session never reaches
  another document of the environment.
- **Settings** (`settings.ts`): `allowed_origins` (≤ 10, `checkedSignOrigin`: https, plus
  `http://localhost` in sandbox), display name, accent color, theme, and the consent text
  (`null`: `DEFAULT_SIGN_DISCLOSURE`, `{name}` = display name, else the organization's name —
  have counsel review changes to it).
- **Store** (`store.ts`, `s3-store.ts`): `DocumentStore` (`put/get/delete/deleteOrganization`),
  keys `orgs/<org>/<env>/…` (documents, `signatures/`, `requests/<id>/signed.pdf`).
  `signStoreFromEnv` (`./runtime`): `S3DocumentStore` with `SIGN_DOCUMENTS_BUCKET` (+ `AWS_REGION`;
  versioned, SSE-KMS, `infra/terraform/sign.tf`), else `FakeDocumentStore` (`sign_fake_object`)
  outside production, else `null`: the API answers 503 `sign_unavailable` and the worker's Sign
  loops don't run. Organization deletion: the worker's `releaseProviderResources` deletes the
  store's prefix; `deleteOrganizationData` removes `sign_fake_object` rows.
- **Deleting requests** (`deleteSignRequest`, `DELETE /v1/sign/requests/{id}`): anything but `sent`
  (cancel first, `request_not_deletable`); the row cascades (signers, fields, events, sessions)
  and the signature images and signed PDF leave the store. Documents stay. The keys go into
  `sign_store_cleanup` in the deleting transaction and leave it once the store confirms; the
  worker's `sign-cleanup` loop (`runDueSignCleanup`) retries what failed, with backoff. A seal
  racing the deletion loses its fenced update and deletes its own copy.
- **Billing**: meter `sign.completed_requests` (`@coss/billing/metering`), recorded once in the
  sealing transaction (behind its compare-and-set), live environments only. It has no rate yet:
  invoices show the usage as an uncharged line until a rate card prices it (pricing is a product
  decision).
- **Retention**: `RETENTION_POLICY` `signature_requests` — kept until the customer deletes them;
  `signing_sessions` — signing and builder sessions `RETENTION_DAYS.signSessions` after expiry
  (`purgeExpiredSignSessions`, the worker's `retention` loop).

## Going live (production)

Sign is off in production until all of this is done, in this order:

1. **Domain:** buy the signing app's domain (placeholder `cosssign.com`) on Cloudflare. Then add
   the `sign` service to `infra/aws/services.ts` and the deploy matrix, add `SIGN_HOST` routing
   with an origin-verify header like `PORTAL_HOST`, and add its certificate. Run
   `terraform apply` **before** merging that PR: a new ECS service must exist first.
2. **Bucket:** `terraform apply` creates the bucket and both KMS keys (`sign.tf`).
3. **Seal:** make a CSR from the `sign_seal_kms_key_id` key, buy a document-signing certificate
   from a CA on Adobe's trust list (AATL), and set `SIGN_SEALER=kms`, `SIGN_SEAL_KMS_KEY_ID`,
   `SIGN_SEAL_CERTIFICATE_CHAIN` (worker). Add a TSA contract's `SIGN_TSA_URL`.
4. **Settings:** set `SIGN_DOCUMENTS_BUCKET` (api, worker, sign) and `SIGN_PUBLIC_URL` (api,
   worker), plus `SIGN_NOTIFICATIONS_FROM` on a verified coss.com domain. Deploy.
5. **Before announcing:** get legal review of `DEFAULT_SIGN_DISCLOSURE` and the certificate
   wording, and price `sign.completed_requests` with a new rate card.
