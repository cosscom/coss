# AGENTS.md — COSS monorepo

COSS is a unified developer platform: one API key + one SDK (`coss.email.send()`, later SMS, video,
scheduling…). This repo holds the dashboard, the public API, shared packages and the public SDK.
Email delivery goes through the provider interface in `packages/email/src/provider.ts` (Amazon SES v2 with one SES
tenant per organization, or the fake provider); sandbox environments always use the fake provider. Delivery events
drive per-recipient status and signed customer webhooks. Human setup docs (incl. running on SES): [README.md](./README.md).

## Layout

| Path | Package | What |
|---|---|---|
| `apps/web` | `@coss/web` | Next.js 16 dashboard (:3000). Hosts Better Auth at `/api/auth/*`. |
| `apps/api` | `@coss/api` | Hono on Bun public API (:3001): `/v1/*`, `/openapi.json`, `/health`. |
| `apps/worker` | `@coss/worker` | Bun background worker: webhook deliveries, domain re-checks, stale-claim sweep, SES events from SQS (`EMAIL_PROVIDER=ses`). `scripts/ses-bootstrap.ts`. Safe to run several. |
| `packages/db` | `@coss/db` | Drizzle schema (generated Better Auth tables + domain tables), pg client, TypeIDs, migrations, test guard. |
| `packages/auth` | `@coss/auth` | Better Auth options/instance (organization, admin, api-key, two-factor, passkey plugins), org permissions, slug rules. |
| `packages/tenancy` | `@coss/tenancy` | Projects, environments, environment-bound API keys (create/authenticate), memberships, seed/admin scripts, test fixtures. |
| `packages/email` | `@coss/email` | Email product: wire schemas, providers (fake, SES under `./ses`), send/dispatch/read, recipients + event ingestion, domains/DNS, tenants, sweeps; `./runtime` builds providers from env, `./env` (zod only), `./testing`. |
| `packages/webhooks` | `@coss/webhooks` | Product-agnostic webhooks: endpoints (encrypted secrets), outbox, SSRF-safe signed delivery with retries; `./schemas` (zod only). |
| `packages/ui` | `@coss/ui` | coss ui components (shadcn `@coss` registry, Base UI) + `globals.css`. |
| `packages/sdk` | `coss` | **Public** SDK. Zero deps, ESM-only, built with tsdown. |
| `tooling/typescript` | `@coss/tsconfig` | Shared tsconfig bases. |

Runtime dependencies: `db ← auth ← tenancy`, `db ← webhooks ← email`; `api → tenancy, email, webhooks, db`;
`web → auth, tenancy, email, webhooks, db, ui`; `worker → email, webhooks, db`; `sdk` and `ui` depend on no workspace.
Dev-only: `email`/`webhooks`/`worker → tenancy` (test fixtures — so tenancy must never import email or webhooks) and
`api`/`worker → coss` (SDK contract tests — turbo builds the SDK before their `typecheck`/`test`).

## Commands (repo root)

Prerequisites: Bun (version in `packageManager`), Node ≥ 24, Postgres with `coss` and `coss_test` databases.

```sh
bun install                 # never npm/pnpm/yarn
bun run dev                 # web :3000 + api :3001 + worker (turbo TUI; agents: bunx turbo run dev --ui=stream)
bun run lint                # biome ci .            bun run format → biome check --write .
bun run typecheck           # tsc --noEmit per workspace (TS 7); web runs `next typegen` first; builds the SDK first
bun run test                # migrates TEST_DATABASE_URL, then `bun test` in every workspace (uncached; SDK built first)
bun run build               # next build + SDK build (tsdown, publint, attw)
bun run db:generate         # drizzle-kit generate after editing packages/db/src/schema/*.ts (or after auth:generate)
bun run db:migrate          # apply migrations to DATABASE_URL (db:migrate:test → TEST_DATABASE_URL); db:studio
bun run auth:generate       # regenerate packages/db/src/schema/auth.ts after changing Better Auth plugins/options,
                            #   then bun run db:generate && bun run db:migrate
bun run db:seed             # idempotent demo data; mints a new development (coss_test_) key on every run
bun run admin:create --email you@example.com   # promote an existing user to platform admin (also how the
                                               #   first admin is bootstrapped in production)
AWS_REGION=… bun run ses:bootstrap             # idempotently create the shared SES/SNS/SQS/EventBridge resources,
                                               #   per-app IAM policies and (--alert-email) queue alarms, and
                                               #   print the SES env vars (needs AWS admin credentials)
```

