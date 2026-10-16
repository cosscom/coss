# packages/email — the email product

Read together with the root `AGENTS.md` (conventions, tenancy rule, tests). Paths are from the
repository root.

Sending (SES, suppressions, tracking, unsubscribe, scheduled and batch sends, attachments, text parts, templates), reads, receiving and DMARC reports.

- **Streams** (`email.stream`, `transactional` | `marketing`; `EMAIL_STREAMS` in `@coss/email`): each stream has its
  own SES configuration set (`SES_CONFIGURATION_SET` and `<it>-marketing`, `configurationSetsFor`), its own SES tenant
  per organization (`email_tenant` is keyed by organization + stream; `tenantNameFor(prefix, org, stream)` adds
  `-marketing`) and its own pg-boss dispatch queue (`email-dispatch`, `email-dispatch-marketing`, worked with less
  concurrency; both are `WORKER_LOOPS` names). Domain identities are associated with every tenant of their
  organization (a shared assignment: `createDomainIdentity({ tenants })` refuses only tenants outside that set).
  `authorizeLiveSender({ stream })` checks that stream's tenant pause. A tenant missing for an organization set up
  before its stream is created by `ensureMissingStreamTenants` (run by `ses:bootstrap`), which associates the
  identities before storing the row (only identities provisioned for the organization: a domain still being claimed
  goes through `createDomainIdentity`'s ownership checks first) and re-associates existing stream tenants with
  domains added since; marketing tenants are stored `suppression_migrated_at` set (born without SES
  suppression), so bootstrap's suppression migration never imports into them. Every write path that enqueues a
  dispatch job passes the email's `stream`.
- **SES:** only the `coss_email_id` tag is ever set on SES messages — never forward customer tags (events are mapped
  back by that tag, and ingestion also checks provider + message id). `SendEmail` is not idempotent: the SES client has
  `maxAttempts: 1` and only throttling is retried. An outcome SES may have accepted (a timeout, a reset connection,
  a 5xx, anything but a documented rejection or a 4xx) is an `UncertainSendError`: the email stays claimed (`queued`
  + provider) for SES's `Send` event or the stale-claim sweep, never failed on the spot or sent again; a `Send` event
  also repairs `provider_error`. A whole-message `Reject`/`Rendering Failure` after acceptance fails the email (usage
  recorded at `sent` stays). Never adopt an existing SES identity held by another tenant
  (`IdentityTakenError`), and only recreate/delete identities tagged `coss_managed=<tenant prefix>` (orphans coss.com
  created get fresh DKIM keys; identities managed outside coss.com in the same account are never touched). The most specific verified domain across all orgs
  decides who may send from a From domain. Use one AWS account (or region) per stage. IAM policies live in
  `apps/worker/scripts/ses-policies.ts` (applied by `ses:bootstrap`): tag conditions can't apply to `SendEmail`
  (SES authorizes it against the sender address, verified live), only to identity changes.
- **Suppressions** (`packages/email/src/suppressions.ts`, table `email_suppression`, ids `sup_`): one list per
  environment; an entry's `scope` is `*` (`ALL_CATEGORIES`) or a category, matched against the send's `category`.
  coss.com keeps the only list: SES tenants and the configuration set are created with suppression off
  (`TENANT_SUPPRESSION`; `ses:bootstrap` migrates existing tenants before disabling their protection) —
  never turn SES suppression back on, or removing
  a coss.com entry or scoping one to a category stops working. Bootstrap imports historical SES events and
  account/tenant lists into live environments, atomically marking `email_tenant.suppression_migrated_at`
  so reruns preserve removals; pause sends/domain changes and drain events for the upgrade (README).
  Runtime domain setup must not disable an existing tenant's protection. Sends store suppressed recipients as
  `suppressed` with a
  coss.com-source `email.suppressed` event (in the insert transaction) and `deliver` leaves them out of the provider
  message; an email with no recipient left is `failed`/`all_recipients_suppressed` without calling the provider.
  `recordProviderEvent` adds `*` entries for permanent bounces (not SES-suppressed ones) and complaints, never for
  `SIMULATOR_DOMAIN` addresses. The parsed send request omits `category` when absent so older request hashes stay valid.
  Bulk import/export is synchronous: `importSuppressions` validates each entry on its own (invalid ones are skipped
  and reported, reason `import`); the API takes 1,000 entries per request (the SDK batches), the dashboard a CSV of
  up to 10,000 rows (`serverActions.bodySizeLimit` in `apps/web/next.config.ts` leaves room for its 2 MB). Exports
  stream CSV page by page (`suppressionsCsvStream`, `suppression-csv.ts`) and guard formula-like cells with `'`, which
  `parseSuppressionCsv` strips again.
- **Open/click tracking** (`packages/email/src/tracking*.ts`, tables `email_tracking_rule` (ids `etr_`) and
  `email_link` (ids `lnk_`)): coss.com-owned, provider-independent (SES's own open/click tracking stays off — the
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
- **Preference center and consent at send** (`packages/email/src/{link-tokens,preferences,preference-center-html,double-opt-in,send-eligibility,marketing-footer}.ts`,
  `apps/api/src/routes/preferences.ts`): links are stateless AES-256-GCM tokens (`mintLinkToken`/`readLinkToken`,
  `EMAIL_LINK_KEYS`; kind `preferences` or `confirmation` bound as AAD; confirmations expire after 7 days, preference
  links never) carrying environment, address, email and topic — nothing is stored at send, links survive the email
  purge, and the address never appears in a URL. Holding a link is a consent capability: minting one
  (`POST /v1/contacts/{id}/preference_links`) needs `contact:update`. `/t/u/:token` (page; a POST of exactly `List-Unsubscribe=One-Click`
  is RFC 8058), `/t/u/:token/unsubscribe`, `/t/u/confirm/:token`: plain Hono under the tracking host (any `Host`),
  outside `/v1`, mounted before `/t` (a 32-character tracking token on `/t/u/:token` is one-click unsubscribe's
  and falls through to `/t`; the two token shapes never overlap); **no GET or HEAD ever changes anything** (scanners fetch every link); a bad
  token is a plain 404 before any database work; pages have no script and a nonce'd style (strict CSP,
  `frame-ancestors 'none'`); `preferences.*` buckets fail open (an opt-out must never depend on Valkey). A
  non-contact who changes anything becomes an `unsubscribed` contact (`source: preference_center`, counted but never
  refused by the plan limit). `skippedRecipients` (both send paths: acceptance and the scheduled claim) applies
  consent: transactional email skips only explicit opt-outs of its category's topic (a password reset ignores
  `contact.status`); marketing email skips contacts that aren't `subscribed` or that its topic doesn't reach, plus
  `stream:marketing` suppressions — recorded as `email.suppressed` with `data.unsubscribe`. At dispatch (`complete()`,
  after tracking so the footer's links are never redirects) marketing email, and single-recipient email whose
  category is a topic, get `List-Unsubscribe` + `List-Unsubscribe-Post` pointing at the preference center, replacing
  one-click unsubscribe's per-category headers (the customer's own header, or more than
  `MAX_HEADERS_WITH_UNSUBSCRIBE` of them, wins on transactional email; marketing refuses both at validation and never
  snapshots `email.unsubscribe`); marketing also gets `applyMarketingFooter` (placeholders
  `{{{unsubscribe_url}}}`, `{{{preferences_url}}}`, `{{{mailing_address}}}`, else a footer; stored templates
  keep them undeclared, `MARKETING_PLACEHOLDERS`) on the provider's copy
  only. Marketing sends (`stream: "marketing"`) need exactly one recipient and the environment's postal address (422
  `mailing_address_required` at send; a `DispatchRefusal` fails the email if it vanished by dispatch, as does a missing
  key ring, `marketing_unavailable`). Double opt-in: `upsertContact({ doubleOptIn })` makes new or unsubscribed
  contacts `pending` and refuses `status: "subscribed"` (`double_opt_in_status`, for the environment's default too); the API checks `confirmation_from` (and, live, `authorizeLiveSender`) first, charges
  `contacts.confirmations.*` + the cross-org `contacts.confirmation.address` bucket, then `sendConfirmation` (the
  customer's own send, `discardBody`, idempotency key `contact-confirmation:<id>:<n>`, a reused one counts as sent: each attempt mints a new link, ≤ 1/day, ≤ 3 before
  confirming); `confirmContact` only confirms a contact pending since before the link. Unconfirmed contacts are purged
  after `RETENTION_DAYS.pendingContacts` (`purgeExpiredPendingContacts`, counters given back).
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
- **Dedicated IPs** (`packages/email/src/dedicated-ips.ts`, `ses/dedicated-ips.ts`, tables `dedicated_ip_pool` (ids
  `dip_`) and `dedicated_ip_delivery_rollup`; the `dedicated_ips` add-on): one SES **managed** dedicated IP pool per
  organization (SES leases, scales and warms its IPs up per mailbox provider, spilling what they can't take yet to
  shared IPs) and, per stream, a configuration set sending through it: the pool and the transactional set are named
  `tenantNameFor(prefix, org)`, the marketing set `tenantNameFor(prefix, org, "marketing")`; all tagged
  `coss_managed=<prefix>`, each set associated with its stream's tenant and carrying copies of its stream's shared
  set's event destinations. Both streams share the pool's IPs (events and reputation stay per stream); marketing
  joins once its set exists (`marketing_configured_at`, set at provisioning when the marketing tenant exists, else
  by a later `warming`/`ready` check), and until then marketing sends stay on shared IPs. Never adopt or delete a pool or set without that tag (`DedicatedIpTakenError`). Billing decides,
  the worker's `dedicated-ips` loop (`reconcileDedicatedIpPools` with `organizationsEntitledTo("dedicatedIps")`)
  follows: entitled → `provisioning` (needs the org's tenant, i.e. a domain: the worker never creates tenants; past
  `MAX_DEDICATED_IP_POOLS` = 45 → `waiting`, a `console.error`) → `warming` (live sends use the pool from here) ⇄
  `ready` (≥ 95% of the last 7 days' deliveries, ≥ 1,000, left from the pool's IPs — `ses:outgoing-ip` of `Delivery`
  events counted per hour and IP in the rollup, only for emails with `dedicated_pool`); not entitled → `releasing`
  at once (sends back on shared IPs) and released `RELEASE_DELAY_MS` (a day) later — association, then
  configuration set of each stream, then pool — unless the entitlement returns first (`release_started_at` is set before the
  provider calls: a later return waits for the release and gets a new pool). Organizations pending deletion are
  never entitled, and a provisioning step that finds one (or its row gone) releases what it just created: the
  teardown may have released before it. A send decides at claim
  (`dedicatedPoolSql(org, provider, stream)`, stored in `email.dedicated_pool`; `SesEmailProvider` then uses the
  org's configuration set of the email's stream).
  SES allows **50 pools per region, a hard limit**: the dashboard's purchase preflight (`dedicatedIpSlotAvailable`,
  in the purchase's transaction under the lock new pools are created under) counts organizations with a pool, an
  entitlement or an unpaid purchase against the 45. IAM (`ses-policies.ts`): only the worker manages pools/sets (`<prefix>-*`, tag
  conditions); api and worker may send with `configuration-set/<prefix>-*`; the SNS topic accepts events from those
  sets (`ses:bootstrap` — re-run it in production before deploying a change to either). Sandbox never uses a pool.
- **Scheduled sends** (`scheduled_at`, ISO 8601 with an offset, ≤ 30 days ahead; a past time sends now): stored as
  `scheduled` with a coss.com-source `email.scheduled` event and sent by the worker's `dispatchDue` (every 5 s).
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
  request only (coss.com never fetches URLs), ≤ 20 per email and 25 MB decoded combined; filenames need an extension and
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
  `v=DMARC1`: coss.com publishes the wildcard `*._report._dmarc.inbound.coss.com` (README, receiving). `receiveEmail`
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
  epoch; coss.com mail failing under enforcement once per epoch and week), sent by the worker's `dmarc-notifications`
  loop through the reputation notifier (skipped when the policy changed since; a readiness email
  re-runs the guidance and sends the record built from DNS as it is then, or is skipped when no longer ready). The dashboard's "Send a sample
  report" (`receiveSampleDmarcReport`) exists only with the fake provider. API (`domain:read`):
  `GET /v1/domains/{id}/dmarc`, `…/dmarc/reports[/{report_id}]`, `coss.domains.dmarc`; event
  `domain.dmarc_report_received` (`DOMAIN_EVENT_TYPES`, live environments only, no rows or IPs).
