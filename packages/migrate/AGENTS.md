# packages/migrate — imports from other providers

Read together with the root `AGENTS.md` (conventions, tenancy rule, tests). Paths are from the
repository root.

Imports a customer's resources from Resend, SendGrid or Postmark into one environment, driven from the
dashboard only (`[envSlug]/import`; no public API, SDK or CLI).

- **Flow** (tables `migration` (ids `mig_`) and `migration_item` (`migitem_`)): the dashboard checks the key
  (`checkCredentials`, one or two cheap requests; charged to the `dashboard.migration_connections` bucket so
  coss.com can't be used to test stolen keys) and stores it (`connectMigration`, `inspecting`); the worker's
  `migrations` loop reads the inventory (`ready`); the customer chooses (`startMigration`, a compare-and-set
  to `queued`); the worker goes through the phases (`running` → `completed`/`failed`), or the customer cancels.
  **Domains are created by the dashboard's start action** (`importDomains`), never the worker: creating one
  creates an SES identity and tenants, which only the dashboard's IAM policy allows.
- **The provider's key** is encrypted with `WEBHOOK_SECRETS_KEY` (`encryptSecret`; `reencryptWebhookSecrets`
  covers `migration.credentials_ciphertext`) and deleted in the update that finishes or cancels the import;
  unstarted imports are purged after `RETENTION_DAYS.migrationDrafts`. Never log it or put it in `last_error`
  (`ProviderError` messages carry the provider's status and a short excerpt of its message only;
  `@coss/observability` masks `re_…`/`SG.…` keys and Postmark's token headers as a second line). Postmark
  server tokens read through an account token are fetched on every run and never stored.
- **Sources** (`src/sources/*.ts`, one `MigrationSource` per provider): fixed provider hosts (never customer
  input), `providerClient` (`src/http.ts`: spacing between requests — Resend's limit is shared with the
  customer's sending —, retries honoring `Retry-After`, a wait over 10 s becomes `rate_limited` with
  `retryAt` and the runner comes back then). SendGrid contacts come from an asynchronous export downloaded by
  `publicDownloader` (https, public addresses pinned, size-capped, gzip by magic bytes). 403/404 on a list a
  key can't read makes that kind unavailable, not the import.
- **Runner** (`runDueMigrations`, system-level): leases one import (`lease_until` bound from a JS `Date`, every
  write to the row fenced on it), works for `MIGRATION_STEP_MS` and comes back; suspended and deleting
  organizations are held. Every phase does at least one unit of work per call and calls `ctx.checkpoint(next)`
  after each one (an object, a batch, a page): it saves phase, cursor and counts together, so a failed step
  resumes from there without counting anything twice, and it throws `LeaseLost` once the import was canceled
  or taken over, which stops the phase before its next write (the products' writes run in their own
  transactions, so at most the unit in flight finishes after a cancel). Objects
  with a natural key (property key, topic key, audience name, template alias, endpoint URL, domain name) are
  recorded as a `pending` item **before** they are created, so a retry resolves them instead of creating them
  twice; what already exists is reported `existing` and never changed. An item an attempt finished but never
  checkpointed is counted when a retry meets it again, and a created template is recorded on its item before
  it is published, so a retry publishes it instead of taking it for the customer's own. Contacts and suppressions go through
  `importContacts`/`importSuppressions` (idempotent) and are only counted. A phase the key can't read or a
  plan limit fails that phase alone; a revoked key (401) fails the import.
- **Mappings**: event types in `src/mapping/events.ts` (an endpoint none of whose events map is skipped: an
  empty list would mean every event; imported endpoints are created **disabled**, with a new secret), names
  in `src/mapping/keys.ts`, suppressions per source (bounces/complaints `*`, broadcast-stream unsubscribes
  `stream:marketing`, unsubscribe groups → topic opt-outs for contacts, else a suppression for the topic's
  category). Templates (`./templates`, client-safe, `src/templates/*.ts`): converted to the template language;
  published only when `lossless`, otherwise left as a draft with warnings; variable renames (dot paths
  flattened) are reported, since sends must use the new names. The docs (`apps/site/content/docs/(start)/migrate/`)
  describe these mappings: change them together.
- **Tests**: `fakeSource(data)` + `cleanTemplate()` from `./testing` for runner tests (`createSource` is
  injected through `MigrationWorkerDeps`), a fake `fetch` for sources. Always pass `scope`.