Single package: `bun run --cwd <pkg> test [filter]` (after `bun run db:migrate:test` once). Don't run bare `bun test`
from the root or a package — the package script is what loads `.env` and the test-DB preload.

**Before committing**, run what CI (`.github/workflows/ci.yml`, Postgres 18, no `.env`) runs:
`bun run lint && bun run typecheck && bun run test && bun run build`.

## Conventions

- **Wire format is snake_case** (`reply_to`, `created_at`); internal code is camelCase. The SDK's wire types are
  hand-written mirrors (`packages/sdk/src/types/*.ts`), checked against the zod schemas by `apps/api/test/contract-types.ts`
  (typecheck) and `apps/api/test/sdk-contract.test.ts` (built SDK vs. the in-process app). Change both sides together.
- **IDs are TypeIDs** stored as `text` (`<prefix>_<26-char base32 UUIDv7>`, e.g. `email_01k…`). Prefixes live in
  `ID_PREFIXES` (`packages/db/src/id.ts`; Better Auth's `invitation` → `invite`, `apikey` → `key`). Use
  `newId(ID_PREFIXES.x)` / `isId()` from `@coss/db/id`. Domain tables generate ids app-side (`$defaultFn`), so raw SQL
  inserts must supply one. Better Auth uses `generateAuthId` (`MODEL_ID_PREFIX` in `packages/auth/src/options.ts`) —
  a new Better Auth model needs an entry there or it falls back to `id_…`.
- Internal packages are **just-in-time TypeScript** (`exports` point at `.ts`, no build). Relative imports use explicit
  `.ts` extensions in `packages/*` and `apps/api`; `apps/web` uses extensionless imports and the `@/*` alias;
  `packages/ui` imports itself via `@coss/ui/*` (shadcn aliases). A new internal package used by the dashboard must be
  added to `transpilePackages` in `apps/web/next.config.ts`.
- Every workspace declares every dependency it imports or extends (Bun isolated linker). Versions shared by several
  workspaces live in the root `workspaces.catalog` (`"catalog:"`); single-use deps may pin directly. The SDK uses explicit
  versions mirroring the catalog (no `workspace:`/`catalog:`) — bump both together.
- Env: one root `.env` (copy `.env.example`). Package scripts load it with `--env-file=../../.env` (a missing file is a
  no-op, so real env vars win in CI/production); `process.loadEnvFile` loads it for Next (`apps/web/load-root-env.ts`,
  imported first by `next.config.ts`) and drizzle-kit (`packages/db/drizzle.config.ts`). Packages don't validate env but
  **read it at import time** (`@coss/db` builds its pool from `DATABASE_URL`; `@coss/auth/options` reads `BETTER_AUTH_*`),
  so load env before importing them. Apps validate with t3-env (`apps/api/src/env.ts` — imported only by `src/index.ts`;
  `apps/web/src/env.ts` — imported by `next.config.ts`).
- Library docs matching the installed versions live in the consuming workspace's `node_modules` (isolated linker):
  Next `apps/web/node_modules/next/dist/docs/` (see `apps/web/AGENTS.md`), Base UI
  `packages/ui/node_modules/@base-ui/react/docs/`, Turborepo `node_modules/turbo/docs/` (block at the end of this file).
  Read them before relying on memory.

## Environment variables

| Var | Used by |
|---|---|
| `DATABASE_URL` | `@coss/db` pool, drizzle-kit, migrations; validated by api + web |
| `TEST_DATABASE_URL` | must name a `*_test` database; swapped in by `@coss/db/testing`; `db:migrate:test` |
| `DATABASE_POOL_MAX` | optional pg pool size (default 10) |
| `BETTER_AUTH_SECRET` (≥ 32 chars), `BETTER_AUTH_URL` | `packages/auth/src/options.ts` (base URL, trusted origin, invitation links) |
| `API_PORT`, `API_PUBLIC_URL` | `apps/api` (port; OpenAPI `servers`, falls back to the request origin) |
| `NEXT_PUBLIC_API_URL` | `apps/web` (quick-start snippets) |
| `EMAIL_PROVIDER` | api, web, worker: provider for live environments (`fake` or `ses`); shape in `@coss/email/env` |
| `AWS_REGION`, `SES_CONFIGURATION_SET`, `SES_TENANT_PREFIX` | required with `EMAIL_PROVIDER=ses` (api, web, worker); printed by `ses:bootstrap`. AWS credentials come from the default chain (`globalPassThroughEnv` in `turbo.json`) |
| `SES_EVENTS_QUEUE_URL` | worker with `EMAIL_PROVIDER=ses`: the SQS queue of SES events |
| `WEBHOOK_SECRETS_KEY` | api + web + worker: 32 bytes base64, encrypts endpoint signing secrets (losing it makes them unreadable) |
| `NODE_ENV`, `SKIP_ENV_VALIDATION` | `production` makes dev auth emails and the seed refuse to run; the latter skips t3-env |
| `SEED_PASSWORD` | `db:seed` demo password (only when the user is first created) |
| `COSS_API_KEY`, `COSS_BASE_URL` | SDK defaults / `packages/sdk/examples` only (the example also reads `COSS_FROM`, `COSS_TO`) |

Adding one: `.env.example`, the app's t3-env schema (`NEXT_PUBLIC_*` also in `experimental__runtimeEnv`), **`turbo.json`
`globalEnv`** (strict env mode drops undeclared vars from tasks — CI has no `.env`), and `ci.yml` if CI needs it.

## Public API (`apps/api`)

- `createApp(opts)` (`src/app.ts`) is side-effect free; services are injected via `CreateAppOptions` and `src/index.ts`
  wires env (`webhookDeps` is required — a throwaway secrets key would make the endpoints it creates
  undeliverable; `emailService`/`domainDeps` default to the fake provider). Middleware order: request id → `secureHeaders` → `bodyLimit` (5 MB) → `logger` (off under test). Every
  response carries a server-generated `X-Request-Id: req_…` (client values are ignored).
- Errors are always the envelope `{ error: { type, code, message, param?, issues?, request_id } }`, built only by
  `errorResponse` (`src/errors.ts`). Throw `new ApiError(status, { type, code, message, param? })` with `type` from
  `ERROR_TYPES`, or a product error mapped in `toApiError`; anything else is logged and returned as a generic 500. Never
  hand-build error JSON.
- New endpoint: `createRoute({ …, security: [{ bearerAuth: [] }], middleware: requireApiKey({ <product>: ["<action>"] }) })`
  + `router.openapi(route, handler)`, mounted in `createV1Router` (`src/routes/v1.ts`). Auth goes in `middleware` so it
  runs before validation (401 beats 422). Tenancy comes only from `c.var.auth` — environment-scoped resources filter by
  `environmentId`, organization-scoped ones (domains) only by `organizationId`. Document responses with
  `jsonDoc`/`errorDoc`/`commonErrors` (`src/routes/docs.ts`). The root `validationHook` turns zod failures into 422 + `issues`;
  a per-route hook must end with `validationHook(result)`. `test/app.test.ts` asserts the exact OpenAPI path list.

## SDK (`packages/sdk`, published as `coss`)

- `Coss` (`src/client.ts`) → one `HttpClient` (`src/core/http.ts`: bearer auth, JSON, per-attempt timeout, retries on
  network/timeout/409/429/5xx honoring `Retry-After`, an `Idempotency-Key` on every POST reused across retries) → one
  resource per product or managed resource (`src/resources/*.ts`: `email`, `domains`, `webhookEndpoints`;
  sub-resources hang off their product, e.g. `coss.email.suppressions`). Methods return `{ data, error }` and never
  throw for API/network failures. Webhook endpoint creation disables
  automatic retries because the API does not deduplicate it, even with an `Idempotency-Key`.
- Must run unchanged on Node, Bun, Deno and Workers: no `node:*`, no `Bun.*`, only guarded `globalThis.process`
  access, zero runtime deps. `isolatedDeclarations` is on (exported functions need explicit types).
- Error types are listed in three places: `ERROR_TYPES` (`apps/api/src/errors.ts`) and `CossErrorType` +
  `API_ERROR_TYPES` (`packages/sdk/src/core/errors.ts`).
- The api contract tests import the SDK's built `dist`: turbo builds it first, but outside turbo run
  `bun run --cwd packages/sdk build` before api typecheck/tests. `src/version.ts` must equal `package.json` `version`.
- `verifyWebhook` (`src/webhooks.ts`, Web Crypto only) is the one SDK function that throws (`WebhookVerificationError`):
  a failed signature check must not be ignorable. The event body's wire types live in `src/types/webhook.ts`; endpoint
  management's in `src/types/webhook-endpoint.ts`.
- **Never publish**: the `coss` npm name is currently owned by a third party (see `packages/sdk/README.md`).

## Dashboard (`apps/web`)

- Pages use the generated `PageProps<"/…">`/`LayoutProps` globals and `await params`. Call `requireOrgMember(orgSlug)`
  (`src/lib/session.ts`; non-members get a 404) and gate controls with `orgRoleCan(member.role, …)`. Read data straight
  from `@coss/tenancy` / `@coss/email` (the dashboard never calls the public API). Server code uses `auth` from
  `@/lib/auth`; client code uses `authClient` from `@/lib/auth-client`.
- Mutations live in a colocated `actions.ts` (`"use server"`): `(prev: ActionResult<T> | null, formData) => runAction(…)`
  (`src/lib/actions.ts`). Start with `requireOrgPermission(formString(formData, "orgSlug"), {…})`, re-check that target
  ids belong to that org (`getKeyBinding`, `getOrganizationMember`, `getPendingInvitation`, `getDomain`,
  `getWebhookEndpoint` + its `environmentId`), `refresh()` after writes.
  Throw `ActionError` for user-facing messages. Clients use `useActionState(action, null)` + `<FormError>`. Hidden inputs carry slugs/ids only.
- coss ui is **Base UI, not Radix**: compose with `render` (`<DialogTrigger render={<Button />}>`), never `asChild`.
  A `<form>` inside `DialogPopup`/`AlertDialogPopup` needs `className="contents"` (otherwise the footer renders outside the
  popup). Popups unmount on close. Add components with `bunx shadcn@latest add @coss/<name>` from `packages/ui`;
  dashboard-specific compositions go in `apps/web/src/components`.
- Routes: a new top-level segment must be added to `RESERVED_ORG_SLUGS` (`packages/auth/src/slugs.ts`), a new static
  segment under `[orgSlug]` to the allow-list in `apps/web/test/reserved-slugs.test.ts`, signed-out pages to
  `PUBLIC_PATH_PREFIXES` (`src/proxy.ts`).
- Domain management uses `emailRuntime().domainDeps` (`src/lib/email-runtime.ts`) and webhook management
  `webhookManagementDeps()` (`src/lib/webhooks.ts`); domain/webhook errors carry user-facing messages. Revealing a
  webhook secret needs `webhook:update` (members can read endpoints but never see secrets).
- When driving the dashboard in a browser, wait for hydration before typing or submitting.

## Tests

- `bun:test`. DB-backed suites (`apps/api`, `apps/worker`, `packages/email`, `packages/tenancy`, `packages/webhooks`) preload `test/setup.ts` via their
  `bunfig.toml` → `@coss/db/testing`, which throws unless `TEST_DATABASE_URL` names a `*_test` database, then points
  `DATABASE_URL` at it. Other suites are DB-free; before adding DB tests elsewhere copy `packages/email/bunfig.toml` +
  `test/setup.ts`, or the tests hit the dev database.
- Tests never truncate; every test creates its own uniquely named fixtures: `createTestTenant()` (owner, org, project,
  `production`/`development`, `liveKey`/`sandboxKey`), `createTestUser()`, `addMember()` from `@coss/tenancy/testing`;
  `uniqueSuffix()` from `@coss/db/testing`. API: `createTestApp()` + `errorOf(res)` (`apps/api/test/helpers.ts`). Email:
  `FakeEmailProvider({ log: false, fail })`, `gatedProvider()` for races, `createVerifiedDomain(orgId)` (live sends need
  one), `FakeSesApi`, `fakeDnsResolver()` from `@coss/email/testing`. Webhooks: `webhookReceiver()` (local server),
  `testSender()`, `testManagementDeps` from `@coss/webhooks/testing`. Worker-style scans take `scope: { organizationIds }`
  and `now` — always pass `scope` in tests (the test DB is shared and never truncated). Session-bound Better Auth calls: sign in with
  `auth.api.signInEmail({ returnHeaders: true })` and forward the cookie (`packages/tenancy/test/hardening.test.ts`).

## Recipes

**Add a table:** add a prefix to `ID_PREFIXES`; define the table in `packages/db/src/schema/domain.ts` with a `text` id
(`$defaultFn(() => newId(ID_PREFIXES.x))`), `organization_id NOT NULL`, a composite FK `(parent_id, organization_id) →
parent(id, organization_id)` and the `createdAt()`/`updatedAt()` helpers (history tables must not FK `apikey` — Better
Auth hard-deletes keys); `bun run db:generate`, review and commit the SQL + `migrations/meta/`, `bun run db:migrate`.
Never edit an applied migration; do renames as a separate step (drizzle-kit prompts interactively).

**Add a product** (e.g. `sms`):
1. Tables + ID prefix (above).
2. `packages/<product>`: `src/schemas.ts` (zod `strictObject`, snake_case, `.meta({ id })`, no DB imports, exported as
   `./schemas`), provider interface + fake provider, a service taking the authenticated environment, an error class with
   statuses, `bunfig.toml` + `test/setup.ts` preload.
3. Permissions: add the resource to `orgStatements` and the roles (`packages/auth/src/permissions.ts`) and to
   `API_KEY_PERMISSIONS` (`packages/auth/src/constants.ts`, the api-key plugin's `defaultPermissions`). Permissions are
   stored per key at creation, so existing keys need an `apikey.permissions` backfill (`drizzle-kit generate --custom`,
   as in migrations `0004` and `0006`) or they get 403.
4. API: `src/routes/<resource>.ts` mounted in `routes/v1.ts`, service injected via `createApp` options, error class
   mapped in `toApiError`, OpenAPI path list in `test/app.test.ts` updated.
5. SDK: types, resource, `Coss` property, `src/index.ts` exports, unit tests; extend `contract-types.ts` +
   `sdk-contract.test.ts`.
6. Dashboard: dependency + `transpilePackages`; pages under `[orgSlug]/projects/[projectSlug]/[envSlug]/`.
7. Events/webhooks: record events in the product's own table and call `enqueueWebhookMessage(tx, …)` from
   `@coss/webhooks` in the same transaction; add the payload zod schema + SDK type + contract assertion.

## Generated / managed files — don't hand-edit

- `packages/db/src/schema/auth.ts` (`bun run auth:generate`) and `packages/db/migrations/**` (`bun run db:generate`).
- `packages/sdk/package.json` `exports`/`main`/`module`/`types` (rewritten by the SDK build — commit the result).
- `packages/ui/src/{components,hooks,lib}`: vendored from the `@coss` registry and excluded from Biome; re-adding a
  component overwrites local edits.
- `bun.lock` (only via `bun install`; CI uses `--frozen-lockfile`).
- The `<!-- BEGIN:*-agent-rules -->` blocks at the end of this file and in `apps/web/AGENTS.md` are rewritten by `turbo`
  and `next dev`: never edit inside them, keep project text above them, and commit tool changes to them.
- Agent docs: `AGENTS.md` files are the source of truth; each `CLAUDE.md` contains only `@AGENTS.md`. A new nested
  `AGENTS.md` needs a sibling `CLAUDE.md` shim, or Claude Code never sees it.

## Guardrails (verified against the versions in the root catalog — re-verify a bullet when bumping that library)

- **Runtimes:** Next.js and the `auth` / `drizzle-kit` CLIs run on **Node**; the API, scripts and tests run on Bun.
  Shared package `src/` must not use `Bun.*` or `bun:*` (tests may use `bun:test`) — use `pg` /
  `drizzle-orm/node-postgres` and `node:crypto`. Never `next --bun`, never `[run] bun = true` in bunfig.
- **TypeScript 7** (native, no JS API): `types` defaults to `[]` (list `["bun"]`/`["node"]`); `baseUrl` and
  `moduleResolution: node` are errors. VS Code needs the "TypeScript (Native Preview)" extension.
- **Next 16:** middleware is `src/proxy.ts`; request APIs and `params` are async; no `next lint`; keep `cacheComponents`
  off. Next doesn't edit tsconfigs that use `extends` — keep the manual `next` plugin + `.next/types` includes.
- **Drizzle 0.x** (see catalog): the drizzle.team docs default to v1 — don't use `defineRelations`, `drizzle-orm/zod`,
  `getColumns` until the catalog moves to 1.x.
- **Biome** is pinned exactly; keep the `$schema` URL in `biome.json` and `apps/web/biome.json` in step with it.
- **Better Auth:** `better-auth`, `@better-auth/core`, `@better-auth/api-key`, `@better-auth/passkey` and `auth` (CLI)
  stay on one identical exact version (catalog) — bump them together.
  - The api-key plugin is `@better-auth/api-key` (not `better-auth/plugins`). Keys are org-owned
    (`references: "organization"`); `referenceId` has **no FK**. Deliberate settings: built-in rate limit off
    (`rateLimit: { enabled: false }`), `enableMetadata: false` (the environment binding lives only in
    `environment_api_key`; metadata is client-writable),
    `defaultPermissions: { email: ["send", "read"], suppression: ["create", "read", "delete"] }`, prefixes
    `coss_live_` / `coss_test_` by environment mode (`API_KEY_PREFIX`), key format `/^coss_(live|test)_[A-Za-z]{64}$/`.
  - Keys are created only by `createEnvironmentApiKey` (server-side, no headers) and authenticated only by
    `authenticateApiKey`; keys without an `environment_api_key` binding fail closed. Revocation: `getKeyBinding`
    ownership check, then `auth.api.deleteApiKey` with session headers.
  - `disabledPaths` blocks the HTTP routes `/api-key/{create,update,get,list,delete}`, `/organization/update` and
    `/admin/remove-user` (server-side `auth.api.*` still works). Never re-enable them to "simplify" things.
  - `organizationHooks` validate org slugs on create/update, only allow canonical roles (`INVITABLE_ORG_ROLES`,
    `isOrgRole`) and only cancel `pending` invitations (Better Auth would rewrite accepted ones); `orgRoleCan` matches
    role names exactly, like Better Auth (no trimming). `assignableOrgRoles` mirrors Better Auth's update-member-role
    rules (only owners change owners or grant owner; Better Auth alone enforces "the last owner can't step down").
  - Password reset: `sendResetPassword` emails Better Auth's `/api/auth/reset-password/:token` link, which redirects to
    the dashboard's `/reset-password?token=…` (the client passes `redirectTo`); `revokeSessionsOnPasswordReset: true`.
  - Org roles spread `ownerAc.statements` / `adminAc.statements` / `memberAc.statements` (custom roles replace defaults).
  - `requireEmailVerificationOnInvitation: true` must stay on (custom ids make invitation ids predictable).
  - Never add NOT NULL columns to Better Auth tables (runtime schema validation rejects every auth request).
  - **Two-factor / passkeys:** TOTP + backup codes only (no email/SMS OTP). The challenge only guards password sign-in
    (`/sign-in/email`), so nothing else may create a session for a password user: `autoSignInAfterVerification` stays
    `false`. Passkey sign-in skips TOTP, so `assertUserVerified` (both `afterVerification` hooks) rejects ceremonies
    without user verification — the plugin itself passes `requireUserVerification: false`. Passkey `rpID`/`origin`
    come from `BETTER_AUTH_URL` (changing its host invalidates every passkey). The `hooks.before` guard refuses
    `FACTOR_MANAGEMENT_PATHS` to impersonation sessions; add new factor-changing endpoints there.
  - **2FA enforcement:** `organization.requireTwoFactor` (additional field, `input: false`; written only by
    `setOrganizationTwoFactorRequired`, which needs `organization:update` and an actor with 2FA). `requireOrgMember`
    redirects members without `user.twoFactorEnabled` to `/settings` — passkeys don't satisfy it (the password still
    works without a code). API keys are unaffected.
  - `packages/auth` must not import `next/*` or `"server-only"` (the `auth` CLI loads `src/auth.ts` on Node).
    `nextCookies()` is appended last, only in `apps/web/src/lib/auth.ts`.
- **Tenancy rule:** every tenancy/email/webhooks function that touches tenant data takes `organizationId` and scopes its
  SQL by it; writes derive org/project from the environment row. Only `getMembership` (by slug), `authenticateApiKey`
  (from the key's binding), the platform-level `promoteToAdmin` and `resetUserTwoFactor` (admin recovery), and these system-level functions resolve the org
  themselves (scoping every write by the row's own org): `recordProviderEvent`/`ingestProviderEvents` (from the email
  id tag), `applyTenantStatus` (prefix-checked tenant name), `authorizeLiveSender` (reads domain names across orgs),
  and the worker scans `runDueWebhookDeliveries`, `recheckDueDomains`, `sweepStaleClaims`. Server actions take only slugs +
  target ids and derive the org from `requireOrgPermission`; every Better Auth organization call passes `organizationId`
  explicitly (never rely on `session.activeOrganizationId`).
- **Client-safe modules** never import `@coss/db`: `@coss/auth/{permissions,slugs,constants}`, `@coss/email/schemas`,
  `@coss/email/env`, `@coss/ui/*`. `@coss/webhooks` and `@coss/email/{runtime,ses}` are server-only. Server-only web
  modules start with `import "server-only"`.
- **SES:** only the `coss_email_id` tag is ever set on SES messages — never forward customer tags (events are mapped
  back by that tag, and ingestion also checks provider + message id). `SendEmail` is not idempotent: the SES client has
  `maxAttempts: 1` and only throttling is retried. Never adopt an existing SES identity held by another tenant
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
- **Webhooks:** deliver only through `createWebhookSender` (every resolved address must be public; the socket is pinned
  to the checked address; no redirects; 10 s timeout; 1 KB response excerpt). `allowPrivateNetworks`/insecure URLs are
  for non-production only. Payloads never include bodies, headers, cc or bcc. Secrets are AES-256-GCM encrypted with
  `WEBHOOK_SECRETS_KEY`.
- **Live keys** (`coss_live_`) require a verified email and can't be created while impersonating (`liveKeyRestriction`,
  `apps/web/src/lib/live-keys.ts`, enforced in the action and mirrored in the UI).
- **Email preview iframe** (`…/emails/[emailId]/page.tsx`): `sandbox=""`, `referrerPolicy="no-referrer"`, CSP
  `PREVIEW_HEAD` prepended to `srcDoc`. Never add `allow-scripts` or `allow-same-origin`.
- **Dev-only auth emails:** `logDevEmail` (`packages/auth/src/options.ts`) prints verification/invitation/password-reset
  links to the server console (the dashboard's, as `[auth] …` lines) and throws whenever `NODE_ENV=production`.

## Local dev

- Postgres.app: `createdb coss && createdb coss_test`; URLs like `postgres://<macOS user>@localhost:5432/coss` (no
  password — the `postgres:postgres` form in `.env.example` is CI's).
- `bun run db:migrate && bun run db:seed`, then sign in at http://localhost:3000 as `demo@coss.local` /
  `coss-demo-password` (platform admin; org `acme` with the verified fake domain `acme.test`, project `default`).
  Each seed run prints a new `COSS_API_KEY`.
- Send with `COSS_API_KEY=… COSS_BASE_URL=http://localhost:3001 bun packages/sdk/examples/send-email.ts` (live keys:
  add `COSS_FROM=hello@acme.test`; `COSS_TO=bounce@simulator.amazonses.com` simulates a bounce). Webhook endpoints
  may be `http://127.0.0.1:…` locally; the worker (part of `bun run dev`) delivers them.

## Known limitations (v0)

- Sends are synchronous. If the process dies after `dispatch` claims an email, the row stays `queued` until the
  worker's stale-claim sweep (15 min) marks it `sent` (if SES reported it) or `failed`/`dispatch_interrupted` (a late
  SES `Send` event still repairs it); until then retries with the same `Idempotency-Key` get 409 `request_in_progress`.
- Webhook deliveries are not ordered (use `data.occurred_at`; SES itself may publish a complaint before the
  delivery). SES complaints may list every recipient on the complaining domain (and each of them gets suppressed).
  SES never suppresses mailbox-simulator addresses, and with tenant-level suppression `suppressionlist@simulator.amazonses.com` is a plain hard bounce — only
  the fake provider simulates `suppressed` (via that address). Webhook secret rotation and key rotation for `WEBHOOK_SECRETS_KEY` are not built.
- Better Auth's key verification writes to the `apikey` row on every request (swap in a read-only verifier when it matters).
- Accepted: sign-up email enumeration; an admin ban does not cut off an org's API keys; org deletion is disabled.

**Not built yet** (don't assume these exist; delete a line when it ships): open/click tracking (and custom tracking
domains), bulk suppression import/export, attachments/batch/scheduled sends, webhook delivery logs over the API,
rate limiting, async dispatch, org settings,
removing members / leaving an org, resending invitations, signed-in password change, email/SMS two-factor codes,
"trust this device" for 2FA, renaming passkeys, API version header, OpenAPI docs
UI, release tooling.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
