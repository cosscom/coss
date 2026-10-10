# AGENTS.md — COSS monorepo

COSS is a unified developer platform: one API key + one SDK (`coss.email.send()`, later SMS, video,
scheduling…). This repo holds the dashboard, the public API, shared packages and the public SDK.
Email delivery goes through the provider interface in `packages/email/src/provider.ts` (Amazon SES v2 with one SES
tenant per organization, or the fake provider); sandbox environments always use the fake provider. Delivery events
drive per-recipient status and signed customer webhooks. Rate limits (per API key, per-org send quotas, dashboard
auth) are counted in Valkey (ElastiCache Serverless in production) by `@coss/ratelimit`. Human setup docs (incl. running on SES): [README.md](./README.md).

## Layout

| Path | Package | What |
|---|---|---|
| `apps/web` | `@coss/web` | Next.js 16 dashboard (:3000). Hosts Better Auth at `/api/auth/*`. |
| `apps/api` | `@coss/api` | Hono on Bun public API (:3001): `/v1/*`, `/openapi.json`, `/health`. Commits its OpenAPI document as `openapi.json`. |
| `apps/site` | `@coss/site` | coss.com (:3002): placeholder landing page + Fumadocs docs at `/docs` (guides, Twoslash-checked SDK docs, API reference generated from `apps/api/openapi.json`). See `apps/site/AGENTS.md`. |
| `apps/worker` | `@coss/worker` | Bun background worker: email dispatch (pg-boss), webhook deliveries, domain re-checks, stale-claim/unclaimed sweeps, SES events from SQS (`EMAIL_PROVIDER=ses`). `scripts/ses-bootstrap.ts`. Safe to run several. |
| `packages/db` | `@coss/db` | Drizzle schema (generated Better Auth tables + domain tables), pg client, TypeIDs, migrations, test guard; `./jobs` (pg-boss). |
| `packages/auth` | `@coss/auth` | Better Auth options/instance (organization, admin, api-key plugins), org permissions, slug rules. |
| `packages/tenancy` | `@coss/tenancy` | Projects, environments, environment-bound API keys (create/authenticate), memberships, seed/admin scripts, test fixtures. |
| `packages/email` | `@coss/email` | Email product: wire schemas, providers (fake, SES under `./ses`), send/dispatch/read, recipients + event ingestion, domains/DNS, tenants, sweeps; `./dispatch` (pg-boss queue + worker handler), `./runtime` builds providers from env, `./env` (zod only), `./testing`. |
| `packages/ratelimit` | `@coss/ratelimit` | Rate limits: bucket catalog, GCRA in Valkey (Lua) or memory, per-org overrides (`rate_limit_override`), client IP resolution; `./env` (zod only), `./testing`. `scripts/valkey-bootstrap.ts`, `scripts/set-override.ts`. |
| `packages/webhooks` | `@coss/webhooks` | Product-agnostic webhooks: endpoints (encrypted secrets), outbox, SSRF-safe signed delivery with retries; `./schemas` (zod only). |
| `packages/ui` | `@coss/ui` | coss ui components (shadcn `@coss` registry, Base UI) + `theme.css` (tokens) and `globals.css` (the dashboard's stylesheet). |
| `packages/sdk` | `coss` | **Public** SDK. Zero deps, ESM-only, built with tsdown. |
| `tooling/typescript` | `@coss/tsconfig` | Shared tsconfig bases. |
| `infra` | `@coss/infra` | AWS deployment spec (ECS services, env vars, ALB rules, CloudFront behaviours), checked by tests; nothing here calls AWS. See `infra/AGENTS.md`. |

Runtime dependencies: `db ← auth ← tenancy`, `db ← webhooks ← email`, `db ← ratelimit`; `api → tenancy, email, webhooks, ratelimit, db`;
`web → auth, tenancy, email, webhooks, ratelimit, db, ui`; `site → ui, auth` (only the client-safe `@coss/auth/slugs`) +
`@coss/api/openapi.json` (data only, never api code); `infra → auth, email, ratelimit` (`slugs`, `env` only);
`worker → email, webhooks, ratelimit, db`; `sdk` and `ui` depend on no workspace.
Dev-only: `email`/`webhooks`/`ratelimit`/`worker → tenancy` (test fixtures — so tenancy must never import email, webhooks or ratelimit) and
`api`/`worker`/`site → coss` (SDK contract tests and the docs' Twoslash snippets — turbo builds the SDK before their
`typecheck`/`test`, and before the site's `dev`/`build`).

## Commands (repo root)

Prerequisites: Bun (version in `packageManager`), Node ≥ 24, Postgres with `coss` and `coss_test` databases,
Valkey (or Redis) at `TEST_VALKEY_URL` for the ratelimit/api tests.

```sh
bun install                 # never npm/pnpm/yarn
bun run dev                 # web :3000 + api :3001 + site :3002 + worker (turbo TUI; agents: bunx turbo run dev --ui=stream)
bun run lint                # biome ci .            bun run format → biome check --write .
bun run typecheck           # tsc --noEmit per workspace (TS 7); web runs `next typegen` first; builds the SDK first
bun run test                # migrates TEST_DATABASE_URL, then `bun test` in every workspace (uncached; SDK built first)
bun run build               # next build + SDK build (tsdown, publint, attw)
bun run db:generate         # drizzle-kit generate after editing packages/db/src/schema/*.ts (or after auth:generate)
bun run db:migrate          # apply migrations + install/upgrade the pg-boss schema on DATABASE_URL
                            #   (db:migrate:test → TEST_DATABASE_URL); db:studio
bun run auth:generate       # regenerate packages/db/src/schema/auth.ts after changing Better Auth plugins/options,
                            #   then bun run db:generate && bun run db:migrate
bun run openapi:generate    # rewrite apps/api/openapi.json after changing API routes (a test fails when stale)
bun run db:seed             # idempotent demo data; mints a new development (coss_test_) key on every run
bun run admin:create --email you@example.com   # promote an existing user to platform admin (also how the
                                               #   first admin is bootstrapped in production)
AWS_REGION=… bun run ses:bootstrap             # idempotently create the shared SES/SNS/SQS/EventBridge resources,
                                               #   per-app IAM policies and (--alert-email) queue alarms, and
                                               #   print the SES env vars (needs AWS admin credentials)
AWS_REGION=… bun run valkey:bootstrap --subnet-ids … --security-group-ids …
                                               # idempotently create the ElastiCache Serverless (Valkey)
                                               #   cache, its user + user group; prints VALKEY_URL
bun run ratelimit:set --org acme [--bucket api.read --limit 100 [--period 1s] [--burst 200] | --reset]
                                               # show/change an org's rate limit overrides (~1 min to apply)
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
  no-op, so real env vars win in CI/production; images never contain one, see `.dockerignore`); `process.loadEnvFile` loads it for Next (`apps/web/load-root-env.ts`,
  imported first by `next.config.ts`) and drizzle-kit (`packages/db/drizzle.config.ts`). Packages don't validate env but
  **read it at import time** (`@coss/db` builds its pool from `DATABASE_URL`; `@coss/auth/options` reads `BETTER_AUTH_*`),
  so load env before importing them. Apps validate with t3-env (`apps/api/src/env.ts` — imported only by `src/index.ts`;
  `apps/web/src/env.ts` — imported by `next.config.ts` for dev/build and by `src/instrumentation.ts` when a server
  starts: the standalone server never runs `next.config.ts`). No `NEXT_PUBLIC_*` variables: they are inlined at build
  time, and images are built once for every stage.
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
| `API_PORT`, `API_PUBLIC_URL` | `apps/api` (port; OpenAPI `servers`, falls back to the request origin outside production); `API_PUBLIC_URL` also `apps/web` (quick-start snippets, read at runtime) |
| `API_CORS_ORIGINS` | `apps/api`: comma-separated browser origins allowed on `/v1/*` (the docs' playground); default `https://coss.com`, locally `http://localhost:3002` |
| `EMAIL_PROVIDER` | api, web, worker: provider for live environments (`fake` or `ses`); shape in `@coss/email/env` |
| `AWS_REGION`, `SES_CONFIGURATION_SET`, `SES_TENANT_PREFIX` | required with `EMAIL_PROVIDER=ses` (api, web, worker); printed by `ses:bootstrap`. AWS credentials come from the default chain (`globalPassThroughEnv` in `turbo.json`) |
| `SES_EVENTS_QUEUE_URL` | worker with `EMAIL_PROVIDER=ses`: the SQS queue of SES events |
| `VALKEY_URL`, `VALKEY_CLUSTER` | api + web: rate limit counters (`rediss://user:pass@…`, `true` for ElastiCache Serverless; printed by `valkey:bootstrap`). Required in production; unset → in-memory per process |
| `RATE_LIMIT_KEY_PREFIX` | api + web: namespaces Valkey keys (default `coss`) |
| `CLIENT_IP_HEADER`, `TRUSTED_PROXY_COUNT` | api + web: where the client IP comes from (e.g. `x-forwarded-for`, proxies of ours appending to it). Unset → per-IP limits off |
| `TEST_VALKEY_URL` | ratelimit + api tests (keys under a random prefix, never flushed) |
| `WEBHOOK_SECRETS_KEY` | api + web + worker: 32 bytes base64, encrypts endpoint signing secrets (losing it makes them unreadable) |
| `NODE_ENV`, `SKIP_ENV_VALIDATION` | `production` makes dev auth emails and the seed refuse to run; the latter skips t3-env (image builds set it) |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | `apps/web`: Server Actions key shared by every dashboard task of a stage (base64, 16/24/32 bytes); read at runtime, required in production |
| `TRUSTED_PROXY_HOPS` | `apps/web`: proxies that append to `X-Forwarded-For` (CloudFront → ALB: `2`; default `0`). `src/proxy.ts` replaces the header with the one client address they vouch for, which Better Auth then uses (it ignores multi-value headers) |
| `NEXT_DEPLOYMENT_ID` | Next builds (`apps/web`, `apps/site`): the commit, passed by the Dockerfiles; build id + version-skew protection |
| `PORT`, `HOSTNAME`, `KEEP_ALIVE_TIMEOUT` | set by the Next images (standalone `server.js`) |
| `SEED_PASSWORD` | `db:seed` demo password (only when the user is first created) |
| `COSS_API_KEY`, `COSS_BASE_URL` | SDK defaults / `packages/sdk/examples` only (the example also reads `COSS_FROM`, `COSS_TO`) |

Adding one: `.env.example`, the app's t3-env schema, **`turbo.json` `globalEnv`** (strict env mode drops undeclared vars
from tasks — CI and image builds have no `.env`), the service in `infra/aws/services.ts` (a test fails otherwise), and
`ci.yml` if CI needs it.

## Public API (`apps/api`)

- `createApp(opts)` (`src/app.ts`) is side-effect free; services are injected via `CreateAppOptions` and `src/index.ts`
  wires env (`webhookDeps` is required — a throwaway secrets key would make the endpoints it creates
  undeliverable; `emailService` is required — `src/index.ts` builds it on the pg-boss queue; `domainDeps` defaults to
  the fake provider). Middleware order: request id → `secureHeaders` → `bodyLimit` (5 MB) → `logger` (off under test). Every
  response carries a server-generated `X-Request-Id: req_…` (client values are ignored).
- Errors are always the envelope `{ error: { type, code, message, param?, issues?, request_id } }`, built only by
  `errorResponse` (`src/errors.ts`). Throw `new ApiError(status, { type, code, message, param? })` with `type` from
  `ERROR_TYPES`, or a product error mapped in `toApiError`; anything else is logged and returned as a generic 500. Never
  hand-build error JSON.
- New endpoint: `createRoute({ …, security: [{ bearerAuth: [] }], middleware: [requireApiKey({ <product>: ["<action>"] }), rateLimit("api.read" | "api.write" | "api.send")] })`
  + `router.openapi(route, handler)`, mounted in `createV1Router` (`src/routes/v1.ts`). Auth goes in `middleware` so it
  runs before validation (401 beats 422). Tenancy comes only from `c.var.auth` — environment-scoped resources filter by
  `environmentId`, organization-scoped ones (domains) only by `organizationId`. Document responses with
  `jsonDoc`/`errorDoc`/`commonErrors` (`src/routes/docs.ts`, includes 429). The root `validationHook` turns zod failures into 422 + `issues`;
  a per-route hook must end with `validationHook(result)`. `test/app.test.ts` asserts the exact OpenAPI path list.
- Every operation needs an `operationId` (it names its docs page). Wire schemas carry a whole-object
  `.meta({ examples: [...] })` (OpenAPI 3.1 form; the singular `example` is ignored by the docs), checked by
  `packages/{email,webhooks}/test/schema-examples.test.ts`; they feed the reference's samples and playground. After route changes
  run `bun run openapi:generate` and add the operation's SDK sample in `apps/site/src/lib/sdk-samples.ts` (tests
  enforce both).
- CORS: only `/v1/*`, only `API_CORS_ORIGINS`, never `credentials` — the API authenticates with bearer keys and must
  never accept the dashboard's session cookie (that would need CSRF protection on every endpoint).

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
  `PUBLIC_PATH_PREFIXES` (`src/proxy.ts`). The entry page is `/dashboard` (`DASHBOARD_PATH`), never `/` (the site's
  landing page): use it for every "go to the dashboard" link and as the post-sign-in default (`safeRedirectPath`).
  The dashboard has no root files (icon, robots, sitemap): the site serves them.
- Domain management uses `emailRuntime().domainDeps` (`src/lib/email-runtime.ts`) and webhook management
  `webhookManagementDeps()` (`src/lib/webhooks.ts`); domain/webhook errors carry user-facing messages. Revealing a
  webhook secret needs `webhook:update` (members can read endpoints but never see secrets).
- When driving the dashboard in a browser, wait for hydration before typing or submitting.

## coss.com zones

- coss.com is shared by Next.js multi-zones, routed by the ALB (not Next rewrites): the dashboard is the default zone
  (org slugs, `/dashboard`, `/api/*`, bare `/_next/*`); the site and the coss ui app get the paths in **`ZONE_ROUTES`**
  (`@coss/auth/slugs`, client-safe), from which `RESERVED_ORG_SLUGS`, the ALB rules and CloudFront behaviours
  (`infra/aws/routing.ts`) are derived. Adding a site page = a `ZONE_ROUTES` entry (unless `/docs` etc. covers it) +
  the route; `apps/site/test/reserved-slugs.test.ts` fails otherwise. The site's assets live under its
  `assetPrefix` (`SITE_ASSET_PREFIX`, `/site-assets`); its search is `/docs/search.json`.
- Org slugs can't be taken back once used, so plausible future site pages (pricing, blog, products, legal, …) are
  reserved up front in `slugs.ts`. Slugs are ≥ 3 characters, so a localized site must use 2-letter prefixes
  (`/de/…`), never `xx-yy` codes (valid slugs). Reserve a new marketing path before any org can take it.
- Same origin: any script on the site can act as the signed-in dashboard user. Both apps send a CSP without
  third-party script origins and deny framing (`src/lib/security-headers.ts` in each); see `apps/site/AGENTS.md`.
- Local dev keeps separate ports: `localhost:3000` redirects `/` to `/dashboard` and proxies `/icon.svg` to the site;
  the site proxies `/api/auth/*` to :3000 and links with `dashboardUrl()`.

## Containers and deployment (AWS)

- `apps/{web,site,api,worker}/Dockerfile`, built from the repository root (`docker build -f apps/web/Dockerfile .`):
  `turbo prune --docker` (works with `bun.lock` and the isolated linker) → `bun install --frozen-lockfile` → build →
  a small non-root runtime image. Bun/Node/turbo versions are `ARG`s that `infra/test` keeps equal to `package.json`.
- Next apps use `output: "standalone"` with `outputFileTracingRoot` at the monorepo root; the traced
  `node_modules/.bun` keeps relative symlinks, which resolve after copying (verified). They run `node
  apps/<app>/server.js` on Node 24. `generateBuildId` uses `NEXT_DEPLOYMENT_ID` (Next sets it to `""` when unset,
  hence `||`). api and worker run their TypeScript source on Bun from a `--production` prune.
- Build once, deploy to any stage: nothing stage-specific at build time (`SKIP_ENV_VALIDATION`), validation at
  startup. `next.config.ts` runs only at build/dev time and is serialized into the standalone server: decide nothing
  there from runtime env.
- Health checks: `/api/health` (web, site; public in `proxy.ts`), `/health` (api); none touch the database.
- SIGTERM: Next drains itself; the API (`src/server.ts`) stops accepting, finishes in-flight requests, closes the pg
  pool; the worker (`src/shutdown.ts`) aborts the SQS poll and long runs between items, waits for each loop's current
  run, closes the pool. Idle keep-alive timeouts (75 s) exceed the ALB's 60 s.
- Migrations: `bun packages/db/src/migrate.ts` (drizzle-orm's migrator, no drizzle-kit) as a one-off task from the
  worker image. Runbook, resources, IAM and deploy order: README.md, "Deploying to AWS"; machine-readable: `infra/`.

## Tests

- `bun:test`. DB-backed suites (`apps/api`, `apps/worker`, `packages/email`, `packages/tenancy`, `packages/webhooks`) preload `test/setup.ts` via their
  `bunfig.toml` → `@coss/db/testing`, which throws unless `TEST_DATABASE_URL` names a `*_test` database, then points
  `DATABASE_URL` at it. Other suites are DB-free; before adding DB tests elsewhere copy `packages/email/bunfig.toml` +
  `test/setup.ts`, or the tests hit the dev database.
- Tests never truncate; every test creates its own uniquely named fixtures: `createTestTenant()` (owner, org, project,
  `production`/`development`, `liveKey`/`sandboxKey`), `createTestUser()`, `addMember()` from `@coss/tenancy/testing`;
  `uniqueSuffix()` from `@coss/db/testing`. API: `createTestApp()` (sends only enqueue; its `dispatch()` runs the queued
  jobs) + `errorOf(res)` (`apps/api/test/helpers.ts`). Email: `memoryDispatchQueue()` (records jobs; `drain(service)`
  dispatches them), `dispatchingEmailService()` (send + dispatch in one call, for tests about what happens after dispatch),
  `FakeEmailProvider({ log: false, fail })`, `gatedProvider()` for races, `createVerifiedDomain(orgId)` (live sends need
  one), `FakeSesApi`, `fakeDnsResolver()` from `@coss/email/testing`. Real pg-boss tests use their own queue name
  (`packages/email/test/dispatch.test.ts`). Rate limits: `memoryLimiter({ overrides })`,
  `testValkeyLimiter()` from `@coss/ratelimit/testing`; `createTestApp({ rateLimiter, clientIp })` (defaults to an
  in-memory limiter per app); tighten limits for a test org with `setRateLimitOverride`. Webhooks: `webhookReceiver()` (local server),
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
6. Docs (`apps/site`): `bun run openapi:generate`, SDK samples for the new operations, a guide under
   `content/docs/(guides)/<product>/` with Twoslash SDK examples (per-method SDK usage lives in the API reference).
7. Dashboard: dependency + `transpilePackages`; pages under `[orgSlug]/projects/[projectSlug]/[envSlug]/`.
8. Events/webhooks: record events in the product's own table and call `enqueueWebhookMessage(tx, …)` from
   `@coss/webhooks` in the same transaction; add the payload zod schema + SDK type + contract assertion.

## Generated / managed files — don't hand-edit

- `packages/db/src/schema/auth.ts` (`bun run auth:generate`) and `packages/db/migrations/**` (`bun run db:generate`).
- `apps/api/openapi.json` (`bun run openapi:generate`; excluded from Biome).
- `packages/sdk/package.json` `exports`/`main`/`module`/`types` (rewritten by the SDK build — commit the result).
- `packages/ui/src/{components,hooks,lib}`: vendored from the `@coss` registry and excluded from Biome; re-adding a
  component overwrites local edits.
- `bun.lock` (only via `bun install`; CI uses `--frozen-lockfile`).
- The `<!-- BEGIN:*-agent-rules -->` blocks at the end of this file and in `apps/{web,site}/AGENTS.md` are rewritten by `turbo`
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
- **Better Auth:** `better-auth`, `@better-auth/core`, `@better-auth/api-key` and `auth` (CLI) stay on one identical
  exact version (catalog) — bump them together.
  - The api-key plugin is `@better-auth/api-key` (not `better-auth/plugins`). Keys are org-owned
    (`references: "organization"`); `referenceId` has **no FK**. Deliberate settings: built-in rate limit off
    (`rateLimit: { enabled: false }`), `enableMetadata: false` (the environment binding lives only in
    `environment_api_key`; metadata is client-writable),
    `defaultPermissions: { email: ["send", "read"], suppression: ["create", "read", "delete"] }`, prefixes
    `coss_live_` / `coss_test_` by environment mode (`API_KEY_PREFIX`), key format `/^coss_(live|test)_[A-Za-z]{64}$/`.
  - Keys are created only by `createEnvironmentApiKey` (server-side, no headers) and authenticated only by
    `authenticateApiKey`; keys without an `environment_api_key` binding fail closed. `authenticateApiKey` never calls
    Better Auth's `verifyApiKey` (it writes the key row on every request): one SELECT checks enabled, expiry, org,
    prefix/mode and permissions, rejects keys with a usage quota (`remaining`), and refreshes `last_request` at most
    once a minute (`LAST_USED_RESOLUTION_MS`). Re-check it against `validateApiKey` when bumping Better Auth or
    using a new key option (quotas, refills, per-key rate limits). Revocation: `getKeyBinding`
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
  - `packages/auth` must not import `next/*` or `"server-only"` (the `auth` CLI loads `src/auth.ts` on Node).
    `nextCookies()` is appended last, only in `apps/web/src/lib/auth.ts`.
- **Tenancy rule:** every tenancy/email/webhooks function that touches tenant data takes `organizationId` and scopes its
  SQL by it; writes derive org/project from the environment row. Only `getMembership` (by slug), `authenticateApiKey`
  (from the key's binding), the platform-level `promoteToAdmin`, and these system-level functions resolve the org
  themselves (scoping every write by the row's own org): `recordProviderEvent`/`ingestProviderEvents` (from the email
  id tag), `applyTenantStatus` (prefix-checked tenant name), `authorizeLiveSender` (reads domain names across orgs),
  and the worker scans `runDueWebhookDeliveries`, `recheckDueDomains`, `sweepStaleClaims`, `sweepUnclaimedEmails`
  (and the dispatch job, from the job's `organizationId`). Server actions take only slugs +
  target ids and derive the org from `requireOrgPermission`; every Better Auth organization call passes `organizationId`
  explicitly (never rely on `session.activeOrganizationId`).
- **Client-safe modules** never import `@coss/db`: `@coss/auth/{permissions,slugs,constants}`, `@coss/email/schemas`,
  `@coss/email/env`, `@coss/ui/*`, `@coss/ui/theme.css`. `@coss/webhooks`, `@coss/db/jobs` and `@coss/email/{runtime,ses,dispatch}` are server-only. Server-only web
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
  Bulk import/export is synchronous: `importSuppressions` validates each entry on its own (invalid ones are skipped
  and reported, reason `import`); the API takes 1,000 entries per request (the SDK batches), the dashboard a CSV of
  up to 10,000 rows (`serverActions.bodySizeLimit` in `apps/web/next.config.ts` leaves room for its 2 MB). Exports
  stream CSV page by page (`suppressionsCsvStream`, `suppression-csv.ts`) and guard formula-like cells with `'`, which
  `parseSuppressionCsv` strips again.
- **Rate limits** (`@coss/ratelimit`): buckets are defined only in `BUCKETS` (`src/buckets.ts`); GCRA state is one
  key per bucket, `GCRA_SCRIPT` (Valkey) and `gcraStep` (memory) must stay in step (`test/store.test.ts` runs both).
  One consume call = one hash tag (`{scope:subject}`), so all its buckets share a scope and a cluster slot. The
  limiter **fails open** (store errors allow the request and log); never make it throw or block on Valkey. Never
  `FLUSH*`/`KEYS` (tests use random prefixes). Valkey time (`TIME`) is the clock, not the app's. API key buckets run
  after `requireApiKey` (a bad key spends no bucket); `api.auth_failure` is per client IP and is checked
  before the key lookup. Send quotas are charged before `emailService.send` and refunded on replays and thrown errors.
  Client IPs come only from `clientIpResolver` (`CLIENT_IP_HEADER`, rightmost-trusted `x-forwarded-for` entry) —
  never trust a raw header. Emails are hashed into keys. Better Auth's built-in limiter stays off
  (`rateLimit: { enabled: false }`): `apps/web/src/lib/auth-rate-limit.ts` wraps the `/api/auth` POST handler. The
  ElastiCache user's ACL (`valkey-bootstrap.ts` `APP_ACCESS`) must list every command the client and the script use.
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

- Sends are asynchronous: `POST /v1/emails` stores the email and its `email-dispatch` pg-boss job in one transaction
  and returns 202 `queued`; the worker runs `dispatch`, which claims the email (sets `provider`) before calling the
  provider, so a job that runs twice never sends twice. Retries with the same `Idempotency-Key` replay the email in its
  current state (queued included). If a worker dies after the claim, the row stays `queued` until the stale-claim sweep
  (15 min) marks it `sent` (if SES reported it) or `failed`/`dispatch_interrupted` (a late SES `Send` event still
  repairs it). An email still unclaimed after 10 min (its job exhausted its retries) is re-enqueued, and after 1 hour
  (`UNCLAIMED_FAIL_MS`) it is `failed`/`dispatch_failed` with an `email.failed` webhook — so a worker outage longer than
  an hour fails the emails queued during it instead of sending them late. Sends need the worker running.
- Webhook deliveries are not ordered (use `data.occurred_at`; SES itself may publish a complaint before the
  delivery). SES complaints may list every recipient on the complaining domain (and each of them gets suppressed).
  SES never suppresses mailbox-simulator addresses, and with tenant-level suppression `suppressionlist@simulator.amazonses.com` is a plain hard bounce — only
  the fake provider simulates `suppressed` (via that address). Webhook secret rotation and key rotation for `WEBHOOK_SECRETS_KEY` are not built.
- Rate limits fail open while Valkey is unreachable (logged), and override changes take up to a minute (per-process
  cache). Without `CLIENT_IP_HEADER` there are no per-IP limits. Sign-in is also limited per email address, so
  someone hammering an address delays its owner's sign-in for as long as they keep at it (accepted).
- Next's cache is per task (nothing uses ISR or `revalidateTag` yet; add a shared `cacheHandler` first).
- Accepted: sign-up email enumeration; an admin ban does not cut off an org's API keys; org deletion is disabled.

**Not built yet** (don't assume these exist; delete a line when it ships): the real landing page, the AWS
infrastructure itself (only its spec, images and runbook exist), open/click tracking (and custom tracking domains),
attachments/batch/scheduled sends, webhook delivery logs over the API,
rate limit overrides in the dashboard, org settings,
removing members / leaving an org, resending invitations, signed-in password change, API version header, release tooling.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
