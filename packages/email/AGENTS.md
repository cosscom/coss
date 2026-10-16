# packages/email — the email product

Read together with the root `AGENTS.md` (conventions, tenancy rule, tests). Paths are from the
repository root.

Sending (SES, suppressions, tracking, unsubscribe, scheduled and batch sends, attachments, text parts, templates), reads, receiving and DMARC reports.

- **SES:** only the `coss_email_id` tag is ever set on SES messages — never forward customer tags (events are mapped
  back by that tag, and ingestion also checks provider + message id). `SendEmail` is not idempotent: the SES client has
  `maxAttempts: 1` and only throttling is retried. An outcome SES may have accepted (a timeout, a reset connection,
  a 5xx, anything but a documented rejection or a 4xx) is an `UncertainSendError`: the email stays claimed (`queued`
  + provider) for SES's `Send` event or the stale-claim sweep, never failed on the spot or sent again; a `Send` event
  also repairs `provider_error`. A whole-message `Reject`/`Rendering Failure` after acceptance fails the email (usage
  recorded at `sent` stays). Never adopt an existing SES identity held by another tenant
  (`IdentityTakenError`), and only recreate/delete identities tagged `coss_managed=<tenant prefix>` (orphans COSS
  created get fresh DKIM keys; identities managed outside COSS in the same account are never touched). The most specific verified domain across all orgs
  decides who may send from a From domain. Use one AWS account (or region) per stage. IAM policies live in
  `apps/worker/scripts/ses-policies.ts` (applied by `ses:bootstrap`): tag conditions can't apply to `SendEmail`
  (SES authorizes it against the sender address, verified live), only to identity changes.
- **Suppressions** (`packages/email/src/suppressions.ts`, table `email_suppression`, ids `sup_`): one list per
  environment; an entry's `scope` is `*` (`ALL_CATEGORIES`) or a category, matched against the send's `category`.
  COSS keeps the only list: SES tenants and the configuration set are created with suppression off
  (`TENANT_SUPPRESSION`; `ses:bootstrap` migrates existing tenants before disabling their protection) —
  never turn SES suppression back on, or removing
  a COSS entry or scoping one to a category stops working. Bootstrap imports historical SES events and
  account/tenant lists into live environments, atomically marking `email_tenant.suppression_migrated_at`
  so reruns preserve removals; pause sends/domain changes and drain events for the upgrade (README).
  Runtime domain setup must not disable an existing tenant's protection. Sends store suppressed recipients as
  `suppressed` with a
  COSS-source `email.suppressed` event (in the insert transaction) and `deliver` leaves them out of the provider
  message; an email with no recipient left is `failed`/`all_recipients_suppressed` without calling the provider.
  `recordProviderEvent` adds `*` entries for permanent bounces (not SES-suppressed ones) and complaints, never for
  `SIMULATOR_DOMAIN` addresses. The parsed send request omits `category` when absent so older request hashes stay valid.
  Bulk import/export is synchronous: `importSuppressions` validates each entry on its own (invalid ones are skipped
  and reported, reason `import`); the API takes 1,000 entries per request (the SDK batches), the dashboard a CSV of
  up to 10,000 rows (`serverActions.bodySizeLimit` in `apps/web/next.config.ts` leaves room for its 2 MB). Exports
  stream CSV page by page (`suppressionsCsvStream`, `suppression-csv.ts`) and guard formula-like cells with `'`, which
  `parseSuppressionCsv` strips again.
- **Open/click tracking** (`packages/email/src/tracking*.ts`, tables `email_tracking_rule` (ids `etr_`) and
  `email_link` (ids `lnk_`)): COSS-owned, provider-independent (SES's own open/click tracking stays off — the
  configuration set must not subscribe to `OPEN`/`CLICK`). Per field, a send's `tracking` wins, then its category's rule,
  then the environment default (the rule with a NULL category), then off; the result is snapshotted on the `email` row
  (`track_opens`/`track_clicks` + a random `tracking_token`) at send. `email.html` always keeps the original:
  `deliver` instruments only the provider's copy (`instrumentHtml` splices the original string — never re-serialize
  customer HTML), storing the links first. Clicks redirect only to stored URLs. `email.opened`/`email.clicked` go through
  `recordProviderEvent` (source `coss`, deduplicated per UTC day and link) and never change a recipient's status;
  they name a recipient only when the email had exactly one non-suppressed recipient. Events store the user agent,
  never the IP. Settings need `environment:update` in the dashboard; over the API (`/v1/tracking_settings`,
  `coss.email.tracking`: `PATCH`/`DELETE` `…/default` and `…/categories/{category}`, unset fields keep their value)
  reads need `email:read` and changes `email:send` (a sender already overrides them per send; no new permission),
  audited as `tracking_rule.saved`/`.deleted` like the dashboard. The parsed send request omits `tracking` when absent (request hashes).
