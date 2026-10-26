# packages/tenancy — organization and account deletion

Read together with the root `AGENTS.md` (conventions, tenancy rule, tests). Paths are from the
repository root.

- **Organization deletion** (`packages/tenancy/src/deletion.ts`, table `organization_deletion`, ids `orgdel_`; no
  FKs, names copied, so it outlives the organization as the record): Better Auth's own delete stays off
  (`disableOrganizationDeletion: true`) — it would drop the row without any teardown. `requestOrganizationDeletion`
  (owners from settings, `organization:delete`, typed slug, not while suspended or impersonating; admins via
  `deleteOrganizationAsAdmin`, audited, suspended included) inserts the row and runs `revokeOrganizationAccess` in
  one transaction: API keys and SCIM tokens (no FK to the org), the SSO provider with its linked accounts and the sessions it
  created, invitations and members. From then on scheduled sends never dispatch (`organizationActive` in the
  email service), webhook and log drain deliveries are held, and the Better Auth org hooks / `resolveSsoUser` refuse it. The
  worker's `organization-deletions` loop (`runDueOrganizationDeletions`, leased, 1 → 60 min backoff, never gives up)
  claims one request at a time, heartbeats during provider cleanup and renews under a claim row lock for every
  data batch (attempt-count ownership checks fence out stale workers). It repeats the revocation, calls `releaseProviderResources` (`releaseOrganizationEmailResources`: domains to
  `deleting`, the received emails' content store (`orgs/<org>/` in S3), DMARC reports (in batches, before their domains), tracking hostnames, identities, domain rows, the dedicated IP pool (before the tenant: SES won't delete a configuration set still associated with one), then the SES tenant via `DeleteTenant`, prefix-checked), deletes bulky data
  (including SCIM directory records, environment logs, received emails, log drain records/batches and the org audit log) in batches of `DELETION_BATCH_SIZE` along indexed columns, then deletes the organization row
  (cascading the rest) and marks the row `completed` in one transaction. A new table with a lot of rows per
  organization belongs in `deleteOrganizationData`; anything held outside Postgres (a new provider resource)
  belongs in `releaseProviderResources`. Admin audit events are kept (no FKs).
- **Account deletion** (`packages/tenancy/src/account-deletion.ts`; users delete their own account from
  `/settings` or the iOS app, both through `deleteAccount` in `apps/web/src/lib/account-deletion.ts`, which adds
  the open-invoice check tenancy can't see and the audit events): `planAccountDeletion` sorts the user's
  memberships into organizations deleted with the account (they're the only member;
  `requestOrganizationDeletion`), organizations they leave, and blockers (the only owner of an organization with
  other members, a suspended organization, a platform admin). `deleteUserAccount` re-plans under row locks (the
  user, then their organizations in id order) and, in one transaction, deletes their personal API keys (the
  `environment_api_key.owner_user_id` cascade would leave them unbound), hands SSO providers they registered to
  another owner (`sso_provider.user_id` cascades) and deletes the `user` row, which cascades sessions, accounts,
  memberships, passkeys, two-factor, push devices, SCIM records and their invitations. Banned users are refused
  (a deleted mailbox may sign up again). Org audit events and admin audit events keep the copied email.
