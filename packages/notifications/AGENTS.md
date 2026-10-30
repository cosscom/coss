# packages/notifications — coss.com's notification emails

Read together with the root `AGENTS.md` (conventions, tenancy rule, tests). Paths are from the
repository root.

Emails coss.com sends an organization's people about what happened and what to do next (an SMS
number that still needs its sender registered, a registration in review, approved or not). Two
parts:

- **The layout** is `@coss/email-layout` (`packages/email-layout`, zero dependencies, so auth can
  use it too): `renderEmail({ subject, title?, preview?, blocks, reason? })` → `{ subject, text,
  html }`. Blocks: `heading`, `paragraph`, `list`, `button` (the one call to action), `link`,
  `code`, `details` (label/value rows), `steps` (`done`/`current`/`upcoming`/`failed`, for a
  process like a review) and `note` (small print). Every string is text — the renderer escapes it
  — and subjects go through `oneLine`. The HTML is tables and inline styles only (what every mail
  client renders), grayscale like the site. Every coss.com email uses it: account emails
  (`@coss/auth/emails`), reputation, DMARC and billing notifications, and this outbox.
- **The outbox** (table `notification`, ids `ntf_`; `src/outbox.ts`): a product calls
  `enqueueNotification(tx, { organizationId, kind, dedupeKey, payload, notBefore? })` in the
  transaction that decides the email. Once per `dedupeKey` within the kind and organization;
  `notBefore` delays it (a reminder). The worker's `notifications` loop (`runDueNotifications`,
  system-level) claims due rows (5-minute lease), resolves the kind from the registry
  (`NOTIFICATION_KINDS`, `apps/worker/src/notification-kinds.ts`), renders it **at send time** and
  sends one email per recipient through a `Notifier` (`emailNotifier` from `@coss/email`: coss.com's
  own environment, category `account`, tracking off; idempotency key `<notification id>:<user id>`).
  Failures back off 1, 2, 4… minutes and become `failed` after 8 attempts; rows older than the
  kind's `maxAgeMs` (default 3 days) are `skipped`, as are ones whose organization is gone or with
  nobody to receive them. A kind this worker doesn't know yet (a deploy in progress) is retried, not
  dropped.

## Adding an email

1. Name the kind `<product>.<event>` and write a `NotificationKind` next to the product's code
   (`packages/sms/src/notifications.ts` is the example): `render(context)` re-reads the state
   (scoped by `context.organizationId`) and returns `{ skip: "why" }` when the news is stale by now
   (the step was done meanwhile, the review already decided), else the `EmailContent`. Links are
   `context.url("/<slug>/…")`. The footer (`reason`) defaults to "You're receiving this because
   you're an owner or admin of <org> on coss.com."
2. Recipients default to `organizationAdmins` (owners and admins with a verified, unbanned
   address, looked up at send time); pass `recipients(context)` for others.
3. Enqueue it in the deciding transaction with a `dedupeKey` that makes repeats impossible (the
   registration id; a day for a reminder that would otherwise repeat per number).
4. Add the product's kinds to `NOTIFICATION_KINDS` in the worker.
5. Test it with `recordingNotifier()` (`@coss/notifications/testing`) and `runDueNotifications({ now,
   scope })` — always pass `scope`.

Content is customer-facing: what the dashboard already shows (statuses, the carrier's rejection
reason), never admin notes, scores or secrets. Emails carrying secrets (sign-in links) don't belong
here: they are account emails, whose bodies are discarded once sent.

## Not moved yet

Reputation (`reputation_notification`), DMARC (`dmarc_notification`) and billing
(`billing_notification`) emails keep their own outbox tables and loops (same lease, backoff and age
rules); they render with `@coss/email-layout`. Moving them onto this outbox is a follow-up.

Settled rows are purged after `RETENTION_DAYS.notifications` (`purgeExpiredNotifications`, the
worker's `retention` loop); pending ones are kept.