- **One-click unsubscribe** (RFC 8058, `packages/email/src/unsubscribe.ts`, `email.unsubscribe`,
  `email_tracking_rule.unsubscribe`): a third field of the tracking rules (send's `tracking.unsubscribe`, then the
  category's rule, then the default, then off), snapshotted at send and true only for an email with a `category`, a
  single distinct recipient, no customer `list-unsubscribe`/`list-unsubscribe-post` header and at most
  `MAX_HEADERS_WITH_UNSUBSCRIBE` (13) custom headers, so SES's 15 still fit (an explicit
  `tracking.unsubscribe: true` breaking one of those is a 422; a rule just doesn't apply). It reuses the email's
  `tracking_token` (minted when opens, clicks or unsubscribe is on). `instrument` adds `List-Unsubscribe:
  <base/t/u/token>` + `List-Unsubscribe-Post` to the provider's copy only (base as for links, custom tracking domain
  included). `GET /t/u/:token` only shows a confirmation page (scanners follow links) — **never write on GET**;
  `POST` with `List-Unsubscribe=One-Click` (`recordUnsubscribe`) records `email.unsubscribed` (once per email, never
  changes the recipient's status) and adds a suppression scoped to the category (`reason` `unsubscribe`, re-added
  on every POST), in one transaction; never a redirect.
