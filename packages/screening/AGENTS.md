# packages/screening — content screening

Read together with the root `AGENTS.md` (conventions, tenancy rule, tests). Paths are from the
repository root.

- **Content screening** (`packages/screening`, tables `content_screening` (ids `scr_`) + `content_screening_counter`):
  `screenMessage` runs in the worker for **live** messages only, inside `complete()` right before `provider.send` (after
  the claim, so the stale-claim sweep covers a crash) — the `screen` option of `createEmailService`, wired only by the
  worker. A product passes `product` + `subjectId` + a lazy `content()` (plain text, `prepareText`/`prepareLinks`:
  truncated to 8,000 chars, link hosts+paths without query strings); the screening package never imports a product, so
  SMS reuses it as is. Sampling (`ReputationPolicy.contentScreening`, per-org overrides in the admin `PolicyForm`): the
  first `alwaysFirst`, the `milestones`, then `sampleRate` at random — never make it fully predictable. The position
  comes from one `INSERT … ON CONFLICT … RETURNING new.seen, old.owed` (Postgres 18). Classifier errors/timeouts
  (3 s) record an `error` verdict. Enforced screening **holds** that email: the claim is given back (`provider` NULL,
  `error_code = 'content_screening_unavailable'` as the marker) and it is dispatched again in
  `SCREENING_RETRY_DELAY_S`, its retry screened again at its old position (`retry`, never counted twice), until it is
  sent or the unclaimed sweep fails it `content_screening_unavailable` an hour after it was due (`UNCLAIMED_FAIL_MS`,
  from `scheduled_at` for scheduled sends) — an unscreened sample is never sent. Shadow mode and coss.com's own
  notification organization send it and owe the sample to the next message, once (an owed or retried sample that
  fails passes nothing on, so an outage doesn't put every message through the classifier). An unexpected `screen`
  throw follows the same default-deny rule (held), with that notification organization as the only allowlist entry.
  Highest category score ≥ `blockThreshold` → `blocked`: the email fails `content_rejected` and
  `suspendOrganization(trigger "content_screening")` in the verdict's transaction; ≥ `flagThreshold` → `flagged`
  (sent, `markReputationDue`); `contentScreeningCheck` turns enforced verdicts in the window into `suspend`/`warning`.
  `enforce: false` is shadow mode (record only); `enabled: false` screens nothing. Verdict rows never store content;
  scores are admin-only (customers see `content_rejected` and the standing, never an oracle). The AI adapter asks one
  boolean question per category with `experimental_decide` (renamed from `experimental_evaluate`), passes the message
  as JSON state with "untrusted data" in every instruction, and always requests Gateway `zeroDataRetention`.