- **Contacts** (`packages/email/src/{contacts,contact-properties,audiences,segments,topics,audience-resolution,marketing-settings,contact-csv}.ts`,
  tables `contact` (ids `contact_`), `contact_property` (`cprop_`), `audience` (`aud_`) + `audience_member`, `segment`
  (`seg_`), `topic` (`topic_`) + `contact_topic`, `marketing_settings`, `contact_counter`; permission `contact`, backfilled
  by `0075`): one contact per environment and address (bare, lower-cased). **Consent lives on contacts, deliverability
  in suppressions**: `contact.status` (`subscribed`/`unsubscribed`/`pending`) and `contact_topic` (explicit
  `opted_in`/`opted_out`; no row = the topic's `default_subscription`) say who wants marketing, while bounces and
  complaints stay suppressions. A contact's or topic's opt-out is never written as a suppression, and a re-subscribe never deletes one.
  A topic's `key` is a send's `category` (immutable). Custom properties are typed definitions (`contact_property`,
  ≤ 50, key and type immutable; dates stored canonical ISO); `mergeProperties` validates every write (unknown key or
  wrong type → `ContactError`, 422, `param: properties.<key>`). The plan's `contactsPerEnvironment` is enforced by a
  conditional update of `contact_counter` (`reserveContacts`/`releaseContacts`, same transaction as every insert and
  delete — never a `count(*)`). Imports never re-subscribe anyone and send no webhooks; single changes send
  `contact.created/updated/deleted` (contact id, email, status, source — never properties). Segments are JSON filters
  (`SegmentFilter`, ≤ 20 conditions, one nested level) compiled to SQL at every use (`compileSegmentFilter`: values
  bound, keys only from definitions, `contains` via `position()`); deleting a property, audience or topic a segment
  references is refused (`…_in_use`). `resolveRecipients` (keyset by contact id, bounded by `before`) is the only way
  marketing recipients are chosen: `subscribed`, the topic reaches them, and no `*`/`stream:marketing`/topic
  suppression. `ContactError` is mapped in `toApiError` (404 for `not_found`, else 422 — never 409).
- **Broadcasts** (`packages/email/src/{broadcasts,broadcast-render,broadcast-content,broadcast-stats,broadcast-references,broadcast-schemas}.ts`,
  `apps/api/src/routes/broadcasts.ts`, `coss.email.broadcasts`; tables `broadcast` (ids `bcast_`) + `broadcast_stat`;
  permission `broadcast`, backfilled by `0077`): `draft` → `scheduled` → `sending` ⇄ `paused` → `sent`, or
  `canceled`/`failed`. Content that could render past `MAX_RENDERED_LENGTH` with the longest contact values is refused
  (`content_too_large`); placeholders read only the variables' own keys. Only drafts are edited; deleting needs a draft or a cancel before any email was made. Starting
  (create with `send`/`scheduled_at`, or `/send`, `/resume`) checks the postal address and, live,
  `authorizeLiveSender({ stream: "marketing" })`. The worker's `broadcasts` loop (`runDueBroadcasts`, system-level)
  claims each due broadcast with a lease (`lease_until`, bound from a JS `Date`; every write is fenced on it, so a
  worker whose lease was taken over writes nothing): a `scheduled` one is screened **once** (`ScreenInput.force`,
  product `broadcast`; an error holds it and retries each minute, failing `content_screening_unavailable` after an
  hour; a block fails it `content_rejected` and screening suspends the org), then freezes its target
  (`contact_upper_bound` = a `newId` at start, `recipients_estimated`) and moves to `sending`. Each step makes at most
  `min(500, rate × 5 s)` emails (rate: `rate_per_second` capped by the plan's `email.marketing.recipients.second`),
  waits while `BROADCAST_BACKLOG` of its emails are still queued (the unclaimed sweep would fail a bigger backlog),
  charges `email.marketing.recipients.second` + `email.recipients.day` (live only; a denial puts it off, a batch
  larger than the bucket is halved; what the step doesn't make is refunded, `refundThrottle`), then in one transaction: `resolveRecipients` page → one email + recipient per
  contact (`ON CONFLICT (broadcast_id, contact_id) DO NOTHING`: reruns never duplicate) → dispatch jobs on the
  marketing queue → `UsageGate.reserve` → `recipients` counter → cursor. It is `sent` once nothing is left to make or
  queued. Pausing or canceling deletes the emails nobody claimed yet (`queued`, no provider), gives back their
  reservation (`UsageGate.release`) and counters; a pause rewinds the cursor before them (from the contacts, never
  the retained emails). A broadcast's emails are kept past email retention until it finishes
  (`purgeExpiredEmails`): their rows are what keeps a resume from sending anyone a second one. The worker pauses on its own:
  `billing_hold`/`usage_limit`/`sending_paused` retry each minute (dropping and rewinding the unclaimed emails the
  same way, so a hold stops the queue too), `marketing_paused`/`account_suspended`/
  `mailing_address_required` wait for Resume; an unverified From fails it. Creating a draft needs `broadcast:create`;
  starting one (`send`, `scheduled_at`) also `broadcast:send` (`apiKeyHasPermissions`). **Broadcast emails store no body**: the
  rendered subject, `variables` (only the template's `{{{contact.<key>|fallback}}}` keys) and `contact_id`; dispatch
  and every read render the broadcast's frozen content (`withRenderedBody`; dispatch caches it per process), then
  the marketing footer and tracking apply as for any marketing email; they skip per-email screening unless personalized (an email with contact values is sampled like any send:
  the values could carry any text or link), marketing email's consent (and the marketing pause: a paused organization's queued marketing email
  is failed `marketing_paused`, a broadcast's left to its worker to drop) is checked again at its dispatch claim
  (`skippedRecipients`, as for scheduled sends: a broadcast's queue can be minutes long), and an SES
  throttle (`ThrottledSendError`) hands a marketing email back for a later dispatch instead of failing it. Counters
  (`broadcast_stat`, 16 shards by email id, summed on read; they outlive the emails): `recipients` at fan-out,
  `sent`/`delivered`/`bounced`/`complained`/`failed` from **recipient status moves** in `recordProviderEvent`
  (`recipientMoveCounts`: each status counts toward fixed counters, a move adds the new ones and takes the old ones
  away, so the shards always equal `recountBroadcastStats`), `opened`/`clicked` on an email's first open or click,
  `unsubscribed` when its link actually unsubscribed a subscribed contact. An unfinished broadcast's audience, segment
  or topic can't be deleted (`…_in_use`). `BroadcastError` maps to 404 (`not_found`) or 422 (never 409);
  `broadcast.sending/sent/paused/canceled/failed` webhooks carry the stats, never content.