- **Custom tracking domains** (`packages/email/src/tracking-domains.ts`, table `tracking_domain`, ids `tdom_`):
  at most one per sending domain, a strict subdomain of it outside its MAIL FROM subdomain, and the hostname's most
  specific domain across orgs must be that domain. Served by a `TrackingHostnameProvider` (`DomainDeps.tracking`):
  Cloudflare for SaaS custom hostnames (`cloudflare/custom-hostnames.ts`, plain `fetch`) or the fake. The provider
  alone decides `active` (hostname and certificate live); the CNAME check (`checkTrackingRecord`) is only shown to
  the customer. Never adopt a hostname already registered in the zone (`TrackingHostnameTakenError` →
  `tracking_domain_taken`). Lifecycle mirrors domains (`pending` → `active`; an active one that stops →
  `temporary_failure`; never active within 72 h, or given up/unknown at the provider → `failed`, hostname released;
  restart via the domain's verify). The worker's `domains` loop re-checks them. `deleteDomain` releases the hostname
  first (the row cascades). The URL is resolved **at dispatch** in `instrument` (`trackingBaseUrlFor`, only when
  the email service has `trackingDomainProvider`, wired by the worker): the From domain's most specific domain must
  be the org's and its tracking domain `active` with that provider, else `trackingBaseUrl`. Nothing is stored on the
  email, and the `/t/*` routes ignore `Host`. Removing one breaks links in emails already sent through it. API:
  `POST`/`DELETE /v1/domains/{id}/tracking` (`domain:create`/`domain:delete`, no new permission), `Domain.tracking`
  (a `z.union([…, z.null()])`: `.nullable()` loses `null` in the OpenAPI document). Edge: `track.cosslinks.com`
  (the default tracking host, `TRACKING_PUBLIC_URL`, and Cloudflare's fallback origin; zone `cosslinks.com` in a
  self-serve Cloudflare account, never the coss.com zone) → ALB rule `/t/*` + `X-Tracking-Origin-Verify` → api
  (`infra/aws/routing.ts`).
- **BIMI** (`packages/email/src/bimi.ts`, `domain.bimi` jsonb, wire `Domain.bimi`): a DNS-only check run by
  `checkDomain` next to `checkRecords` (so the worker's re-checks and verify refresh it). It reads the DMARC policy
  (RFC 7489: the domain's own `p`, else the organizational domain's `sp ?? p`; the organizational domain — `tldts`'
  public suffix list, ICANN section — must have an enforced record of its own too; `pct` < 100 or `t=y` is partial;
  two records, a repeated or malformed tag = no record) and `default._bimi.<domain>`, else the organizational
  domain's (unrelated TXT records ignored). Statuses `not_checked` (no resolver or a lookup failure — never `missing` on a DNS error), `missing`,
  `invalid`, `configured`. Rows store issue codes only; `toBimiObject` renders `BIMI_ISSUE_MESSAGES` on read. Never
  fetch the logo (`l=`) or certificate (`a=`) — they are customer URLs (SSRF) and the VMC/CMC is the customer's to
  validate; the dashboard never renders the logo either. The docs page (`/docs/email/bimi`) lists the statuses and
  codes: change them together.
- **Scheduled sends** (`scheduled_at`, ISO 8601 with an offset, ≤ 30 days ahead; a past time sends now): stored as
  `scheduled` with a COSS-source `email.scheduled` event and sent by the worker's `dispatchDue` (every 5 s).
  It claims straight from `scheduled` (compare-and-set to `queued` + `provider`), after
  re-running `authorizeLiveSender` (failure → `failed` + `email.failed`) and, in the claim transaction, the
  suppression list. `cancel` is a compare-and-set `scheduled` → `canceled` (recipients `canceled`, whole-message
  `email.canceled`); repeating it returns the email, any other status is 422 `email_not_cancelable` (not 409: the SDK
  retries those). `reschedule` (`POST /v1/emails/{id}/reschedule`, `rescheduleEmail`) locks the still-`scheduled`
  row (`FOR UPDATE`), so a dispatcher's claim waits and its compare-and-set re-checks the new `scheduled_at`; it
  records `email.rescheduled` (`data.reschedule`, a random `sourceId` so every move is its own event), the same time
  again is a no-op, anything not `scheduled` is 422 `email_not_reschedulable`. Only the time changes (content changes
  are cancel + send). Scheduled sends are held while their organization is suspended. Cancel and reschedule need
  `email:send`.
  `scheduled_at` is omitted from the parsed request when absent (request hashes).
- **Email templates** (`packages/email/src/{templates,template-language,template-schemas}.ts`, tables
  `email_template` (ids `etpl_`), `email_template_version` (`etplv_`), `email_template_content` (`etplc_`),
  `/v1/email_templates`, `coss.email.templates`, permission `emailTemplate` (backfilled by `0064`)): per
  environment; one draft per template (`version` NULL, `revision` counts saves) and immutable published versions
  numbered from 1 (`published_version` is what sends use). A version holds the typed variables, sample values
  and one subject/HTML/text per locale (canonical BCP 47, ≤ 30), published together. Sends name a template by id
  **or alias** (`template_id`, plus `variables`, `template_version`, `locale`; never with `subject`/`html`/`text`)
  and are **rendered at send** (`renderTemplateForSend` in `prepareSend`, a per-request version cache in
  batches): the `email` row stores the rendered content and `template_id`/`template_version`/`template_locale`
  (no FK), so dispatch, screening, tracking and reads are unchanged and later publishes never alter stored or
  scheduled emails. The request hash covers the request (template + variables), never the output, and the
  transform adds template keys only when present (old hashes stay valid); template errors fall back to the
  idempotent replay like `authorizeLiveSender`. The language (`@coss/email/templates`, also the dashboard's live
  preview) is a Mustache subset: `{{v}}` (HTML-escaped in `html` only), `{{{v}}}` (HTML only), `#if`/`#each`
  with `{{else}}`, comments, `\{{`; no code runs, output and work are capped while rendering (2 MB and 1,000,000
  steps a field, nesting 10). Publishing needs a parse-clean draft whose names are all declared and content for
  the default locale; re-publishing an unchanged draft returns the current version. Draft saves and restores are
  never retried by the SDK, and publishes only with a `revision` (a retry must not save or publish twice). Variables
  are checked strictly (unknown names refused, `null` = absent, defaults applied, lists ≤ 1,000 objects,
  `variables` ≤ 64 KB); errors are 422 `invalid_request_error` codes (`template_*`, `invalid_template_variables`
  with `issues`), never 404/409. Only the dashboard's test sends render a draft (`SendEmailInput.templateDraft`,
  only at the revision the editor checked; `version: null` on the email): they need `email:send`, go to verified
  members only (`listVerifiedMemberEmails`), and are charged `emailSendQuota` (`@coss/ratelimit`, shared with the
  API and the SMTP relay) through the dashboard's own email service (`apps/web/src/lib/email-service.ts`, a pg-boss
  producer). `sample_variables` is in `OPAQUE_FIELDS`.
