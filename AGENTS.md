# AGENTS.md — COSS monorepo

COSS is a unified developer platform: one API key + one SDK (`coss.email.send()`, later SMS, video,
scheduling…). This repo holds the dashboard, the public API, shared packages and the public SDK.
Email delivery goes through the provider interface in `packages/email/src/provider.ts` (Amazon SES v2 with one SES
tenant per organization, or the fake provider); sandbox environments always use the fake provider. Delivery events
drive per-recipient status and signed customer webhooks. A sample of live messages is screened by an AI decision model
(`@coss/screening`) before it is sent. Rate limits (per API key, per-org send quotas, dashboard
auth) are counted in Valkey (ElastiCache Serverless in production) by `@coss/ratelimit`. Errors and traces go to
Sentry (organization `coss`) through `@coss/observability`. Human setup docs (incl. running on SES): [README.md](./README.md).

## Layout

| Path | Package | What |
|---|---|---|
| `apps/web` | `@coss/web` | Next.js 16 dashboard (:3000). Hosts Better Auth at `/api/auth/*`. |
| `apps/api` | `@coss/api` | Hono on Bun public API (:3001): `/v1/*`, `/openapi.json`, `/health`. Commits its OpenAPI document as `openapi.json`. |
| `apps/site` | `@coss/site` | coss.com (:3002): placeholder landing page + Fumadocs docs at `/docs` (guides, Twoslash-checked SDK docs, API reference generated from `apps/api/openapi.json`). See `apps/site/AGENTS.md`. |
| `apps/worker` | `@coss/worker` | Bun background worker: email dispatch (pg-boss), scheduled sends, webhook deliveries, domain re-checks, stale-claim/unclaimed sweeps, data retention purges, organization deletions, SES events from SQS (`EMAIL_PROVIDER=ses`). `scripts/ses-bootstrap.ts`. Safe to run several. |
| `packages/db` | `@coss/db` | Drizzle schema (generated Better Auth tables + domain tables), pg client, TypeIDs, migrations, test guard; `./jobs` (pg-boss); `./idempotency` (`withIdempotencyKey`, `IdempotencyError`, request hashes); `./partitions` (daily range partitions: create ahead, drop expired). |
| `packages/auth` | `@coss/auth` | Better Auth options/instance (organization, admin, api-key, two-factor, passkey, sso, scim, captcha plugins), org permissions, slug rules, the sign-up email guard (`src/email-guard.ts`); `./sso`: SSO trust rules; `./scim`: directory sync rules (both server-only); `./emails`: the account email outbox. |
| `packages/tenancy` | `@coss/tenancy` | Projects, environments, environment-bound API keys (create/authenticate), memberships, organization SSO settings, directory sync (SCIM) connections and group roles, seed/admin scripts, test fixtures; `./admin`: suspensions, SSO/SCIM recovery, organization deletion, audit log and cross-org reads; `./deletion`: organization teardown (imports only `@coss/db`). |
| `packages/email` | `@coss/email` | Email product: wire schemas, providers (fake, SES under `./ses`), send/dispatch/read, recipients + event ingestion, domains/DNS, custom tracking domains (Cloudflare for SaaS), tenants, sweeps; `./dispatch` (pg-boss queue + worker handler), `./runtime` builds providers from env, `./env` (zod only), `./testing`. |
| `packages/ratelimit` | `@coss/ratelimit` | Rate limits: bucket catalog, GCRA in Valkey (Lua) or memory, per-org overrides (`rate_limit_override`), client IP resolution; `./env` (zod only), `./testing`. `scripts/valkey-bootstrap.ts`, `scripts/set-override.ts`. |
| `packages/webhooks` | `@coss/webhooks` | Product-agnostic webhooks: endpoints (secrets encrypted with a key ring, secret rolls), outbox, SSRF-safe signed delivery with retries, secret re-encryption, endpoint auto-disable and recovery; log drains (management, signed NDJSON batch delivery, retention); `./engine` (the delivery engine shared by every product: holds, lease fencing, retry outcomes, the HTTP attempt, endpoint health, a bounded runner); `./schemas`, `./env` (zod only). |
| `packages/reputation` | `@coss/reputation` | Reputation guard: per-org standing (`good`/`warning`/`suspended`), history, pluggable checks, the worker's evaluation scan, admin reinstatement, `account.*` webhooks, notification emails to owners/admins (outbox + `ReputationNotifier`); `./schemas` (zod only: policy, wire schemas, trigger labels). |
| `packages/screening` | `@coss/screening` | Product-agnostic AI content screening: sampling per org + product, the `ContentClassifier` interface (Vercel AI SDK `experimental_decide` adapter under `./ai`, `fakeClassifier` in `./testing`), verdict history, the `content_screening` reputation check; `./env` (zod only), `./runtime`. |
| `packages/observability` | `@coss/observability` | Sentry setup shared by every app: env shape (`./env`, zod only), `sentryConfig`/`sentryOptions`, PII scrubbing (`scrubEvent`), the browser init (`./browser`), the dashboard's envelope tunnel (`./tunnel`) and `withSentryConfig` options (`./build`). Takes each app's SDK; depends on no framework SDK and no workspace. |
| `packages/logs` | `@coss/logs` | Environment logs and the org audit log: the day-partitioned `log_entry` table (API requests, email events, webhook attempts), the buffered fail-open request writer, queries (keyset pages, histogram, facets, related lines, CSV/NDJSON export), partition retention, `org_audit_event`, the log drain outbox (`log_drain_record`, written by `appendLogEntries`/`recordOrgAuditEvent`); `./schemas` + `./query` (search syntax; zod only), `./testing`. |
| `packages/versioning` | `@coss/versioning` | Dated public API versions (`Coss-Version`): `API_VERSIONS`, the `VERSION_CHANGES` registry and the engine that renders latest-shape responses/webhook payloads in older versions and upgrades older request bodies. Zero deps, client-safe; `./testing` (`testVersioning()`). |
| `packages/retention` | `@coss/retention` | The data retention policy: `RETENTION_POLICY` (published by the docs and the dashboard) and `RETENTION_DAYS` (enforced by each package's purge, run by the worker). Zero deps, client-safe. |
| `packages/ui` | `@coss/ui` | coss ui components (shadcn `@coss` registry, Base UI) + `theme.css` (tokens) and `globals.css` (the dashboard's stylesheet). |
| `packages/sdk` | `coss` | **Public** SDK. Zero deps, ESM-only, built with tsdown. |
| `tooling/typescript` | `@coss/tsconfig` | Shared tsconfig bases. |
| `infra` | `@coss/infra` | AWS deployment spec (ECS services, env vars, ALB rules, CloudFront behaviours), checked by tests; nothing here calls AWS. See `infra/AGENTS.md`. |

Runtime dependencies: `observability` (no workspace deps) ← `api`, `worker`, `web`, `site`, `infra`; `db ← auth ← tenancy`, `db ← logs ← webhooks ← reputation ← screening ← email`, `db ← ratelimit`; `versioning` (no deps) ← `tenancy`, `webhooks`, `email` (`schemas` examples);
`retention` (no deps) ← `tenancy`, `webhooks`, `reputation`, `screening`, `email`, `worker`, `web`, `site`;
`api → tenancy, email, reputation, webhooks, ratelimit, versioning, logs, db`;
`web → auth, tenancy, email, reputation, screening, webhooks, ratelimit, versioning, retention, logs, db, ui`; `site → ui, auth, versioning, retention` (only the client-safe `@coss/auth/slugs`, the changelog and the retention policy) +
`@coss/api/openapi.json` (data only, never api code); `infra → auth, email, ratelimit, screening` (`slugs`, `env` only);
`worker → auth (`./emails` only), email, reputation, screening, webhooks, ratelimit, logs, tenancy, retention, db` (from tenancy only `./retention` and `./deletion`, which import nothing but `db`); `sdk` and `ui` depend on no workspace.
Dev-only: `email`/`webhooks`/`reputation`/`screening`/`ratelimit`/`logs`/`worker → tenancy` (test fixtures — so tenancy and auth must never import email, webhooks, screening, ratelimit or logs; Better Auth's own audit events reach the log through `setOrgAuditRecorder` from `@coss/auth/audit`) and
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
bun run auth:update-disposable  # refresh the vendored disposable-domain list (review the diff before committing)
bun run openapi:generate    # rewrite apps/api/openapi.json after changing API routes (a test fails when stale)
bun run changeset           # describe an SDK change (CI requires one when packages/sdk/src changes; --empty if none)
bun run version-packages    # apply changesets: bump the SDK's package.json, src/version.ts, CHANGELOG.md, bun.lock
                            #   (CI's Release workflow opens a "Version packages" PR doing this; nothing is published)
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
                                               # show/change an org's rate limit overrides (~1 min to apply;
                                               #   not audited — prefer the admin console's organization page)
bun run webhooks:reencrypt [--dry-run]         # re-encrypt webhook endpoint secrets with the first
                                               #   WEBHOOK_SECRETS_KEY (step 3 of a key rotation, README)
```

Single package: `bun run --cwd <pkg> test [filter]` (after `bun run db:migrate:test` once). Don't run bare `bun test`
from the root or a package — the package script is what loads `.env` and the test-DB preload.

**Before committing**, run what CI (`.github/workflows/ci.yml`, Postgres 18, no `.env`) runs:
`bun run lint && bun run typecheck && bun run test && bun run build`.

**Remote cache** (README, "Remote cache"): `typecheck` and `build` results are uploaded to Turbo's Vercel Remote Cache
(team `cal`, signed) and CI replays any task whose hash it finds, so running the commands above also makes CI fast.
Each machine is set up once by a human (`turbo login`, `~/.config/coss/turbo.env` loaded from the shell profile). If
a `turbo` run's header says `Remote caching disabled` or `unavailable`, tell the user the machine isn't set up and
point them at that README section — never run `turbo login`, create Vercel tokens, or write `TURBO_*` values into
`.env`, a commit or a log yourself. Keep task outputs machine-independent and keep `globalEnv` to build-affecting
variables (`infra/test` enforces the list): a hash that differs between laptops and CI silently turns the cache off.

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
| `BETTER_AUTH_SECRET` (≥ 32 chars), `BETTER_AUTH_URL` | `packages/auth/src/options.ts` (base URL, trusted origin, invitation links); `BETTER_AUTH_URL` also `apps/worker` (dashboard links in notification emails) |
| `API_PORT`, `API_PUBLIC_URL` | `apps/api` (port; OpenAPI `servers` and email tracking URLs, falls back to the request origin outside production); `API_PUBLIC_URL` also `apps/worker` (email tracking) and `apps/web` (quick-start snippets, read at runtime) |
| `API_CORS_ORIGINS` | `apps/api`: comma-separated browser origins allowed on `/v1/*` (the docs' playground); default `https://coss.com`, locally `http://localhost:3002` |
| `EMAIL_PROVIDER` | api, web, worker: provider for live environments (`fake` or `ses`); shape in `@coss/email/env` |
| `AWS_REGION`, `SES_CONFIGURATION_SET`, `SES_TENANT_PREFIX` | required with `EMAIL_PROVIDER=ses` (api, web, worker); printed by `ses:bootstrap`. AWS credentials come from the default chain (`globalPassThroughEnv` in `turbo.json`) |
| `TRACKING_DOMAIN_PROVIDER`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, `TRACKING_CNAME_TARGET` | api, web, worker: custom tracking domains (`fake` default, or `cloudflare`: Cloudflare for SaaS custom hostnames on the coss.com zone, which needs the token and zone id); customers CNAME to `TRACKING_CNAME_TARGET` (default `track.coss.com`); shape in `@coss/email/env` |
| `SES_EVENTS_QUEUE_URL` | worker with `EMAIL_PROVIDER=ses`: the SQS queue of SES events |
| `NOTIFICATIONS_ENVIRONMENT_ID`, `NOTIFICATIONS_FROM` | web reads the id only to refuse admin suspensions of COSS's own organization (`isSystemOrganization`, `apps/web/src/lib/system-organization.ts`); worker: account emails (verification, password reset, invitation) and reputation notification emails go out through COSS's own email product from this live environment (of COSS's own org) and sender (on one of its verified domains). Both or neither; unset → held in production (account email links are printed by the dashboard outside production) |
| `VALKEY_URL`, `VALKEY_CLUSTER` | api + web: rate limit counters (`rediss://user:pass@…`, `true` for ElastiCache Serverless; printed by `valkey:bootstrap`). Required in production; unset → in-memory per process |
| `RATE_LIMIT_KEY_PREFIX` | api + web: namespaces Valkey keys (default `coss`) |
| `CLIENT_IP_HEADER`, `TRUSTED_PROXY_COUNT` | api + web: where the client IP comes from (e.g. `x-forwarded-for`, proxies of ours appending to it). Unset → public unauthenticated limits use an aggregate fallback subject instead of a per-IP subject |
| `TEST_VALKEY_URL` | ratelimit + api tests (keys under a random prefix, never flushed) |
| `WEBHOOK_SECRETS_KEY` | api + web + worker: comma-separated 32-byte base64 keys, newest first (the first encrypts, all decrypt); encrypts endpoint signing secrets (losing it makes them unreadable). Shape in `@coss/webhooks/env` |
| `LOG_RETENTION_DAYS` | worker: days of environment logs kept (1-31, default 30); whole expired day partitions are dropped hourly |
| `SCREENING_CLASSIFIER`, `SCREENING_MODEL`, `AI_GATEWAY_API_KEY` | worker: content screening (`off`/`fake`/`ai`; a Vercel AI Gateway decision model id, default `typesafe-ai/jev`; the Gateway key, required with `ai`) |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE` | api, worker, web: Sentry (each its own project's DSN; web's also serves browsers of both zones); unset → nothing reported. Read before t3-env (`src/instrument.ts`, `src/lib/monitoring-server.ts`, `/api/monitoring`) and validated by it (`sentryEnvShape`) |
| `SENTRY_RELEASE` | api, worker: the image's commit (Dockerfile build argument); the Next apps' release is `NEXT_DEPLOYMENT_ID`, injected at build |
| `SENTRY_AUTH_TOKEN` (`SENTRY_ORG`, `SENTRY_PROJECT`) | Next builds only (`globalPassThroughEnv`; a BuildKit secret in the Dockerfiles): uploads source maps to `coss`/`web` and deletes them from the build. Unset → no source maps |
| `NODE_ENV`, `SKIP_ENV_VALIDATION` | `production` makes dev auth emails and the seed refuse to run; the latter skips t3-env (image builds set it) |
| `SKIP_BUILD_TYPECHECK` | `1` makes `next build` (web, site) skip its TypeScript check; set only by CI's build job (its check job typechecks) |
| `TURBO_TOKEN`, `TURBO_TEAM`, `TURBO_REMOTE_CACHE_SIGNATURE_KEY` | turbo itself (Vercel Remote Cache, team `cal`): locally `turbo login` stores the token and `~/.config/coss/turbo.env` (sourced by the shell profile) sets the other two; in CI `secrets.TURBO_TOKEN`, `vars.TURBO_TEAM`, `secrets.TURBO_REMOTE_CACHE_SIGNATURE_KEY`. Never in `.env` (turbo doesn't read it) |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | `apps/web`: Server Actions key shared by every dashboard task of a stage (base64, 16/24/32 bytes); read at runtime, required in production |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | `apps/web`: Cloudflare Turnstile (both or neither; required in production, checked in `src/instrumentation.ts`). Pages pass the site key to the auth forms; `packages/auth/src/options.ts` adds the `captcha` plugin when the secret is set |
| `TRUSTED_PROXY_HOPS` | `apps/web`: proxies that append to `X-Forwarded-For` (CloudFront → ALB: `2`; default `0`). `src/proxy.ts` replaces the header with the one client address they vouch for, which Better Auth then uses (it ignores multi-value headers) |
| `NEXT_DEPLOYMENT_ID` | Next builds (`apps/web`, `apps/site`): the commit, passed by the Dockerfiles; build id + version-skew protection |
| `PORT`, `HOSTNAME`, `KEEP_ALIVE_TIMEOUT` | set by the Next images (standalone `server.js`) |
| `SEED_PASSWORD` | `db:seed` demo password (only when the user is first created) |
| `COSS_API_KEY`, `COSS_BASE_URL` | SDK defaults / `packages/sdk/examples` only (the example also reads `COSS_FROM`, `COSS_TO`) |

Adding one: `.env.example`, the app's t3-env schema, **`turbo.json` `globalPassThroughEnv`** (strict env mode drops
undeclared vars from tasks — CI and image builds have no `.env`), the service in `infra/aws/services.ts` (a test fails
otherwise), and `ci.yml` if CI needs it. Only a variable that changes what a task *produces* goes in `globalEnv`
instead (today `NODE_ENV`, `NEXT_DEPLOYMENT_ID`; `infra/test` pins the list): those values are part of every task hash,
and laptops and CI must compute the same hashes to share the remote cache (README, "Remote cache"). Runtime values
are never inlined into builds (no `NEXT_PUBLIC_*`), which is what makes pass-through safe.

## Public API (`apps/api`)

- `createApp(opts)` (`src/app.ts`) is side-effect free; services are injected via `CreateAppOptions` and `src/index.ts`
  wires env (`webhookDeps` is required — a throwaway secrets key would make the endpoints it creates
  undeliverable; `emailService` is required — `src/index.ts` builds it on the pg-boss queue; `domainDeps` defaults to
  the fake provider). Middleware order: request id → `secureHeaders` → `bodyLimit` (5 MB; `POST /v1/emails` uses its own 40 MB limit after authentication) → `logger` (off under test). Every
  response carries a server-generated `X-Request-Id: req_…` (client values are ignored).
- The only unauthenticated routes are `/health`, `/openapi.json` and the tracking endpoints `GET /t/o/:token`
  (open pixel, always a GIF) and `GET /t/c/:token/:position` (302 to the stored link, else a plain-text 404)
  (`src/routes/tracking.ts`). They are plain Hono routes outside `/v1` and the OpenAPI document, never return the
  error envelope, record nothing for HEAD, and get `Cross-Origin-Resource-Policy: cross-origin` (everything else keeps
  `same-origin`).
- Errors are always the envelope `{ error: { type, code, message, param?, issues?, request_id } }`, built only by
  `errorResponse` (`src/errors.ts`). Throw `new ApiError(status, { type, code, message, param? })` with `type` from
  `ERROR_TYPES`, or a product error mapped in `toApiError`; anything else is logged and returned as a generic 500. Never
  hand-build error JSON.
- New endpoint: `createRoute({ …, security: [{ bearerAuth: [] }], middleware: [requireApiKey({ <product>: ["<action>"] }), rateLimit("api.read" | "api.write" | "api.send")] })`
  + `router.openapi(route, handler)`, mounted in `createV1Router` (`src/routes/v1.ts`). Auth goes in `middleware` so it
  runs before validation (401 beats 422). Tenancy comes only from `c.var.auth` — environment-scoped resources filter by
  `environmentId`, organization-scoped ones (domains, audit events) only by `organizationId`. Document responses with
  `jsonDoc`/`errorDoc`/`commonErrors` (`src/routes/docs.ts`, includes 429). The root `validationHook` turns zod failures into 422 + `issues`;
  a per-route hook must end with `validationHook(result)`. `test/app.test.ts` asserts the exact OpenAPI path list.
- Every operation needs an `operationId` (it names its docs page). Wire schemas carry a whole-object
  `.meta({ examples: [...] })` (OpenAPI 3.1 form; the singular `example` is ignored by the docs), checked by
  `packages/{email,webhooks}/test/schema-examples.test.ts`; they feed the reference's samples and playground. After route changes
  run `bun run openapi:generate` and add the operation's SDK sample in `apps/site/src/lib/sdk-samples.ts` (tests
  enforce both).
- **Versions** (`Coss-Version: YYYY-MM-DD`, `@coss/versioning`): handlers always build the latest shape. The
  `apiVersion` middleware (`src/middleware/api-version.ts`, on `/v1/*`) rejects unknown versions (400
  `invalid_api_version`, before authentication), echoes `Coss-Version` and renders 2xx JSON bodies in the caller's
  version; `requireApiKey` resolves `c.var.apiVersion` (header, else the org pin from `authenticateApiKey`). Routes
  with a JSON body end their `middleware` with `upgradeRequestBody("<METHOD> /v1/<path template>")` (after the body
  limit, before validation). Error envelopes, CSV and `/t/*` are never versioned. The OpenAPI `Coss-Version`
  parameter/header and `info.version` are added by `withApiVersionDocs` (`src/openapi-versions.ts`).
- CORS: only `/v1/*`, only `API_CORS_ORIGINS`, never `credentials` — the API authenticates with bearer keys and must
  never accept the dashboard's session cookie (that would need CSRF protection on every endpoint).

## SDK (`packages/sdk`, published as `coss`)

- `Coss` (`src/client.ts`) → one `HttpClient` (`src/core/http.ts`: bearer auth, JSON, per-attempt timeout, retries on
  network/timeout/409/429/5xx honoring `Retry-After`, an `Idempotency-Key` on every POST reused across retries) → one
  resource per product or managed resource (`src/resources/*.ts`: `email`, `domains`, `webhookEndpoints`;
  sub-resources hang off their parent, e.g. `coss.email.suppressions`, `coss.webhookEndpoints.deliveries`). Methods return `{ data, error }` and never
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
- Every request sends `Coss-Version`: `API_VERSION` (`src/api-version.ts`, a hand mirror of `API_VERSIONS`; the
  contract tests keep them equal), overridable with the `apiVersion` client option. The SDK's wire types describe
  `API_VERSION` only.
- Releases: Changesets 3 (`.changeset/`, SDK only — every other workspace is private and never versioned).
  `bun run version-packages` also rewrites `src/version.ts` (`scripts/sync-version.ts`) and refreshes `bun.lock`
  (it records workspace versions; CI installs with `--frozen-lockfile`).
- **Never publish**: the `coss` npm name is currently owned by a third party (see `packages/sdk/README.md`). The
  Release workflow has no publish step and `prepublishOnly` fails on purpose.

## Dashboard (`apps/web`)

- Pages use the generated `PageProps<"/…">`/`LayoutProps` globals and `await params`. Call `requireOrgMember(orgSlug)`
  (`src/lib/session.ts`; non-members get a 404) and gate controls with its `can(…)` (the role check, read-only while
  the org is suspended). Read data straight
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
- Org settings (`[orgSlug]/settings`: rename, slug change, leave, 2FA requirement; `settings/sso`: SSO provider and
  requirement; `settings/scim`: directory sync) and account settings (top-level `/settings`: name,
  verification email, password change, sessions) call `auth.api.*` server-side — `/organization/update` stays a
  disabled HTTP path. `canRemoveOrgMember`/`assignableOrgRoles` mirror Better Auth's owner rules for the UI; Better
  Auth alone protects the last owner. Account actions refuse while impersonating.
- Session-bound Better Auth calls made while *rendering* pass `authHeaders()` (`src/lib/session.ts`), not raw
  `headers()`: after an action replaces the session cookie (password change), Next re-renders with the new cookies
  but the old request headers.
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
  third-party script origins (except the dashboard's `TURNSTILE_ORIGIN`, script + frame only) and deny framing (`src/lib/security-headers.ts` in each); see `apps/site/AGENTS.md`.
- Local dev keeps separate ports: `localhost:3000` redirects `/` to `/dashboard` and `/legal/*` to the site, and
  proxies `/icon.svg` to the site;
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

- `bun:test`. DB-backed suites (`apps/api`, `apps/worker`, `packages/email`, `packages/reputation`, `packages/screening`, `packages/tenancy`, `packages/webhooks`) preload `test/setup.ts` via their
  `bunfig.toml` → `@coss/db/testing`, which throws unless `TEST_DATABASE_URL` names a `*_test` database, then points
  `DATABASE_URL` at it. Other suites are DB-free; before adding DB tests elsewhere copy `packages/email/bunfig.toml` +
  `test/setup.ts`, or the tests hit the dev database.
- Tests never truncate; every test creates its own uniquely named fixtures: `createTestTenant()` (owner, org, project,
  `production`/`development`, `liveKey`/`sandboxKey`), `createTestUser()`, `addMember()` from `@coss/tenancy/testing`;
  `uniqueSuffix()` from `@coss/db/testing`. API: `createTestApp()` (sends only enqueue; its `dispatch()` runs the queued
  jobs) + `errorOf(res)` (`apps/api/test/helpers.ts`). Email: `memoryDispatchQueue()` (records jobs; `drain(service)`
  dispatches them), `dispatchingEmailService()` (send + dispatch in one call, for tests about what happens after dispatch),
  `FakeEmailProvider({ log: false, fail })`, `gatedProvider()` for races, `createVerifiedDomain(orgId)` (live sends need
  one), `FakeSesApi`, `fakeDnsResolver()`, `FakeCloudflareApi` (a `fetch` for `CloudflareTrackingHostnameProvider`)
  from `@coss/email/testing`, `FakeTrackingHostnameProvider({ state })` from `@coss/email`. Real pg-boss tests use their own queue name
  (`packages/email/test/dispatch.test.ts`). Rate limits: `memoryLimiter({ overrides })`,
  `testValkeyLimiter()` from `@coss/ratelimit/testing`; `createTestApp({ rateLimiter, clientIp })` (defaults to an
  in-memory limiter per app); tighten limits for a test org with `setRateLimitOverride`. Webhooks: `webhookReceiver()` (local server),
  `testSender()`, `testManagementDeps` from `@coss/webhooks/testing`. Screening: `fakeClassifier({ scores, fail, delayMs })` from
  `@coss/screening/testing` (markers like `[coss-test:phishing]` in the content score 0.99), `screenMessage(…, { random })`
  for deterministic sampling, `Experimental_DecisionMockModelV4` (`ai/test`) for the AI SDK adapter; `dispatchingEmailService({ screen })`. Worker-style scans take `scope: { organizationIds }`
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
9. Logs: append a log line per new event with `appendLogEntries(tx, …)` from `@coss/logs` in the same transaction
   (only for rows actually inserted, so deduplicated events aren't logged twice), and add a `LogSource` value
   (enum migration + `LOG_SOURCES` + SDK `LogSource`). Mutations of the product's settings record
   `recordAudit` (dashboard) / `recordApiAudit` (API) audit events.

**Partitioned tables** (only `log_entry` so far): drizzle-kit can't declare partitioning, so declare the table in the
schema as usual (composite primary key including the partition column), `db:generate` it, then add a `--custom`
migration that drops the still-empty table and recreates it identically with `PARTITION BY` (see `0027`/`0028`).
Later column changes generated by drizzle-kit apply to partitioned tables as they are. The worker keeps daily
partitions ahead and drops expired ones through `@coss/db/partitions` (`ensurePartitions`/`dropExpiredPartitions`,
by `{ table, column, defaultPartition }`): a table with a default partition is dropped under a short ACCESS EXCLUSIVE
lock; one without is detached `CONCURRENTLY` (Postgres refuses that with a default partition), but rejects inserts
outside its created days. Nothing may hold an FK into a partitioned table.

**Make a breaking API change** (renaming/removing a field, changing a type or default — additive changes need none of
this): append today's date to `API_VERSIONS` (`packages/versioning/src/versions.ts`) and add a `VersionChange` to
`VERSION_CHANGES` (`changes.ts`) whose `responses` transforms (keyed by the wire `object`) rebuild the previous shape
from the new one — an event-data change needs both `email_event` (API) and `event` (webhooks, `eventDataTransform`) —
and whose `requests` transforms upgrade old request bodies. Change the handlers/schemas to the new shape, test the
old shape through the real registry, mirror the date in the SDK (`API_VERSIONS`, `API_VERSION`, wire types) with a
changeset, `bun run openapi:generate`. Organizations stay on their pin until they upgrade in the dashboard; endpoints
keep theirs. `title`/`description` appear in the docs changelog and the upgrade dialog. Don't add a version for a
change that can't be expressed as a transform — that is a `/v2`.

**Add a reputation trigger**: a *measured* signal is a `ReputationCheck`
(`{ trigger, evaluate(context) }`, see `packages/email/src/reputation-checks.ts`; `rateResult` grades rates) passed to
`runDueReputationEvaluations` in `apps/worker/src/jobs.ts` — all checks of one evaluation share one `context` object,
and mark the org due (`markReputationDue`) when new evidence arrives. A *one-off verdict* calls
`suspendOrganization({ organizationId, trigger: "<name>", actor: { kind: "system" }, note }, tx?)` directly (content
screening does both: it suspends on a block and its check keeps the verdicts in the window). Either way add
the trigger's label to `TRIGGER_LABELS` (`packages/reputation/src/schemas.ts`, shared by the dashboard and the
notification emails) and, if there is useful advice, to `ADVICE` (`packages/reputation/src/notifications.ts`); new thresholds go in
`ReputationPolicy` (+ overrides schema and the admin `PolicyForm`).

## Generated / managed files — don't hand-edit

- `packages/db/src/schema/auth.ts` (`bun run auth:generate`) and `packages/db/migrations/**` (`bun run db:generate`).
- `apps/api/openapi.json` (`bun run openapi:generate`; excluded from Biome).
- `packages/sdk/package.json` `exports`/`main`/`module`/`types` (rewritten by the SDK build — commit the result).
- `packages/ui/src/{components,hooks,lib}`: vendored from the `@coss` registry and excluded from Biome; re-adding a
  component overwrites local edits.
- `bun.lock` (only via `bun install`; CI uses `--frozen-lockfile`).
- `packages/auth/src/disposable-domains.generated.ts` (`bun run auth:update-disposable`; local exceptions go in
  `ALLOWED_DOMAINS` / `EXTRA_DISPOSABLE_DOMAINS` in `email-guard.ts`).
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
- **Better Auth:** `better-auth`, `@better-auth/core`, `@better-auth/api-key`, `@better-auth/passkey`,
  `@better-auth/sso`, `@better-auth/scim` and `auth` (CLI) stay on one identical exact version (catalog) — bump them together.
  - The api-key plugin is `@better-auth/api-key` (not `better-auth/plugins`). Keys are org-owned
    (`references: "organization"`); `referenceId` has **no FK**. Deliberate settings: built-in rate limit off
    (`rateLimit: { enabled: false }`), `enableMetadata: false` (the environment binding lives only in
    `environment_api_key`; metadata is client-writable),
    `defaultPermissions: API_KEY_PERMISSIONS` (every product: email, domain, webhook, suppression, reputation), prefixes
    `coss_live_` / `coss_test_` by environment mode (`API_KEY_PREFIX`), key format `/^coss_(live|test)_[A-Za-z]{64}$/`.
  - Keys are created only by `createEnvironmentApiKey` (server-side, no headers) and authenticated only by
    `authenticateApiKey`; keys without an `environment_api_key` binding fail closed. `authenticateApiKey` never calls
    Better Auth's `verifyApiKey` (it writes the key row on every request): one SELECT checks enabled, expiry, org,
    prefix/mode and permissions, rejects keys with a usage quota (`remaining`), and refreshes `last_request` at most
    once a minute (`LAST_USED_RESOLUTION_MS`). Re-check it against `validateApiKey` when bumping Better Auth or
    using a new key option (quotas, refills, per-key rate limits). Revocation: `getKeyBinding`
    ownership check, then `auth.api.deleteApiKey` with session headers.
  - `disabledPaths` blocks the HTTP routes `/api-key/{create,update,get,list,delete}`, `/organization/{update,invite-member}` and
    every admin-plugin mutation (`/admin/{create-user,update-user,remove-user,set-role,set-user-password,ban-user,
    unban-user,impersonate-user,revoke-user-session,revoke-user-sessions}`) and SSO provider management
    (`/sso/{register,update-provider,delete-provider,providers,get-provider,request-domain-verification,verify-domain}`)
    (server-side `auth.api.*` still works).
    Admin mutations go only through `apps/web/src/app/admin/actions.ts`, which records the audit log. Never re-enable
    them to "simplify" things.
  - Invitations follow their inviter (`packages/auth/src/invitations.ts`): Better Auth accepts any pending one,
    so `beforeAcceptInvitation` refuses it unless the inviter is still a member allowed to invite, and
    `cancelStaleInvitations` cancels the rest after a member is removed, demoted (`afterRemoveMember`,
    `afterUpdateMemberRole`) or leaves (a `hooks.after` on `/organization/leave`, which has no org hook).
  - `organizationHooks` validate org slugs on create/update, only allow canonical roles (`INVITABLE_ORG_ROLES`,
    `isOrgRole`), only cancel `pending` invitations (Better Auth would rewrite accepted ones) and refuse invitations,
    accepting/canceling them, organization updates and member changes while the org is suspended;
    a before middleware also guards invitation resends and leaving (Better Auth skips the hooks for these); `orgRoleCan` matches
    role names exactly, like Better Auth (no trimming). `assignableOrgRoles` mirrors Better Auth's update-member-role
    rules (only owners change owners or grant owner; Better Auth alone enforces "the last owner can't step down").
  - **Abuse prevention.** Turnstile: Better Auth's `captcha` plugin (only when `TURNSTILE_SECRET_KEY` is set) checks
    `/sign-up/email`, `/sign-in/email` and `/request-password-reset` (HTTP only; `auth.api.*` skips it); the forms
    get the token from `useTurnstile` (`apps/web/src/components/turnstile.tsx`) and send it as `x-captcha-response`.
    It fails closed while siteverify is unreachable (passkeys and SSO still sign in). The sign-up guard runs on
    `/sign-up/email` only — never in `databaseHooks`, so fixtures (`@coss.test`), the seed,
    admins and SSO users skip it: disposable domains (vendored list, parent domains included), domains that
    definitively can't receive mail (NXDOMAIN, null MX, no MX/A/AAAA; system resolver, 1 s, in-process cache;
    lookup failures allow; special-use TLDs like `.test` allowed outside production only), and a second account
    for the same mailbox (`user.canonicalEmail`, set for every new user; its rules are mirrored in SQL by
    migration `0033` — change both together). The sign-up endpoint holds a Postgres advisory lock per
    canonical mailbox through the account transaction; organization creation holds one per owner through
    the organization and membership transaction (`serialized-endpoint.ts`). Invitations: inviter must have a verified email, no disposable
    invitees (both checked in middleware, including resends), at most `MAX_PENDING_INVITATIONS` pending per org, and the dashboard action charges the org's
    `dashboard.invitations` bucket (refunded when Better Auth refuses). Organizations: a user owns at most
    `MAX_OWNED_ORGANIZATIONS` (platform admins exempt; memberships don't count), and `/organization/create` is
    limited per IP (`auth.org_create.ip`).
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
    `FACTOR_MANAGEMENT_PATHS` to impersonation sessions; add new factor-changing endpoints there. Code and passkey
    verification are limited per IP in `auth-rate-limit.ts` (Better Auth also locks an account for 15 min after 10
    failed codes).
  - **SSO** (`@better-auth/sso`, `packages/auth/src/sso.ts`, `packages/tenancy/src/sso.ts`): one provider per
    organization (enforced by the dashboard action), registered/updated/deleted only through `auth.api.*` from
    `[orgSlug]/settings/sso/actions.ts` (`sso:update`: owners and admins; the plugin itself re-checks owner/admin).
    Its `providerId` is `ssoProviderIdFor(organizationId)` (`sso_<org suffix>`), so callback URLs exist before saving.
    Domain trust replaces the plugin's TXT verification: `domainVerified` is set by `syncSsoDomainVerification` (every
    provider domain is a `verified` email domain of the org) after every save — the plugin resets it when domains
    change — and `resolveSsoUser` (the plugin's `resolveUser`, runs before any write) re-checks on every sign-in that
    the IdP's address falls under the most specific non-failed email domain, owned by that org and listed on the
    provider (the `authorizeLiveSender` rule), and refuses new members of suspended orgs (the plugin's org
    provisioning writes `member` directly, bypassing the organization hooks). Users created by an SSO callback are
    created `emailVerified` (`databaseHooks.user`); linking an existing account keeps Better Auth's rules (trusted
    provider + verified local email). Never put SSO provider ids in `trustedProviders` or IdP origins in
    `trustedOrigins` (that also allows redirects to them): the dashboard runs OIDC discovery itself
    (`apps/web/src/lib/sso.ts`, public https hosts only) and registers with `skipDiscovery`.
  - **SSO sessions and enforcement:** `session.ssoProviderId` (additional field, `input: false`) is set by
    `databaseHooks.session` only for sessions created on `/sso/callback/:providerId` or `/sso/saml2/sp/acs/:providerId`.
    `organization.requireSso` (written only by `setOrganizationSsoRequired`; turning it on needs `sso:require` —
    owners only — an active provider, the actor's own SSO session and a password) makes `requireOrgMember` send
    members whose session didn't come from the org's provider to `/sso?org=…` (`orgAccess`,
    `apps/web/src/lib/org-access.ts`). Owners keep break-glass access (password, plus TOTP if 2FA is required) and
    see a banner; impersonation sessions are exempt. An SSO session from the org's own provider also satisfies its
    `requireTwoFactor` (the IdP owns MFA); another org's provider satisfies neither. API keys are unaffected.
    Admin recovery (audited, `@coss/tenancy/admin`): `unlinkUserSso`, `disableOrganizationSsoRequirement`,
    `disableOrganizationSso` (clears `domainVerified`; saving again re-enables). A domain the org's provider
    lists can't be deleted (`deleteDomain` → `domain_in_use_by_sso`, 422): it would end SSO sign-in and, with
    `requireSso`, lock members out; it must come off the provider first. Disabling or removing a provider
    also signs out the sessions it created (`revokeSsoProviderSessions`): Better Auth keeps them, they would still
    count as SSO for the org's requirements, and a later provider gets the same derived id.
  - **SCIM (directory sync)** (`@better-auth/scim`, `packages/auth/src/scim.ts`, `packages/tenancy/src/scim.ts`,
    endpoints at `/api/auth/scim/v2`): one **managed** connection per organization (`provisioningDomainId` = the
    organization id), created/rotated/revoked/decommissioned only through the plugin's serverOnly `auth.api.*`
    (`connectScim` & co., `scim:update`: owners and admins); tokens are HMAC digests keyed by a secret derived from
    `BETTER_AUTH_SECRET` (`scimCredentialHashSecret` — rotating that secret invalidates every SCIM token). Connecting
    needs an active SSO provider: `resolveScimUser` only provisions addresses under the provider's domains
    (`ssoDomainForEmail`, also enforced on create/update in `databaseHooks.user` so directory users stay
    `emailVerified`), links an existing account only when it is verified (keep this independent of sign-up policy:
    an unverified account would hand membership to whoever registered it) and never lets the directory rewrite a linked account
    (`profile: "preserve"`). The plugin has no organizations: `reconcileScimMembership` (its `projection`) writes
    `member` rows through the transaction it is given — active = member, admin when a group is mapped to admin in
    `scim_group_role` (normalized displayName); inactive/deleted = membership removed and that org's SSO sessions
    deleted. **Owners are never changed**, nobody is added or promoted while the org is suspended (removals apply).
    The plugin deletes *every* session of a globally inactive user; the `session.delete.before` hook vetoes that
    (`isScimSessionSweep`) during SCIM requests and inside `preservingScimMembers` (COSS's decommission/replay
    calls, which also keep members whose only source was the disconnected directory). While a connection is
    active, `resolveSsoUser` admits only users with an active SCIM user there (matched by email, not the IdP
    subject) and existing owners (`scimBlocksSsoSignIn`). The dashboard refuses manual removal/role changes of
    directory-managed members (except making them owner), and removing the SSO provider while a directory is
    connected. Every method of `/scim/v2/*` is limited per IP and per token (`withScimRateLimit`). Admin recovery:
    `disableOrganizationScim` (audited `organization.disable_scim`).
  - **2FA enforcement:** `organization.requireTwoFactor` (additional field, `input: false`; written only by
    `setOrganizationTwoFactorRequired` from org settings, which needs `organization:update` and an actor with 2FA).
    `requireOrgMember` redirects members without `user.twoFactorEnabled` to `/settings` — passkeys don't satisfy it
    (the password still works without a code). API keys are unaffected. Admin recovery: `resetUserTwoFactor` (audited).
  - `packages/auth` must not import `next/*` or `"server-only"` (the `auth` CLI loads `src/auth.ts` on Node).
    `nextCookies()` is appended last, only in `apps/web/src/lib/auth.ts`.
- **Tenancy rule:** every tenancy/email/webhooks function that touches tenant data takes `organizationId` and scopes its
  SQL by it; writes derive org/project from the environment row. Only `getMembership` (by slug), `authenticateApiKey`
  (from the key's binding), the platform-level `@coss/tenancy/admin` module (call it only after
  `requirePlatformAdmin*`), and these system-level functions resolve the org
  themselves (scoping every write by the row's own org): `recordProviderEvent`/`ingestProviderEvents` (from the email
  id tag), `applyTenantStatus` (prefix-checked tenant name), `authorizeLiveSender` (reads domain names across orgs),
  `recordOpen`/`recordClick` (from the email's tracking token), `trackingBaseUrlFor` (dispatch; reads domain names
  across orgs like `authorizeLiveSender`), `reencryptWebhookSecrets` (operator script), and the worker scans `runDueWebhookDeliveries`, `runDueLogDrainDeliveries`, `recheckDueDomains`,
  `recheckDueTrackingDomains`, `sweepStaleClaims`, `sweepUnclaimedEmails`, `runDueReputationEvaluations`, `runDueOrganizationDeletions`, `EmailService.dispatchDue`
  (and the dispatch job, from the job's `organizationId`). Server actions take only slugs +
  target ids and derive the org from `requireOrgPermission`; every Better Auth organization call passes `organizationId`
  explicitly (never rely on `session.activeOrganizationId`).
- **Client-safe modules** never import `@coss/db`: `@coss/observability/*`, `@coss/auth/{permissions,slugs,constants}`, `@coss/email/schemas`,
  `@coss/email/env`, `@coss/reputation/schemas`, `@coss/screening/env`, `@coss/webhooks/{schemas,env}`, `@coss/versioning`, `@coss/retention`, `@coss/logs/{schemas,query}`, `@coss/ui/*`, `@coss/ui/theme.css`. `@coss/webhooks`, `@coss/db/jobs`, `@coss/screening/{ai,runtime}` and `@coss/email/{runtime,ses,dispatch}` are server-only. Server-only web
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
  limiter applies each bucket's explicit `failureMode` on store errors and logs them: read-only API traffic allows,
  while authentication, writes, sends, quotas and public-ingress abuse controls deny. Never make it throw or block on Valkey. Never
  `FLUSH*`/`KEYS` (tests use random prefixes). Valkey time (`TIME`) is the clock, not the app's. API key buckets run
  after `requireApiKey` (a bad key spends no route bucket); key and aggregate-IP authentication buckets run before
  every database lookup, and `api.auth_failure` adds a client-IP penalty for bad keys. Send quotas are charged before `emailService.send` and refunded on replays and thrown errors.
  Client IPs come only from `clientIpResolver` (`CLIENT_IP_HEADER`, rightmost-trusted `x-forwarded-for` entry) —
  never trust a raw header. Emails are hashed into keys. Better Auth's built-in limiter stays off
  (`rateLimit: { enabled: false }`): `apps/web/src/lib/auth-rate-limit.ts` wraps the `/api/auth` POST handler. The
  ElastiCache user's ACL (`valkey-bootstrap.ts` `APP_ACCESS`) must list every command the client and the script use.
  Per-org overrides are changed in the admin console's organization page through `changeRateLimitOverride`, which
  records a `rate_limit.override_*` audit event (bucket, previous and new rule) in the same transaction (the
  `ratelimit:set` script writes without one). Rule values are stored as `integer` (`MAX_RULE_VALUE`).

- **Open/click tracking** (`packages/email/src/tracking*.ts`, tables `email_tracking_rule` (ids `etr_`) and
  `email_link` (ids `lnk_`)): COSS-owned, provider-independent (SES's own open/click tracking stays off — the
  configuration set must not subscribe to `OPEN`/`CLICK`). Per field, a send's `tracking` wins, then its category's rule,
  then the environment default (the rule with a NULL category), then off; the result is snapshotted on the `email` row
  (`track_opens`/`track_clicks` + a random `tracking_token`) at send. `email.html` always keeps the original:
  `deliver` instruments only the provider's copy (`instrumentHtml` splices the original string — never re-serialize
  customer HTML), storing the links first. Clicks redirect only to stored URLs. `email.opened`/`email.clicked` go through
  `recordProviderEvent` (source `coss`, deduplicated per minute and link) and never change a recipient's status;
  they name a recipient only when the email had exactly one non-suppressed recipient. Events store the user agent,
  never the IP. Settings need `environment:update`. The parsed send request omits `tracking` when absent (request hashes).
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
  (a `z.union([…, z.null()])`: `.nullable()` loses `null` in the OpenAPI document). Edge: Cloudflare's fallback
  origin `track.coss.com` → ALB rule `/t/*` + `X-Tracking-Origin-Verify` → api (`infra/aws/routing.ts`).
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
- **API versions** (`organization_api_version`, `webhook_endpoint.api_version`): an organization is pinned lazily to
  the latest version by its first authenticated request (`getOrganizationApiVersion`, insert-or-read; the dashboard
  only reads with `readOrganizationApiVersion`), and only moves forward (`setOrganizationApiVersion`, from org
  settings, `organization:update`). The outbox stores the latest-shape event; `renderWebhookPayload` renders it in
  the endpoint's version at every attempt and adds `api_version` (signed, in the body). Outbox payloads are typed
  `Stored*WebhookEvent` (no `api_version`). Never version error envelopes, and never transform in handlers.
- **Data retention** (`@coss/retention`): `RETENTION_DAYS` / `RETENTION_POLICY` are the only source of retention
  periods — the docs page (`/docs/data-retention`, `<RetentionTable />`/`<RetentionPeriod of>` MDX components, also
  rendered into `/llms*.txt`) and the dashboard's settings card render them, and each owning package's purge
  enforces them: `purgeExpiredEmails`/`purgeEmptyEmailBatches`/`purgeExpiredReputationRollups` (`@coss/email`),
  `purgeExpiredWebhookMessages` (`@coss/webhooks`), `purgeExpiredScreenings` (`@coss/screening`),
  `purgeExpiredReputationNotifications`/`purgeExpiredReputationEvents` (`@coss/reputation`),
  `purgeExpiredAuthRows`/`purgeExpiredAdminAuditEvents` (`@coss/tenancy/retention`). The worker's `retention` loop
  (`apps/worker/src/retention.ts`, every 10 min, 1,000 rows per step, back-to-back while a step fills its batch) runs
  them in order (emails before their batches). Purges are system-level `DELETE … WHERE id IN (oldest batch)` with
  the condition re-checked, take `{ now, limit, scope }` (always pass `scope` in tests), and rely on cascades for
  children. Never purge: `queued`/`scheduled` emails, messages with a `pending` delivery (suspended orgs' are held),
  an org's latest reputation transition (notifications compare against it), `content_screening_counter` (the
  sampling sequence), suppressions (they outlive their email; the dashboard hides "View email" past the cutoff).
  Email retention must exceed the reputation window (≤ 30 days) and rollup recounts (31 days) — a test checks it. A
  new table either gets a catalog entry + purge or is covered by an existing "while your account exists" rule; changing
  a period changes the published policy, so treat it like a terms change.
- **Webhooks:** deliver only through `createWebhookSender` (every resolved address must be public; the socket is pinned
  to the checked address; no redirects; 10 s timeout; 1 KB response excerpt). `allowPrivateNetworks`/insecure URLs are
  for non-production only. Payloads never include bodies, headers, cc or bcc. Secrets are AES-256-GCM encrypted with
  `WEBHOOK_SECRETS_KEY`, a key ring (`parseSecretsKeys`): stored as `v2:<key id>:<iv>:<ciphertext>:<tag>` (the
  `v2:<key id>` prefix is the AAD; ids are derived from the keys), encrypted with the first key, decrypted with the
  one named. Keyless `v1:` rows from before are still read by trying every key until `webhooks:reencrypt` rewrites
  them. Every write of a secret column goes through `encryptSecret`, and `reencryptWebhookSecrets` must cover every
  encrypted column (today the endpoints' `secret_ciphertext` and `previous_secret_ciphertext`, and `log_drain.secret_ciphertext`). Rotation runbook: README.md,
  "Rotating `WEBHOOK_SECRETS_KEY`". The initial upgrade from v1-only readers must use README.md's
  "Upgrading from v1 webhook secret storage" coordinated cutover, not a rolling deployment.
- **Delivery engine** (`@coss/webhooks/engine`): webhook deliveries, log drain batches (and future products) share
  `organizationNotHeld` (suspended or deleting orgs are held), `deliveryOutcome` (retry schedules; jitter only with
  an injected `random`), `sendAttempt`, `endpointHealth` and `runClaimed`; each product keeps its own tables and SQL.
  A claimed row's `lease_expires_at` is its fencing token: always bind it from a JS `Date` (`leaseUntil`), finish
  with a `stillOwned` update **first**, and write attempt rows, log lines and health changes only when that update
  matched, so a worker whose lease was taken over records nothing.
- **Endpoint health** (`webhook_endpoint.failing_since`, `disabled_reason` `manual`|`failing`, `disabled_at`; a CHECK
  keeps them consistent with `enabled`): a delivery that failed every attempt starts a streak, any success ends it
  (both written only when they change), and one failing for good 5 days into a streak
  (`DISABLE_FAILING_ENDPOINT_AFTER_MS`) disables the endpoint with a system `webhook_endpoint.disabled` audit event.
  Enabling it clears the streak. `recoverWebhookEndpoint` (`POST /v1/webhook_endpoints/{id}/recover`,
  `webhook:update`) requeues failed deliveries since a time, ≤ 1,000 per call, locking their parent messages first
  (in id order) like `retryWebhookDelivery`, so retention can't purge what it requeued.
- **Secret rolls** (`rollWebhookEndpointSecret`, `POST /v1/webhook_endpoints/{id}/roll_secret`, the dashboard's
  **Roll secret**, `webhook:update`): one UPDATE moves the current secret to `previous_secret_ciphertext` with
  `previous_secret_expires_at` (default a day, at most a week, `0` = none; both columns or neither, a CHECK) and
  stores a new one. Until then deliveries carry both signatures in `webhook-signature` (`signingSecrets`, checked at
  each attempt), which `verifyWebhook` already accepts. A second roll drops the older previous secret, so rolls are
  not idempotent and the SDK never retries them. The new secret is returned only in that response; reads expose
  `previous_secret_expires_at`, never a secret.
- **Platform admin** (`/admin`, `@coss/tenancy/admin`): every admin page calls `requirePlatformAdmin()` itself — Next
  renders layouts and pages in parallel, so the layout's check alone would still stream the page's data to non-admins
  (verified). Actions use `requirePlatformAdminAction()` and record an `admin_audit_event` (append-only; no FKs; the
  actor's email is copied; deleted after `RETENTION_DAYS.adminAuditLog`); suspension/key revocation write it in the same transaction. Admins can't act on
  themselves; never send session tokens to the browser (revoke-one looks the token up server-side).
- **Organization suspension** (`organization_suspension`, presence = suspended; reason is admin-internal): enforced in
  `authenticateApiKey` (`suspended` → 403 `organization_suspended`, only for otherwise-valid keys),
  `createEnvironmentApiKey`, webhook `claimDue` (held, not failed), the org hooks above, and the dashboard
  (`OrgContext.can()` / `requireOrgPermission` allow only reads). New write paths must respect it. Domain re-checks and
  SES event ingestion keep running. Gate dashboard controls with `can(…)` from `requireOrgMember`, not `orgRoleCan`.
- **Reputation guard** (`packages/reputation`, tables `reputation_standing` + `reputation_event`, ids `repev_`): the
  worker's `reputation` loop evaluates orgs whose `next_evaluation_at` is due — `recordProviderEvent` marks an org due
  (`markReputationDue`, same transaction) on every live permanent bounce or complaint, and warned orgs are re-checked
  hourly, as are unhealthy rates below minimum volume. Claims use a separate expiring lease; standing/policy
  revisions invalidate stale evaluations. Checks (`ReputationCheck`) measure; `decide` is the only automatic policy: worst severity wins, a warning
  clears when every check is `ok`, and **a suspension is never lifted automatically — only `reinstateOrganization`
  (platform admin, note required)**. The worker never suspends COSS's own organization (the
  `NOTIFICATIONS_ENVIRONMENT_ID`'s, passed as `systemOrganizationId` to the guard and `screenMessage`): `decide`
  turns its `suspend` results into a warning and screening downgrades its blocks to flags. Admins can't suspend it
  either: both admin suspend actions refuse it (`isSystemOrganization`) and the pages hide the buttons. Every change goes through `applyTransition` (guarded update + history row +
  `account.*` webhooks to live environments + a `reputation_notification` outbox row for warnings and suspensions,
  one transaction). Email's checks (`emailReputationChecks`) are per-recipient
  rates over live emails in the window (default 7 days, never before the last reinstatement), excluding
  suppressed/failed/queued/canceled recipients and `SIMULATOR_DOMAIN` (unless the `countSimulatorRecipients` override is on).
  Closed hours (ended ≥ `ROLLUP_SETTLE_MS` ago) are counted once into `email_reputation_rollup` (by email `created_at`,
  simulator counts kept apart); `recordProviderEvent` bumps an hour's `revision` when a live event changes its counts,
  and the next evaluation recounts only stale hours (CAS on the revision read before counting) plus the window's open
  edges live. Any new write path that changes recipient statuses must invalidate the same way;
  default thresholds (`DEFAULT_REPUTATION_POLICY`) are stricter than SES's. Suspension blocks live sending only:
  `authorizeLiveSender` checks `isSuspended` **first** (`EmailError("account_suspended")`, 403 `permission_error`; an
  idempotent replay still returns) and `liveKeyRestriction` refuses new live keys. It is independent of the SES tenant
  pause (`email_tenant.sending_status`, `sending_paused`), which SES itself lifts — never fold one into the other.
- **Logs** (`packages/logs`, `log_entry` (ids `log_`), `org_audit_event` (ids `oaudit_`)): one log per environment of
  every API request made with its keys (`api.request`, written by `requestLog` in `apps/api` after the response through
  the buffered `createLogWriter` — it **fails open** and never delays a request; `createApp` defaults to
  `noopLogWriter`), every email event (`recordProviderEvent` appends them in its transaction) and every webhook attempt
  (`webhook.attempt`, in the attempt's transaction). A log id's UUIDv7 time *is* its `occurred_at` (`toLogRow`,
  `idTimestamp`): ids alone are cursors and locate the partition — never insert `log_entry` rows any other way.
  Requests are logged only when attributable (a valid key; refusals for permissions/suspension included via
  `attemptedAuth`); `/health`, `/openapi.json`, `/t/*`, preflights and `GET /v1/logs*` are not. Bodies are kept only
  through `redactBody` (secret-named keys, base64 `content` replaced, strings cut at 2 KB, 16 KB overall) and headers
  through the allow-lists in `redact.ts` — never `Authorization`, cookies or attachment bytes. Reads are scoped by
  organization + environment and always bounded in time (partition pruning; the API allows ≤ 31 days). Facet counts
  ignore their own filter. Retention: the worker's `logs` loop keeps 7 days of partitions ahead and drops expired ones
  (`LOG_RETENTION_DAYS`); the default partition catches the rest. Search syntax lives in `@coss/logs/query`
  (`parseLogQuery`/`formatLogQuery`), shared by the dashboard. Permissions: `log:read` (every role and API key, backfilled
  by `0029`), `audit:read` (owners, admins, and every API key — only owners and admins create keys; backfilled by
  `0035`). `GET /v1/audit_events[/{id}]` (`coss.auditEvents`) reads the organization-wide audit log with a key of any
  environment; its reads, like `GET /v1/logs*`, are never request-logged (members can read environment logs, not the
  audit log). The audit log records changes from dashboard actions (`recordAudit`, after
  the change succeeded, best effort), API keys (`recordApiAudit`), Better Auth's invitation routes and platform admins
  (`supportAudit`: actor "COSS support", never the admin or their reason); new mutations should record one.
- **Log drains** (`log_drain` (ids `drain_`), `log_drain_record` (`drainrec_`), `log_drain_batch` (`drainbat_`),
  `log_drain_attempt` (`drainatt_`); management and delivery in `@coss/webhooks`, the outbox in `@coss/logs`): an
  environment's log lines (exactly the `GET /v1/logs` objects) and its environment-scoped audit events
  (`{ object: "audit_event", … }`; org-wide events never reach drains), filtered by `sources`. `appendLogEntries` and
  `recordOrgAuditEvent` select the environment's enabled drains under `FOR KEY SHARE` in the transaction that
  writes the line and its records (a savepoint inside the caller's); management and exhaustion take `FOR UPDATE`
  before changing eligibility — so every `log_entry` write path queues drain records without racing disable/delete;
  record ids ascend in write order and order delivery. The worker's `log-drains` loop (`runDueLogDrainDeliveries`,
  system-level) forms one open batch per drain at a time (partial unique index; the drain is locked `FOR NO KEY UPDATE
  SKIP LOCKED` so it never blocks lines being queued), ≤ 500 lines / 1 MB (`takeBatch`), and posts it through
  `createWebhookSender` as `application/x-ndjson`, Standard Webhooks-signed with `webhook-id` = the batch id (stable
  across retries). Retries back off over ~a day (`LOG_DRAIN_RETRY_DELAYS_MS`); an exhausted batch disables the drain
  (`disabled_reason = 'failing'`), drops its backlog and records a system `log_drain.disabled` audit event. Disabling
  by hand also drops the backlog; nothing is queued for a disabled drain. Suspended organizations' drains are held.
  Drain deliveries are never written to `log_entry` (that would feed itself). Retention (`purgeExpiredLogDrainBatches`):
  finished batches after `RETENTION_DAYS.logDrainBatches`, unbatched lines after `logDrainBacklog`. Lines are not
  versioned (like `GET /v1/logs`). Permissions: `logDrain` (members read; API keys all, backfilled by `0040`); revealing a
  secret needs `logDrain:update`.
- **Reputation notifications** (table `reputation_notification`, ids `repntf_`; `packages/reputation/src/notifications.ts`):
  the worker's `reputation-notifications` loop (`runDueReputationNotifications`, system-level) emails a warning or
  suspension to the org's owners and admins with a **verified, unbanned** address, looked up at send time — one email
  per person through a `ReputationNotifier`. The worker wires `emailNotifier` (`@coss/email`): a normal
  live send from COSS's own environment (`NOTIFICATIONS_ENVIRONMENT_ID`/`NOTIFICATIONS_FROM`, category `account`,
  tracking off), so suppression, events and quotas of that org apply; idempotency key `<notification id>:<user id>`
  (non-expiring for these internal sends; `idempotency_key_reused` counts as sent). Only the org's latest transition
  is announced (a warning overtaken by a suspension or a recovery is `skipped`), as are ones older than 3 days or
  with nobody to receive them. Claims push
  `next_attempt_at` out by a 5-minute lease; failures back off 1, 2, 4… min and become `failed` after 8 attempts.
  Content is customer-facing: trigger label, the checks' messages, advice and a dashboard link — never screening
  scores or admin notes. Recoveries and reinstatements send no email (`NOTIFIED_TRANSITIONS`).
- **Content screening** (`packages/screening`, tables `content_screening` (ids `scr_`) + `content_screening_counter`):
  `screenMessage` runs in the worker for **live** messages only, inside `complete()` right before `provider.send` (after
  the claim, so the stale-claim sweep covers a crash) — the `screen` option of `createEmailService`, wired only by the
  worker. A product passes `product` + `subjectId` + a lazy `content()` (plain text, `prepareText`/`prepareLinks`:
  truncated to 8,000 chars, link hosts+paths without query strings); the screening package never imports a product, so
  SMS reuses it as is. Sampling (`ReputationPolicy.contentScreening`, per-org overrides in the admin `PolicyForm`): the
  first `alwaysFirst`, the `milestones`, then `sampleRate` at random — never make it fully predictable. The position
  comes from one `INSERT … ON CONFLICT … RETURNING new.seen, old.owed` (Postgres 18). Classifier errors/timeouts
  (3 s) record an `error` verdict and owe the sample to the next message. Enforced screening holds that email as
  `content_screening_unavailable`; shadow mode and COSS's own notification organization send it. An unexpected
  `screen` throw follows the same default-deny rule, with that notification organization as the only allowlist entry.
  Highest category score ≥ `blockThreshold` → `blocked`: the email fails `content_rejected` and
  `suspendOrganization(trigger "content_screening")` in the verdict's transaction; ≥ `flagThreshold` → `flagged`
  (sent, `markReputationDue`); `contentScreeningCheck` turns enforced verdicts in the window into `suspend`/`warning`.
  `enforce: false` is shadow mode (record only); `enabled: false` screens nothing. Verdict rows never store content;
  scores are admin-only (customers see `content_rejected` and the standing, never an oracle). The AI adapter asks one
  boolean question per category with `experimental_decide` (renamed from `experimental_evaluate`), passes the message
  as JSON state with "untrusted data" in every instruction, and always requests Gateway `zeroDataRetention`.
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
  `deleting`, tracking hostnames, identities, domain rows, then the SES tenant via `DeleteTenant`, prefix-checked), deletes bulky data
  (including SCIM directory records, environment logs, log drain records/batches and the org audit log) in batches of `DELETION_BATCH_SIZE` along indexed columns, then deletes the organization row
  (cascading the rest) and marks the row `completed` in one transaction. A new table with a lot of rows per
  organization belongs in `deleteOrganizationData`; anything held outside Postgres (a new provider resource)
  belongs in `releaseProviderResources`. Admin audit events are kept (no FKs).
- **Monitoring** (Sentry, `@coss/observability`): api and worker import `src/instrument.ts` first in `src/index.ts`
  (`@sentry/bun`; Bun has no runtime module hooks, so Hono gets `honoMiddleware(app)` in `createApp` — route names
  only, errors come from `onError`'s `console.error` — and pg/AWS calls aren't traced). The dashboard initializes
  its server in `register()` after env validation and exports `onRequestError`; both Next apps' browsers run
  `initBrowserMonitoring` (`src/instrumentation-client.ts`), which fetches the config from the dashboard's
  `/api/monitoring` (public in `proxy.ts`; the site proxies it in `next dev`) and tunnels envelopes through it
  (only the configured DSN's — never make it an open relay or add a Sentry origin to a CSP). Every server runs
  `captureConsoleIntegration({ levels: ["error"] })`: a `console.error` with an error **is** a Sentry event, so
  packages keep logging handled failures that way and never import an SDK (expected outcomes don't belong in
  `console.error`). Every SDK uses `sentryOptions`: `DATA_COLLECTION` turns off what SDK v11 collects by default (bodies, IPs, cookies, query strings, AI prompts, local variables — never loosen it) and the `scrub*` hooks mask what remains; new URL secrets
  (tokens in paths) go in `SECRET_PATH_SEGMENTS` (`packages/observability/src/scrub.ts`). Tags: `request_id`,
  `organization_id`, `environment_id`, `api_key_id` (API), user id + `organization_id` (dashboard), `loop`,
  `email_id` (worker); never emails or content. No session replay (it would record customer data).
- **Live keys** (`coss_live_`) require a verified email and can't be created while impersonating or reputation-suspended (`liveKeyRestriction`,
  `apps/web/src/lib/live-keys.ts`, enforced in the action and mirrored in the UI).
- **Email preview iframe** (`…/emails/[emailId]/page.tsx`): `sandbox=""`, `referrerPolicy="no-referrer"`, CSP
  `PREVIEW_HEAD` prepended to `srcDoc`. Never add `allow-scripts` or `allow-same-origin`.
- **Account emails** (table `auth_email`, ids `authml_`; `packages/auth/src/emails.ts`): Better Auth's
  `sendVerificationEmail`/`sendResetPassword`/`sendInvitationEmail` only queue a row (`enqueueAuthEmail`, outside
  Better Auth's transaction — so `user_id` has no FK, and a missing user is retried for 5 minutes before it is
  skipped); outside production they also print the link to the dashboard's console as `[auth] …` lines. The worker's
  `auth-emails` loop (`runDueAuthEmails`, every 2 s, only when `NOTIFICATIONS_*` are set) sends them through
  `emailNotifier({ discardBody: true })` with the row id as idempotency key — the same lease/backoff/attempts as
  reputation notifications. Links are secrets: the row's `url` is cleared when it settles, and `discardBody` makes
  `purgeSendContent` clear the stored email's `html`/`text` when it leaves `queued`/`scheduled` (internal sends only;
  never expose it on the API). Skipped: expired links (verification and reset: 1 h, `VERIFICATION_LINK_TTL_S`/
  `RESET_PASSWORD_LINK_TTL_S`, also passed to Better Auth; invitations: their `expiresAt`), already-verified
  addresses, banned or changed accounts, invitations no longer pending. User-chosen names are escaped and kept on one
  line in subjects.

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
- Logs are best effort: request lines are buffered (up to 1 s, dropped if the database is down), requests with an
  invalid or missing key can't be attributed and aren't logged, and free-text search is a substring match. Facets and
  the histogram scan the selected range, so very long ranges on busy environments are slow (no rollups yet).
- Webhook deliveries are not ordered (use `data.occurred_at`; SES itself may publish a complaint before the
  delivery). SES complaints may list every recipient on the complaining domain (and each of them gets suppressed).
  SES never suppresses mailbox-simulator addresses, and with tenant-level suppression `suppressionlist@simulator.amazonses.com` is a plain hard bounce — only
  the fake provider simulates `suppressed` (via that address).
- Content screening only samples (a sender can still get unsampled messages through, until the random sample or
  bounces/complaints catch up) and its scores are uncalibrated model probabilities; thresholds were chosen, not
  measured against labeled COSS traffic. Injected text in a message can lower its scores. An org-wide suspension from
  one false positive needs an admin to reinstate.
- Tracking does not filter bots: mail clients that prefetch images (e.g. Apple Mail Privacy Protection) inflate opens
  and link scanners inflate clicks. Providers send one message to every recipient, so hits on emails with several
  recipients have `recipient: null`.
- Rate-limit outage behavior is explicit per bucket: read-only API traffic fails open, while security and cost
  controls fail closed. Override changes take up to a minute (per-process cache). Without `CLIENT_IP_HEADER`, public
  unauthenticated entry points use a per-process aggregate subject instead of a client IP. Sign-in is also limited per email address, so
  someone hammering an address delays its owner's sign-in for as long as they keep at it (accepted).
- SSO domains must be verified **email** domains, so an organization that signs in with a domain it doesn't send
  from still adds it under Domains (which creates an SES identity). OIDC IdPs must be public `https://` hosts.
  SAML errors after the IdP step land on the callback URL (`?error=`), not on `/sso`. The SAML path is covered by
  Better Auth's own tests only (ours drive OIDC against oauth2-mock-server).
- Directory sync only manages members and admins: owners are never added, demoted or removed by it (a directory
  deactivating an owner shows a warning on the SCIM page), and groups only map to roles. Directory users must sign
  in through the organization's SSO provider, so SCIM needs one.
  Disconnecting keeps every member. Profile changes of linked (pre-existing) accounts are not synced.
- Next's cache is per task (nothing uses ISR or `revalidateTag` yet; add a shared `cacheHandler` first).
- Abuse prevention is best-effort: the disposable list only knows public burner services (refresh it), one-account-
  per-mailbox folds only well-known providers' dots/`+tags`, the DNS check lets every lookup failure through, and a
  Cloudflare siteverify outage blocks password sign-in, sign-up and reset (passkeys and SSO keep working).
- Accepted: sign-up email enumeration. A user ban does not cut off their orgs' API keys (keys
  are org-owned) — suspend the organization. Suspension does not pause the SES tenant itself;
  already-queued immediate sends finish, while scheduled sends wait for the suspension to be lifted.

- Account emails go to unverified addresses by design (sign-up verification, invitations) from COSS's own
  organization, so bounces from made-up sign-up addresses count against that organization's reputation like any
  customer's — but the worker never suspends it on its own (`systemOrganizationId`: the guard only warns it and a
  screening block only flags its message), and neither can platform admins (the dashboard reads the same variable).
  If it was suspended before this rule, an admin can still lift it. Sign-up and verification
  resends are rate limited per IP and address; invitations only by Better Auth's pending-invitation limit per org.
- Reputation rollups are kept per hour of email creation, so late events for an old hour make the next evaluation
  recount that whole hour. A send already past `authorizeLiveSender` when the org is suspended still goes out.
  Customers are told by banner, page, API, webhooks and a notification email to owners/admins — only for warnings
  and suspensions (not recoveries or reinstatements), and only once the worker's `NOTIFICATIONS_*` variables point
  at a verified sender of COSS's own organization.

**Not built yet** (don't assume these exist; delete a line when it ships): the real landing page, the AWS
infrastructure itself (only its spec, images and runbook exist), tracking settings over the API,
log drain secret rolls and custom request headers (vendor intake APIs that need an API key header take a relay),
IdP-initiated SAML and SAML single logout, more than one SSO provider per organization,
org logos, user account deletion (before adding it: `sso_provider.user_id` and `member.user_id` cascade, which
would drop an org's SSO provider or last owner), email change, npm publishing of the SDK,
email/SMS two-factor codes, "trust this device" for 2FA, renaming passkeys.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