- **Batch sends** (`POST /v1/emails/batch`, `EmailService.sendBatch`, table `email_batch`, ids `batch_`): ≤ 100
  emails (`MAX_BATCH_EMAILS`), each a full `SendEmailRequest`, all or nothing. Every distinct `from` is authorized
  first (a failure names `emails.N.from`), then the batch row and every email go through the same
  `insertPrepared` as a single send, in **one transaction**. The batch row holds the `Idempotency-Key` and request
  hash (`hashSendBatchRequest`, same TTL/loop via `withIdempotencyKey`); its emails' own keys stay NULL, so batch and
  single-send keys never collide. Emails carry `batch_id` + `batch_index` (request order). The route shares the 40 MB
  send body limit (`hasOwnBodyLimit`) and charges the recipients of every email as **one** quota consume (refunded on
  replays/errors), so a batch above a bucket's burst (live default: 100 recipients/s) is refused without
  `Retry-After`. The SDK's `sendBatch` never chunks (that would break atomicity under one key).
- **Attachments** (`packages/email/src/attachments.ts`, table `email_attachment`, ids `att_`): base64 in the send
  request only (COSS never fetches URLs), ≤ 20 per email and 25 MB decoded combined; filenames need an extension and
  SES-refused extensions are rejected at validation. Bytes live in `email_attachment.content` (bytea) only while the
  email is `scheduled` or `queued` — cancellation, sender rejection, delivery, provider-event ingestion and
  the worker sweeps null them in the transaction that moves it to a terminal status. Reads select metadata columns only; API/SDK/dashboard and webhook payloads never
  expose content. A queued email whose content is gone fails with `attachments_unavailable` rather than sending without
  it. The parsed request omits `attachments` when empty (request hashes). SES gets them as `Simple.Attachments`
  (`content_id` → `INLINE`); the fake provider keeps sha256 digests, not bytes.
- **Generated text parts** (`packages/email/src/html-text.ts`, `htmlToText`): an email sent with `html` and no
  `text` gets a plain-text part built from the original HTML in `toOutbound`, for the provider's copy only (like
  tracking: `email.text` stays `null`, so API reads, request hashes and webhooks are unchanged). It is built before
  `instrument`, so its links are the real targets, never click redirects. Hidden content (`display:none`, `hidden`)
  is left out; nesting deep enough to exhaust the stack sends the email without one, as before.
- **Email reads** (`packages/email/src/read.ts`): `GET /v1/emails` (`listEmailSummariesPage`, `coss.email.list`)
  shares `listConditions` with the dashboard's list and never selects content (`EmailSummary`: no `html`, `text`,
  `headers`, `attachments`); `to` matches `email_recipient.address` through `(organization_id, address)`. An email's
  `failure` (`emailFailure`) is set only while it is `failed` — an error code on a queued email is a screening hold —
  and `provider_error` always shows `PROVIDER_ERROR_MESSAGE`, never the provider's own text (it can name internals).
- **Receiving email** (`packages/email/src/{inbound,inbound-mime,inbound-store,inbound-address,received-emails,receiving-domains}.ts`,
  `ses/inbound.ts`; tables `received_email` (ids `rcvd_`), `received_email_attachment` (`rcvdatt_`),
  `receiving_domain` (`rdom_`), `environment_inbound_address`, `inbound_drop_counter`, `inbound_fake_object`):
  SES has one catch-all receipt rule (`ses:bootstrap --managed-domain`: spam/virus scan, S3 action to `landing/` +
  SNS → the `<name>-inbound` queue), so it accepts mail for every verified domain of the account and the worker
  routes (`receiveEmail`, the `ses-inbound` loop). Route by the **envelope** recipients (`receipt.recipients`, never
  `mail.destination`): `<label>.<INBOUND_MANAGED_DOMAIN>` → its environment; a `receiving_domain.hostname` (exact
  match) → its environment while the parent domain is `verified`/`temporary_failure` **and still the most specific
  non-failed domain** across orgs (re-checked on every message). Unroutable recipients are dropped silently (no
  backscatter); organizations pending deletion receive nothing; suspended ones still receive (webhooks held). One
  row per environment with **only its recipients** — copies of a shared message drop SES's `X-SES-RECEIPT`/
  `X-SES-DKIM-SIGNATURE` headers and other environments' `Received: … for <addr>` clauses (`scrubEnvelopeHeaders`),
  so Bcc'd addresses never leak across tenants. Content goes to the `InboundContentStore` first
  (`orgs/<org>/<env>/<id>/raw.eml`, `…/att/<attachment id>`), then the row, attachments, a log line (source `email`,
  type `email.received`) and the `email.received` webhook in one transaction; `(environment, provider, provider
  message id)` is unique, so redelivered notifications record once (written content is deleted again). A virus
  verdict stores a `blocked` row (envelope, sender, subject, verdicts; no content, no webhook); spam and auth
  failures are stored and flagged. The `email.received` payload is metadata only (no bodies, headers or cc).
  `received_email.text`/`html` are cut at 2 MB and headers at 64 KB (`truncated`); the raw message is whole. The
  dashboard previews received HTML with `UNTRUSTED_PREVIEW_HEAD` (`apps/web/src/lib/email-preview.ts`; `img-src data:` only — no remote images, they are
  tracking pixels) and serves raw/attachment downloads as `attachment` + `nosniff` + `CSP: sandbox`; the API
  serves attachments as `application/octet-stream`. Reads need `email:read`; deleting (`DELETE
  /v1/received_emails/{id}`, content too) `receivedEmail:delete` (owners, admins, every key; backfilled by `0049`).
  Receiving domains: one per domain, the domain or a subdomain, never its `send.` MAIL FROM subdomain, its tracking
  hostname or the managed domain; API `POST`/`DELETE /v1/domains/{id}/receiving` (the key's environment receives),
  `Domain.receiving`. The managed domain's SES identity is tagged `coss_inbound`, never `coss_managed` (the apps'
  IAM policies may delete those). The dashboard's **Send a test email** (`receiveFakeEmail`) is for sandbox
  environments, or any while the dashboard runs the fake provider, and only to the environment's own addresses.
- **DMARC reports** (`packages/email/src/dmarc-{record,report-xml,reports,guidance,notifications,sample}.ts`; tables
  `dmarc_report` (ids `dmarcrep_`), `dmarc_report_record` (`dmarcrec_`), `dmarc_notification` (`dmarcntf_`), and
  `domain.dmarc_report_token`/`dmarc_record`/`dmarc_policy_changed_at`): each domain's `rua` address is
  `dmarc-<token>@<INBOUND_MANAGED_DOMAIN>` (`dmarcReportAddress`; the bare managed domain, which `managedLabelOf`
  never matches), recommended by `expectedRecords` (`DomainDeps.dmarcReportDomain`, `null` with receiving off).
  Reporters only mail an address on another domain when `<domain>._report._dmarc.<managed domain>` says
  `v=DMARC1`: COSS publishes the wildcard `*._report._dmarc.inbound.coss.com` (README, receiving). `receiveEmail`
  splits report recipients off before routing (`splitDmarcReportRecipients`); they never become received emails.
  Addresses are public, so `ingestDmarcReports` trusts nothing unchecked: a live domain's token, SPF or DKIM `pass`
  on the message, `policy_published.domain` under the domain, a plausible recent period, the org's
  `email.dmarc_reports.day` budget (fails open, like inbound mail), at most `MAX_DMARC_REPORT_RECORDS` rows;
  `(domain, reporter, report id)` is unique. Only the parsed report is stored, never the message. Unpacking is
  `node:zlib` with `maxOutputLength` (gzip, and zip by hand) and XML is read by a small parser that refuses DTDs:
  never swap in an XML library that resolves entities. `via_coss` (the domain's DKIM selectors or MAIL FROM domain)
  is decided at ingest. `checkDomain` stores the one published `v=DMARC1` value (two records count as none), and
  for a subdomain with no `v=DMARC1` record at all its organizational domain's (`dmarc_inherited_record`, applied
  as `sp ?? p`, `appliedDmarcRecord`); `parseDmarcRecord` refuses a repeated tag or a part that isn't `tag=value`
  (no policy, like BIMI). It moves `dmarc_policy_changed_at` only when `dmarcPolicyKey` of the applied record
  changes (policy or partial enforcement) and only when DNS answered. A truncated report in the window blocks
  readiness (check `complete`). Guidance (`dmarcGuidance`, thresholds in `DMARC_READINESS`) is pure and computed on every read:
  none → quarantine → reject, no `pct` ramp. Ingest queues `dmarc_notification` rows (readiness once per policy
  epoch; COSS mail failing under enforcement once per epoch and week), sent by the worker's `dmarc-notifications`
  loop through the reputation notifier (skipped when the policy changed since). The dashboard's "Send a sample
  report" (`receiveSampleDmarcReport`) exists only with the fake provider. API (`domain:read`):
  `GET /v1/domains/{id}/dmarc`, `…/dmarc/reports[/{report_id}]`, `coss.domains.dmarc`; event
  `domain.dmarc_report_received` (`DOMAIN_EVENT_TYPES`, live environments only, no rows or IPs).
