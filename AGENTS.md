# AGENTS.md — COSS monorepo

COSS is a unified developer platform: one API key + one SDK (`coss.email.send()`, later SMS, video,
scheduling…). This repo holds the dashboard, the public API, shared packages and the public SDK.
Email delivery goes through the provider interface in `packages/email/src/provider.ts` (Amazon SES v2 with one SES
tenant per organization, or the fake provider); sandbox environments always use the fake provider. Delivery events
drive per-recipient status and signed customer webhooks. Environments also receive email (an SES receipt rule → S3 +
SQS → the worker; see "Receiving email" below). A sample of live messages is screened by an AI decision model
(`@coss/screening`) before it is sent. Plans, contracts, metered usage, credits and invoices are `@coss/billing`
(COSS rates usage itself; Stripe, behind a provider interface, only collects). Rate limits (per API key, per-org send quotas, dashboard
auth) are counted in Valkey (ElastiCache Serverless in production) by `@coss/ratelimit`. Errors and traces go to
Sentry (organization `cosscom`) through `@coss/observability`. COSS Risk (`@coss/risk`, `coss.risk.assess()`) assesses customers' sign-ups, logins and other
events: email/IP signals (`@coss/signals`), content scores, plus what each environment remembers (velocity in Valkey,
duplicate mailboxes, fraud reports, allow/block lists) and its rules become `allow`/`review`/`block` with reasons; the
signals are also building blocks of their own, next to rate limiting as a service (`coss.risk.limit()`). Human setup docs (incl. running on SES): [README.md](./README.md).

## License

`AGPL-3.0-only` (root `LICENSE`), except `packages/sdk` (MIT, its own `LICENSE`: customers bundle it), `packages/mcp`
(MIT, published with the SDK), `packages/kloq` (MIT, vendored) and the fonts (OFL). New code is AGPL unless it lives in
one of those; never copy AGPL code into the SDK or the MCP server. Outside contributors sign the CLA (`CLA.md`, enforced by cla-assistant.io on pull requests; the agreement
text it shows is a gist that must match `CLA.md`: change both together, as a new version).

## Layout

| Path | Package | What |
|---|---|---|
| `apps/web` | `@coss/web` | Next.js 16 dashboard (:3000). Hosts Better Auth at `/api/auth/*`. |
| `apps/api` | `@coss/api` | Hono on Bun public API (:3001): `/v1/*`, `/openapi.json`, `/health`. Commits its OpenAPI document as `openapi.json`. |
| `apps/site` | `@coss/site` | coss.com (:3002): placeholder landing page, Shipyard's landing page and docs at `/shipyard`, kloq's pages at `/kloq` (landing page, demo, tools, comparisons, docs, shadcn registry) + Fumadocs docs at `/docs` (guides, Twoslash-checked SDK docs, API reference generated from `apps/api/openapi.json`). See `apps/site/AGENTS.md`. |
| `apps/portal` | `@coss/portal` | The Hooks portal (:3003) on its own domain (production: `portal.cosshooks.com`, Cloudflare → ALB, `PORTAL_HOST` in `infra/aws/routing.ts`): customers' users manage one application's endpoints and see its deliveries, signed in by a session the customer's backend creates (token in the URL fragment, never a cookie). See `apps/portal/AGENTS.md`. |
| `apps/mobile` | `@coss/mobile` | Expo (SDK 57) iOS companion app mirroring the dashboard's pages (organization: projects, reputation, domains, members, billing, audit log; environment: emails, received, suppressions, tracking, risk with rules and lists, Hooks, API keys, webhooks, logs, log drains), mostly read-only, signed in through the dashboard (browser hand-off + PKCE) and using its `/api/mobile/v1/*`, with push notifications (APNs) for alerts. Not deployed by `infra`. See `apps/mobile/AGENTS.md`. |
| `apps/smtp` | `@coss/smtp` | Bun SMTP relay (`smtp.coss.com`; locally :2465 implicit TLS, :2587 STARTTLS) on `smtp-server`: username `coss`, an API key as the password; each message becomes a `POST /v1/emails` request (`@coss/email/smtp`) stored through the same email service, rate limits and quotas. Behind an NLB; terminates TLS itself (exported ACM certificate). |
| `apps/worker` | `@coss/worker` | Bun background worker: email dispatch (pg-boss), scheduled sends, webhook deliveries, domain re-checks, stale-claim/unclaimed sweeps, data retention purges, organization deletions, SES events and received emails from SQS (`EMAIL_PROVIDER=ses`). `scripts/ses-bootstrap.ts`. Safe to run several. |
| `packages/db` | `@coss/db` | Drizzle schema (generated Better Auth tables + domain tables), pg client, TypeIDs, migrations, test guard; `./jobs` (pg-boss); `./idempotency` (`withIdempotencyKey`, request hashes); `./partitions` (daily range partitions: create ahead, drop expired). |
| `packages/signals` | `@coss/signals` | Stateless abuse signals shared by COSS's sign-up and risk: `./email` (syntax, disposable domains, MX/null-MX/NXDOMAIN with a cache, canonical mailbox, role accounts, free providers, typo suggestions), `./ip` (bogons, subnets, CIDR range sets, `IpIntelligence`: Tor, cloud/hosting networks, ASN, country), `./datasets` (parsers for the public IP feeds and IPinfo Lite's MMDB), `./testing` (`buildTestMmdb`). No workspace deps, no database; server-only. |
| `packages/auth` | `@coss/auth` | Better Auth options/instance (organization, admin, api-key, two-factor, passkey, sso, scim, captcha plugins), org permissions, slug rules, the sign-up email guard (`src/email-guard.ts`, built on `@coss/signals/email`); `./social`: Google/GitHub sign-in (server-only); `./risk`: the injected sign-up risk assessor (COSS Risk on COSS's own sign-ups); `./sso`: SSO trust rules; `./scim`: directory sync rules (both server-only); `./emails`: the account email outbox; `./mobile`: the iOS app's sign-in (PKCE codes, bearer sessions; server-only). |
| `packages/tenancy` | `@coss/tenancy` | Projects, environments, environment-bound API keys (create/authenticate), memberships, organization SSO settings, directory sync (SCIM) connections and group roles, seed/admin scripts, test fixtures; `./admin`: suspensions, SSO/SCIM recovery, organization deletion, audit log and cross-org reads; `./deletion`: organization teardown (imports only `@coss/db`). |
| `packages/email` | `@coss/email` | Email product: wire schemas, providers (fake, SES under `./ses`), send/dispatch/read, recipients + event ingestion, domains/DNS, custom tracking domains (Cloudflare for SaaS), receiving (received emails, receiving domains, managed inbound addresses, the content store), templates (drafts, versions, locales, rendering at send), tenants, sweeps; `./templates` (the template language: parse, check, render, variable validation; client-safe, no imports), `./dispatch` (pg-boss queue + worker handler), `./runtime` builds providers from env, `./admin` (the admin console's cross-org reads), `./env` (zod only), `./testing`. |
| `packages/ratelimit` | `@coss/ratelimit` | Rate limits: bucket catalog, GCRA in Valkey (Lua) or memory, per-org overrides (`rate_limit_override`), client IP resolution; `./env` (zod only), `./testing`. `scripts/valkey-bootstrap.ts`, `scripts/set-override.ts`. |
| `packages/webhooks` | `@coss/webhooks` | Product-agnostic webhooks: endpoints (secrets encrypted with a key ring, secret rolls), outbox, SSRF-safe signed delivery with retries, secret re-encryption, endpoint auto-disable and recovery; log drains (management, signed NDJSON batch delivery, retention); `./engine` (the delivery engine shared by every product: holds, lease fencing, retry outcomes, the HTTP attempt, endpoint health, a bounded runner); `./schemas`, `./env` (zod only). |
| `packages/reputation` | `@coss/reputation` | Reputation guard: per-org standing (`good`/`warning`/`suspended`), history, pluggable checks, the worker's evaluation scan, admin reinstatement, `account.*` webhooks, notification emails to owners/admins (outbox + `ReputationNotifier`); `./schemas` (zod only: policy, wire schemas, trigger labels). |
| `packages/hooks` | `@coss/hooks` | Hooks, webhooks as a service: applications (one per customer's end user, by id or `uid`), event types, endpoints (own secrets, filters, rate limits, auto-disable), messages fanned out to deliveries (day-partitioned, idempotent sends), the delivery worker on the shared engine, endpoint recovery, portal sessions and settings; `./schemas`, `./env` (zod only), `./testing`. |
| `packages/screening` | `@coss/screening` | Product-agnostic AI content screening: sampling per org + product, the `ContentClassifier` interface (`./classifier`; content kinds `email`, `sms` and `text`, the last for risk's user content; Vercel AI SDK `experimental_decide` adapter under `./ai`, `fakeClassifier` in `./testing`), `prepareText`/`prepareLinks` (`./text`), verdict history, the `content_screening` reputation check; `./env` (zod only), `./runtime`. `./classifier`, `./text`, `./ai`, `./runtime` and `./testing` import no workspace package. |
| `packages/risk` | `@coss/risk` | Risk assessments: `assessRisk` (signals under a time budget, scoring, decision, one transaction with the log line, mailbox identity and `risk.assessment.review` webhook), velocity (`VELOCITY_SCRIPT` in Valkey or memory), lists, feedback + fraud memory, forgetting users, IP datasets (`refreshDueDatasets` in the worker, `createIpIntelligenceSource` in the API), the building blocks (`checkEmail`, `checkIp`, `classifyContent` in `lookups.ts`), customers' rate limit buckets (`checkRiskLimit` in `limits.ts`), device tokens (`device.ts`), IP privacy data (`privacy.ts`, `ipinfoPrivacyLookup`), calibration from feedback (`calibration.ts`), sandbox fixtures, purges; `./schemas` (zod only: wire schemas, `REASONS`, `VELOCITY_RULES`, `RISK_EVENT_TYPES`), `./env` (zod only), `./runtime`, `./datasets`, `./testing`. |
| `packages/billing` | `@coss/billing` | Plans and billing: the price catalog (`./catalog`: meters, list rates, plans, entitlements, add-ons) and contract terms (`./schemas`), both client-safe; the pure rating engine (`./engine`); accounts, contracts (self-serve and sales), hourly metered usage (`./metering`, the only module products import), credit grants and their ledger, month closes, invoices, payments, credit notes, dunning and holds, usage alerts, plan enforcement (`PlanGate`/`UsageGate` types in `./gate`), providers (fake, manual, Stripe under `./stripe`), the public API's read models and `billing.*` webhook events (wire schemas in `./wire`, client-safe); `./env` (zod only), `./runtime`, `./testing`. `scripts/seed.ts`, `scripts/close-period.ts`. |
| `packages/observability` | `@coss/observability` | Sentry setup shared by every app: env shape (`./env`, zod only), `sentryConfig`/`sentryOptions`, PII scrubbing (`scrubEvent`), the browser init (`./browser`), the dashboard's envelope tunnel (`./tunnel`) and `withSentryConfig` options (`./build`). Takes each app's SDK; depends on no framework SDK and no workspace. |
| `packages/logs` | `@coss/logs` | Environment logs and the org audit log: the day-partitioned `log_entry` table (API requests, email events, webhook attempts), the buffered fail-open request writer, queries (keyset pages, histogram, facets, related lines, CSV/NDJSON export), partition retention, `org_audit_event`, the log drain outbox (`log_drain_record`, written by `appendLogEntries`/`recordOrgAuditEvent`); `./schemas` + `./query` (search syntax; zod only), `./testing`. |
| `packages/versioning` | `@coss/versioning` | Dated public API versions (`Coss-Version`): `API_VERSIONS`, the `VERSION_CHANGES` registry and the engine that renders latest-shape responses/webhook payloads in older versions and upgrades older request bodies. Zero deps, client-safe; `./testing` (`testVersioning()`). |
| `packages/push` | `@coss/push` | Push notifications to the iOS app: devices (one per app session), the outbox products enqueue into (`enqueuePush`, in the deciding transaction), recipients (role + `orgAccess`) and content resolved at send time, the worker's send loop; `./apns` (APNs over `node:http2`, ES256 provider tokens), `./schemas` (zod only: categories, kinds, registration), `./testing` (`FakePushSender`, `createTestPushDevice`). |
| `packages/companion` | `@coss/companion` | Wire types of the dashboard's iOS app API (`/api/mobile/v1/*`): plain TypeScript types, zero deps, client-safe. |
| `packages/retention` | `@coss/retention` | The data retention policy: `RETENTION_POLICY` (published by the docs and the dashboard) and `RETENTION_DAYS` (enforced by each package's purge, run by the worker). Zero deps, client-safe. |
| `packages/ui` | `@coss/ui` | coss ui components (shadcn `@coss` registry, Base UI) + `theme.css` (tokens), `globals.css` (the dashboard's stylesheet) and `./fonts` (`next/font/local`: Cal Sans as `fontSans`/`fontHeading` and, upright only, `fontCalSans`; Paper Mono as `fontMono`). |
| `packages/sdk` | `coss` | **Public** SDK. Zero deps, ESM-only, built with tsdown. `coss/device` is its browser-only entry (risk's device tokens). |
| `packages/mcp` | `coss-mcp` | **Public** MCP server (`npx coss-mcp`, stdio, Node): tools for coding agents built only on the published `coss` SDK — find emails and diagnose delivery (`diagnose.ts`, pure), send, suppressions, domains, webhook deliveries, received emails, logs, account status. See "MCP server" below. |
| `packages/kloq` | `kloq` | The kloq library (the `cosscom/calendar` repository's `packages/kloq/src`, tests left out): the `<Kloq>` calendar, its themes, settings dialog, design mode and stylesheet. Vendored (excluded from Biome, `noUncheckedIndexedAccess` off); also what `/kloq/r/kloq.json` serves as source. Used only by `apps/site`. |
| `tooling/typescript` | `@coss/tsconfig` | Shared tsconfig bases. |
| `infra` | `@coss/infra` | AWS deployment spec (ECS services, env vars, ALB rules, CloudFront behaviours), checked by tests, and the production Terraform + deploy scripts that apply it. See `infra/AGENTS.md`. |

Runtime dependencies: `observability` (no workspace deps) ← `api`, `worker`, `web`, `site`, `portal`, `smtp`, `infra`; `signals` (no workspace deps) ← `auth`, `webhooks`, `risk`; `db ← auth ← tenancy`,
`db ← logs ← webhooks ← risk` (`risk` also `→ signals, ratelimit, retention, screening` — only screening's DB-free `./classifier`, `./text`, `./runtime`, `./testing`; `email` imports only `@coss/risk/schemas`, for `WEBHOOK_EVENT_TYPES`), `db ← logs ← webhooks ← reputation ← screening ← email`, `reputation ← hooks`, `db ← ratelimit`, `db ← push ← webhooks, hooks, reputation, billing, risk, worker, web` (`push` also `→ retention` and only `@coss/auth/{permissions,org-access}`), `webhooks ← billing ← email` (packages take
`billing`'s plan checks injected — `PlanGate`, `UsageGate`, and in webhooks the structural `WebhookPlanLimits`, since
billing enqueues `billing.*` events through it — and email imports only `./metering`, `./gate` and `./wire`); `versioning` (no deps) ← `tenancy`, `webhooks`, `email`, `billing` (`schemas`/`wire` examples);
`retention` (no deps) ← `tenancy`, `webhooks`, `reputation`, `screening`, `email`, `hooks`, `billing`, `push`, `worker`, `web`, `site`, `mobile`;
`api → tenancy, email, hooks, reputation, webhooks, ratelimit, versioning, logs, billing, risk, screening (`./env` only), db`;
`smtp → tenancy, email, ratelimit, logs, billing, observability, db`;
`web → auth, tenancy, email, hooks, reputation, screening, webhooks, ratelimit, versioning, retention, logs, billing, risk, push, companion, db, ui`; `mobile → companion` (types only; a dev dependency), `retention` (bundled by Metro: keep it dependency-free); `portal → hooks, webhooks, ratelimit, logs, observability, db, ui`; `site → ui, auth, versioning, retention, billing, risk` (only the client-safe `@coss/auth/slugs`, the changelog, the retention policy, `@coss/billing/{catalog,money,engine}` and `@coss/risk/schemas`) +
`@coss/api/openapi.json` (data only, never api code); `infra → auth, email, hooks, ratelimit, screening, billing` (`slugs`, `env` only);
`worker → auth (`./emails` only), email, hooks, reputation, screening, webhooks, ratelimit, logs, risk, push, tenancy, retention, billing, db` (from tenancy only `./retention` and `./deletion`, which import nothing but `db`); `sdk`, `ui`, `kloq` and `companion` depend on no workspace (`site → kloq`); `mcp` depends only on the published `coss` (a semver
range, not `workspace:`).
Dev-only: `email`/`webhooks`/`hooks`/`reputation`/`screening`/`ratelimit`/`logs`/`billing`/`risk`/`push`/`worker → tenancy` (test fixtures — so tenancy and auth must never import email, webhooks, screening, ratelimit, logs or billing (plan limits reach Better Auth through `setMembershipLimitResolver` from `@coss/auth/limits`); Better Auth's own audit events reach the log through `setOrgAuditRecorder` from `@coss/auth/audit`) and
`api`/`worker`/`site → coss` and `api → coss-mcp` (SDK and MCP contract tests and the docs' Twoslash snippets — turbo builds the SDK before their
`typecheck`/`test`, and before the site's `dev`/`build`). `web → coss` is a runtime dependency: the sign-up form sends
`coss/device`'s token (turbo builds the SDK before the dashboard's `dev`/`build` too).

## Commands (repo root)

Prerequisites: Bun (version in `packageManager`), Node ≥ 24, Postgres with `coss` and `coss_test` databases,
Valkey (or Redis) at `TEST_VALKEY_URL` for the ratelimit/api tests.

```sh
bun install                 # never npm/pnpm/yarn
bun run dev                 # web :3000 + api :3001 + site :3002 + portal :3003 + smtp :2465/:2587 + worker (turbo TUI; agents: bunx turbo run dev --ui=stream)
bun run --cwd apps/mobile ios  # the iOS app on the Simulator (Xcode; needs `bun run dev` for the dashboard)
bun run lint                # biome ci .            bun run format → biome check --write .
bun run typecheck           # tsc --noEmit per workspace (TS 7); web runs `next typegen` first; builds the SDK first
bun run test                # migrates TEST_DATABASE_URL, then `bun test` in every workspace (uncached; SDK built first)
bun run build               # next build + SDK build (tsdown, publint, attw)
bun run db:generate         # drizzle-kit generate after editing packages/db/src/schema/*.ts (or after auth:generate)
bun run db:migrate          # apply migrations + install/upgrade the pg-boss schema on DATABASE_URL
                            #   (db:migrate:test → TEST_DATABASE_URL); db:studio
bun run auth:generate       # regenerate packages/db/src/schema/auth.ts after changing Better Auth plugins/options,
                            #   then bun run db:generate && bun run db:migrate
bun run signals:update-disposable  # refresh the vendored disposable-domain list (review the diff before committing)
bun run openapi:generate    # rewrite apps/api/openapi.json after changing API routes (a test fails when stale)
bun run changeset           # describe an SDK or MCP server change (CI requires one when packages/{sdk,mcp}/src
                            #   changes; --empty if none)
bun run version-packages    # apply changesets: bump the SDK's (and coss-mcp's) package.json, src/version.ts,
                            #   CHANGELOG.md, bun.lock
                            #   (CI's Release workflow opens a "Version packages" PR doing this; merging it publishes to npm)
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
bun run --cwd apps/worker hooks:load [--applications 20 --endpoints 3 --messages 2000]
                                               # Hooks load test on the test database: send and
                                               #   delivery throughput, the claim query's plan
bun run webhooks:reencrypt [--dry-run]         # re-encrypt webhook endpoint secrets with the first
                                               #   WEBHOOK_SECRETS_KEY (step 3 of a key rotation, README)
bun run billing:close-period --org acme [--at 2026-11-01T00:20:00Z]
                                               # development only: close billing months as if it were --at
                                               #   (see this month's invoice early); the worker collects it
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
| `PORTAL_PUBLIC_URL` | api, web ("Open portal"): origin of the Hooks portal (`apps/portal`, its own registrable domain); portal session links point there. Default `http://localhost:3003` outside production |
| `API_PORT`, `API_PUBLIC_URL` | `apps/api` (port; OpenAPI `servers` and email tracking URLs, falls back to the request origin outside production); `API_PUBLIC_URL` also `apps/worker` (email tracking) and `apps/web` (quick-start snippets, read at runtime) |
| `API_CORS_ORIGINS` | `apps/api`: comma-separated browser origins allowed on `/v1/*` (the docs' playground); default `https://coss.com`, locally `http://localhost:3002` |
| `EMAIL_PROVIDER` | api, web, worker: provider for live environments (`fake` or `ses`); shape in `@coss/email/env` |
| `AWS_REGION`, `SES_CONFIGURATION_SET`, `SES_TENANT_PREFIX` | required with `EMAIL_PROVIDER=ses` (api, web, worker); printed by `ses:bootstrap`. AWS credentials come from the default chain (`globalPassThroughEnv` in `turbo.json`) |
| `TRACKING_DOMAIN_PROVIDER`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, `TRACKING_CNAME_TARGET` | api, web, worker: custom tracking domains (`fake` default, or `cloudflare`: Cloudflare for SaaS custom hostnames on the cosslinks.com zone, which needs the token and zone id); customers CNAME to `TRACKING_CNAME_TARGET` (default `track.cosslinks.com`); shape in `@coss/email/env` |
| `TRACKING_PUBLIC_URL` | api + worker + smtp: origin of the open/click tracking links in emails (default `API_PUBLIC_URL`; smtp: required in production, locally `http://localhost:3001`); production `https://track.cosslinks.com`, a domain of its own so senders' abuse never lands on coss.com |
| `SES_EVENTS_QUEUE_URL` | worker with `EMAIL_PROVIDER=ses`: the SQS queue of SES events |
| `INBOUND_MANAGED_DOMAIN`, `SES_INBOUND_BUCKET` | api, web, worker: receiving. The managed inbound domain (`<label>.<domain>` addresses per environment; default `inbound.coss.test` with the fake provider) and, with SES, the bucket received content lives in (both or neither with SES; unset → receiving off). Printed by `ses:bootstrap --managed-domain` |
| `SES_INBOUND_QUEUE_URL` | worker with SES receiving: the SQS queue of receipt notifications |
| `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `APNS_TOPIC`, `APNS_ENVIRONMENTS` | worker: push notifications to the iOS app through APNs with a token-based `.p8` key (its id, the Apple Developer team, the PEM contents — `\n` line breaks accepted — the bundle id, default `com.coss.ios`, and the gateways the key serves, default `production,sandbox`; devices registered for another are skipped). The first three together or none; unset → printed in development, held in production |
| `NOTIFICATIONS_ENVIRONMENT_ID`, `NOTIFICATIONS_FROM` | web reads the id only to refuse admin suspensions of COSS's own organization (`isSystemOrganization`, `apps/web/src/lib/system-organization.ts`); worker: account emails (verification, password reset, invitation) and reputation notification emails go out through COSS's own email product from this live environment (of COSS's own org) and sender (on one of its verified domains). Both or neither; unset → held in production (account email links are printed by the dashboard outside production) |
| `SMTP_HOSTNAME`, `SMTP_IMPLICIT_TLS_PORT`, `SMTP_STARTTLS_PORT` | smtp: the relay's name (greeting, certificate; production `smtp.coss.com`) and the ports it listens on (default 2465/2587; the NLB maps 465/587 onto them) |
| `SMTP_TLS_CERTIFICATE_ARN`, `SMTP_TLS_PASSPHRASE` | smtp (production, both required): the exportable ACM certificate the relay exports at start and every 12 hours, and the passphrase that encrypts the exported key in transit. The ARN is set by Terraform (`generated_env`) |
| `SMTP_TLS_CERT_FILE`, `SMTP_TLS_KEY_FILE` | smtp (development): a certificate from files; neither → a self-signed one made with `openssl` (clients skip verification) |
| `SMTP_PUBLIC_HOST` | web: the relay's host shown with its settings on environment pages (default `localhost` outside production; unset in production hides them) |
| `VALKEY_URL`, `VALKEY_CLUSTER` | api + web + worker (the daily inbound limit, Hooks delivery limits) + smtp: rate limit counters (`rediss://user:pass@…`, `true` for ElastiCache Serverless; printed by `valkey:bootstrap`). Required in production; unset → in-memory per process |
| `RATE_LIMIT_KEY_PREFIX` | api + web: namespaces Valkey keys (default `coss`) |
| `CLIENT_IP_HEADER`, `TRUSTED_PROXY_COUNT` | api + web: where the client IP comes from (e.g. `x-forwarded-for`, proxies of ours appending to it). Unset → public unauthenticated limits use an aggregate fallback subject instead of a per-IP subject |
| `TEST_VALKEY_URL` | ratelimit + api tests (keys under a random prefix, never flushed) |
| `RISK_HASH_KEY` | api + web: 32-byte base64 key of every HMAC risk remembers identifiers by (velocity keys, mailbox identities, fraud reports); required in production, a fixed development key otherwise. Changing it resets that memory |
| `IPINFO_TOKEN` | worker: downloads IPinfo Lite (ASN + country, CC BY-SA 4.0) for risk's IP signals; unset → Tor and cloud ranges only |
| `WEBHOOK_SECRETS_KEY` | api + web + worker: comma-separated 32-byte base64 keys, newest first (the first encrypts, all decrypt); encrypts endpoint signing secrets (losing it makes them unreadable). Shape in `@coss/webhooks/env` |
| `WORKER_LOOPS` | worker: comma-separated loops to run (`WORKER_LOOP_NAMES` in `apps/worker/src/jobs.ts`, plus `email-dispatch`); unset runs all. A second worker service with `hooks` scales Hooks deliveries on their own |
| `LOG_RETENTION_DAYS` | worker: days of environment logs kept (1-31, default 30); whole expired day partitions are dropped hourly |
| `BILLING_PROVIDER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | web + worker: the payment provider of new billing accounts (`fake` default, or `stripe`, which needs the key); the webhook secret only the dashboard (`/api/billing/webhook`). Shape in `@coss/billing/env` |
| `SCREENING_CLASSIFIER`, `SCREENING_MODEL`, `AI_GATEWAY_API_KEY` | worker: content screening (`off`/`fake`/`ai`; a Vercel AI Gateway decision model id, default `typesafe-ai/jev`; the Gateway key, required with `ai`). The model and key also serve the api's `RISK_CLASSIFIER` |
| `RISK_IP_PRIVACY`, `IPINFO_PRIVACY_TOKEN` | api (+ web, for its sign-up assessments): risk's VPN/proxy/relay data per address (`off` default; `ipinfo`: IPinfo's privacy detection with a paid plan's token, which sends every assessed public IP to IPinfo — list it as a subprocessor first). Without it, VPNs are only guessed from the network (`ip.vpn_network`) |
| `RISK_SIGNUP_ENVIRONMENT_ID` | web: a live environment of COSS's own organization that assesses the dashboard's sign-ups (dogfooding; `block` refuses them, `review` waits in its queue). Unset: not assessed |
| `RISK_CLASSIFIER` | api: risk's content classification in live environments (`off` default: classify answers 503 and assessments skip content; `fake`: the `[coss-test:…]` markers; `ai`: `SCREENING_MODEL` with `AI_GATEWAY_API_KEY`). Sandbox environments always use the markers |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE` | api, worker, web: Sentry (each its own project's DSN; web's also serves browsers of both zones); unset → nothing reported. Read before t3-env (`src/instrument.ts`, `src/lib/monitoring-server.ts`, `/api/monitoring`) and validated by it (`sentryEnvShape`) |
| `SENTRY_RELEASE` | api, worker: the image's commit (Dockerfile build argument); the Next apps' release is `NEXT_DEPLOYMENT_ID`, injected at build |
| `SENTRY_AUTH_TOKEN` (`SENTRY_ORG`, `SENTRY_PROJECT`) | Next builds only (`globalPassThroughEnv`; a BuildKit secret in the Dockerfiles): uploads source maps to `cosscom`/`web` and deletes them from the build. Unset → no source maps |
| `NODE_ENV`, `SKIP_ENV_VALIDATION` | `production` makes dev auth emails and the seed refuse to run; the latter skips t3-env (image builds set it) |
| `SKIP_BUILD_TYPECHECK` | `1` makes `next build` (web, site) skip its TypeScript check; set only by CI's build job (its check job typechecks) |
| `TURBO_TOKEN`, `TURBO_TEAM`, `TURBO_REMOTE_CACHE_SIGNATURE_KEY` | turbo itself (Vercel Remote Cache, team `cal`): locally `turbo login` stores the token and `~/.config/coss/turbo.env` (sourced by the shell profile) sets the other two; in CI `secrets.TURBO_TOKEN`, `vars.TURBO_TEAM`, `secrets.TURBO_REMOTE_CACHE_SIGNATURE_KEY`. Never in `.env` (turbo doesn't read it) |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | `apps/web`: Server Actions key shared by every dashboard task of a stage (base64, 16/24/32 bytes); read at runtime, required in production |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `apps/web` (read by `packages/auth/src/social.ts`): sign-in with Google / GitHub, each on when both of its values are set (`src/instrumentation.ts` refuses half a pair). Callbacks `${BETTER_AUTH_URL}/api/auth/callback/{google,github}`. Production: ids plain (tfvars), secrets in the stage secret — put the secrets there **before** the `terraform apply` that adds them, or web tasks can't start |
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
  `environmentId`, organization-scoped ones (domains, audit events, billing) only by `organizationId`. Document responses with
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
- React Email (`src/react.ts`): a send's `react` is rendered into `html`/`text` by `@react-email/render`, an
  **optional peer** loaded with a literal `import()` inside try/catch (bundlers include it when installed, only
  warn when not) — never make it a dependency or import React types (`ReactEmailElement` is structural). `react`
  is SDK-only: `contract-types.ts` compares `Omit<SendEmailParams, "react">` with the API's schema.
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
- Releases: Changesets 3 (`.changeset/`, the SDK and `coss-mcp` — every other workspace is private and never versioned).
  `bun run version-packages` also rewrites `src/version.ts` (`scripts/sync-version.ts`) and refreshes `bun.lock`
  (it records workspace versions; CI installs with `--frozen-lockfile`).
- **Publishing** (`.github/workflows/release.yml`): merging the "Version packages" PR publishes `coss` to npm
  from CI only — npm trusted publishing (GitHub OIDC, no npm token anywhere) with provenance, trusted for exactly
  `cosscom/coss` → `release.yml` → the `npm` environment (deployable from `main`); `npm trust list coss` shows it.
  The publish job builds the SDK and runs `npm publish --provenance` itself, skipping a version already on npm,
  waits until the registry serves the new one (a minute or two) and tags it. Never
  publish from a laptop. npm owners: baileypumfleet, peer_rich, keithwillcode (versions 0.0.1–0.0.5 are a previous
  owner's unrelated, deprecated package).

## MCP server (`packages/mcp`, published as `coss-mcp`)

- `createCossMcpServer({ coss, apiKey })` (`src/server.ts`) registers every tool on an `McpServer`
  (`@modelcontextprotocol/server` v2); `src/cli.ts` serves it over stdio (`serveStdio`). Configuration comes from the
  environment only (`COSS_API_KEY`, `COSS_BASE_URL`), never argv; stdout is the protocol, so log to stderr.
- Tools (`src/tools/*.ts`) call only the public SDK — never workspace packages (AGPL) or the database — so anything a
  tool needs must exist in the public API first. Every tool carries annotations (`READ_ONLY`, `WRITE`,
  `DESTRUCTIVE`, `SENDS` in `tools/shared.ts`); API keys hold every permission, so clients rely on them to prompt.
- Answers stay small: lists drop content (`compact`, `emailListItem`), bodies are cut (`truncate`), API failures
  become `isError` results with a hint (`result.ts`). Third-party text (email content, received mail, bounce and
  webhook responses) is labelled untrusted, and the server's `instructions` say so.
- `diagnose.ts` is pure (email + events + best-effort context → verdict). Its explanations of failure codes and
  recipient statuses must match the email product's behaviour: change both together.
- Dependencies are explicit versions (`npm publish` doesn't rewrite `workspace:`/`catalog:`); `coss` is a caret
  range that changesets moves when the SDK's version leaves it. The release job publishes it after `coss`.
- Tests: `packages/mcp/test` (in-memory client, fake `fetch`) and `apps/api/test/mcp-contract.test.ts` (built
  server against the in-process app; turbo builds it first).

## Dashboard (`apps/web`)

- Pages use the generated `PageProps<"/…">`/`LayoutProps` globals and `await params`. Call `requireOrgMember(orgSlug)`
  (`src/lib/session.ts`; non-members get a 404) and gate controls with its `can(…)` (the role check, read-only while
  the org is suspended). Read data straight
  from `@coss/tenancy` / `@coss/email` (the dashboard never calls the public API). Server code uses `auth` from
  `@/lib/auth`; client code uses `authClient` from `@/lib/auth-client`.
- Layout follows coss.com's docs (`apps/site/DESIGN.md`: grayscale, Cal Sans/Paper Mono, hue only for status):
  `AppShell` (`src/components/shell/`) is the sidebar + framed page with breadcrumbs and ⌘K, used by the
  `[orgSlug]`, `/settings` and `/admin` layouts. `src/lib/navigation.ts` is the one list of pages the sidebar,
  breadcrumbs, ⌘K and settings tabs read — add a page there. Its items carry icon components, so server components
  pass an area name (`SubNav nav=…`, `AreaSidebar area=…`), never the lists. Pages compose `PageHeader`, `Panel`
  (`<Table variant="card">` or `PanelBody` inside), `EmptyState`, `SpecList`, `StatRow`, `StatusDot`; no back
  links (breadcrumbs). `data-page-width="full"` on a page lifts the shell's `max-w-6xl`.
- Mutations live in a colocated `actions.ts` (`"use server"`): `(prev: ActionResult<T> | null, formData) => runAction(…)`
  (`src/lib/actions.ts`). Start with `requireOrgPermission(formString(formData, "orgSlug"), {…})`, re-check that target
  ids belong to that org (`getKeyBinding`, `getOrganizationMember`, `getPendingInvitation`, `getDomain`,
  `getWebhookEndpoint` + its `environmentId`), `refresh()` after writes.
  Throw `ActionError` for user-facing messages. Clients use `useActionToast(action, { success })` (`src/lib/toast.ts`,
  `useActionState` that toasts) + `<FormError>`: every user-triggered mutation toasts its success (short, past
  tense, no period; redirecting actions too, with a static message), failures stay inline in forms and dialogs
  (`errors: "toast"` for one-click buttons); `toast.*` for client-side calls (`authClient`). Pure reads don't toast.
  Hidden inputs carry slugs/ids only.
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
  requirement; `settings/scim`: directory sync) and account settings (top-level `/settings`: name and
  verification email; `/settings/security`: password, connected accounts, two-factor, passkeys;
  `/settings/sessions`) call `auth.api.*` server-side — their HTTP routes stay disabled
  (`disabledPaths`, below). `canRemoveOrgMember`/`assignableOrgRoles` mirror Better Auth's owner rules for the UI; Better
  Auth alone protects the last owner. Account actions refuse while impersonating.
- Session-bound Better Auth calls made while *rendering* pass `authHeaders()` (`src/lib/session.ts`), not raw
  `headers()`: after an action replaces the session cookie (password change), Next re-renders with the new cookies
  but the old request headers.
- When driving the dashboard in a browser, wait for hydration before typing or submitting.

## coss.com zones

- coss.com is shared by Next.js multi-zones, routed by the ALB (not Next rewrites): the dashboard is the default zone
  (org slugs, `/dashboard`, `/api/*`, bare `/_next/*`); the site and the coss ui repository's apps (`/ui`, `/origin`,
  deployed on Vercel and served by CloudFront from their own origins) get the paths in **`ZONE_ROUTES`**
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

- `apps/{web,site,portal,api,worker}/Dockerfile`, built from the repository root (`docker build -f apps/web/Dockerfile .`):
  `turbo prune --docker` (works with `bun.lock` and the isolated linker) → `bun install --frozen-lockfile` → build →
  a small non-root runtime image. Bun/Node/turbo versions are `ARG`s that `infra/test` keeps equal to `package.json`.
- Next apps use `output: "standalone"` with `outputFileTracingRoot` at the monorepo root; the traced
  `node_modules/.bun` keeps relative symlinks, which resolve after copying (verified). They run `node
  apps/<app>/server.js` on Node 24. `generateBuildId` uses `NEXT_DEPLOYMENT_ID` (Next sets it to `""` when unset,
  hence `||`). api and worker run their TypeScript source on Bun from a `--production` prune.
- Build once, deploy to any stage: nothing stage-specific at build time (`SKIP_ENV_VALIDATION`), validation at
  startup. `next.config.ts` runs only at build/dev time and is serialized into the standalone server: decide nothing
  there from runtime env.
- Health checks: `/api/health` (web, site, portal; public in `proxy.ts`), `/health` (api); none touch the database.
- SIGTERM: Next drains itself; the API (`src/server.ts`) stops accepting, finishes in-flight requests, closes the pg
  pool; the worker (`src/shutdown.ts`) aborts the SQS poll and long runs between items, waits for each loop's current
  run, closes the pool. Idle keep-alive timeouts (75 s) exceed the ALB's 60 s.
- Migrations: `bun packages/db/src/migrate.ts` (drizzle-orm's migrator, no drizzle-kit) as a one-off task from the
  worker image. Runbook, resources, IAM and deploy order: README.md, "Deploying to AWS"; machine-readable: `infra/`.

## Tests

- `bun:test`. DB-backed suites (`apps/api`, `apps/smtp`, `apps/worker`, `packages/billing`, `packages/email`, `packages/hooks`, `packages/push`, `packages/reputation`, `packages/risk`, `packages/screening`, `packages/tenancy`, `packages/webhooks`) preload `test/setup.ts` via their
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
  from `@coss/email/testing`, `FakeTrackingHostnameProvider({ state })` from `@coss/email`. Receiving:
  `receiveFakeEmail()` + `buildTestMessage()` + `FakeInboundStore` from `@coss/email`, `FakeS3Api` and
  `sesReceiptNotification()` from `@coss/email/testing`; `createTestApp()` returns its `inbound` runtime. Real pg-boss tests use their own queue name
  (`packages/email/test/dispatch.test.ts`). Rate limits: `memoryLimiter({ overrides })`,
  `testValkeyLimiter()` from `@coss/ratelimit/testing`; `createTestApp({ rateLimiter, clientIp })` (defaults to an
  in-memory limiter per app); tighten limits for a test org with `setRateLimitOverride`. Webhooks: `webhookReceiver()` (local server),
  `testSender()`, `testManagementDeps` from `@coss/webhooks/testing`. Hooks: `testHookDeps`, `testHookDeliveryDeps({ send, throttle, … })` (no jitter)
  from `@coss/hooks/testing`; the test preload creates this week's Hooks partitions (they have no default partition). Screening: `fakeClassifier({ scores, fail, delayMs })` from
  `@coss/screening/testing` (markers like `[coss-test:phishing]` in the content score 0.99). Billing (`@coss/billing/testing`):
`createTestContract(orgId, terms, { effectiveFrom })`, `recordTestUsage({ …, at })`, `testBillingProviders()` (a
`FakeBillingProvider` with `willCollect(...)`/`fail(op)`), `FakeStripeApi` (`fetch` for `StripeBillingProvider`);
month closes, dunning and usage checks take `now` and `scope`; `createTestApp({ plans, billing })`, `screenMessage(…, { random })`
  for deterministic sampling, `Experimental_DecisionMockModelV4` (`ai/test`) for the AI SDK adapter; `dispatchingEmailService({ screen })`. Risk: `testRiskDeps(overrides)` (fixed IP data for `TEST_IPS`, fake DNS via `fakeMailDomains`, in-memory velocity) from `@coss/risk/testing`, `buildTestMmdb` from `@coss/signals/testing`; `createTestApp({ riskDeps })`. Worker-style scans take `scope: { organizationIds }`
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
10. Billing: its meter is in `METERS` and priced in `RATE_CARDS` (`@coss/billing/catalog`; SMS, video and scheduling
   already are). Call `recordUsage(tx, …)` from `@coss/billing/metering` once per billable event, in the transaction
   that makes it billable (guard it with a compare-and-set, like `email.usage_recorded_at`), and reserve capped usage
   at acceptance through an injected `UsageGate` (as `EmailServiceOptions.billing` does). Plan-gated creation takes an
   injected `PlanGate`.

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
- `infra/terraform/spec.json` (`bun run --cwd infra aws:spec:write`; excluded from Biome).
- `packages/sdk/package.json` `exports`/`main`/`module`/`types` (rewritten by the SDK build — commit the result).
- `packages/kloq/src`: kloq's library, vendored from `cosscom/calendar` (excluded from Biome); and
  `apps/site/src/lib/calendar/registry/generated.json` + `apps/site/src/components/calendar/registry/what-lands.json`
  (`bun run --cwd apps/site calendar:registry` after changing the library or the registry's blocks; a test fails when stale).
- `packages/ui/src/{components,hooks,lib}`: vendored from the `@coss` registry and excluded from Biome; re-adding a
  component overwrites local edits.
- `bun.lock` (only via `bun install`; CI uses `--frozen-lockfile`).
- `packages/signals/src/disposable-domains.generated.ts` (`bun run signals:update-disposable`; local exceptions go in
  `ALLOWED_DOMAINS` / `EXTRA_DISPOSABLE_DOMAINS` in `packages/signals/src/email.ts`).
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
    `defaultPermissions: API_KEY_PERMISSIONS` (every product: email, domain, webhook, suppression, reputation, billing `read` — backfilled by `0043`, hook — backfilled by `0052`, emailTemplate — backfilled by `0064`), prefixes
    `coss_live_` / `coss_test_` by environment mode (`API_KEY_PREFIX`), key format `/^coss_(live|test)_[A-Za-z]{64}$/`.
  - Keys are created only by `createEnvironmentApiKey` (server-side, no headers) and authenticated only by
    `authenticateApiKey`; keys without an `environment_api_key` binding fail closed. `authenticateApiKey` never calls
    Better Auth's `verifyApiKey` (it writes the key row on every request): one SELECT checks enabled, expiry, org,
    prefix/mode and permissions, rejects keys with a usage quota (`remaining`), and refreshes `last_request` at most
    once a minute (`LAST_USED_RESOLUTION_MS`). Re-check it against `validateApiKey` when bumping Better Auth or
    using a new key option (quotas, refills, per-key rate limits). Revocation: `getKeyBinding`
    ownership check, then `auth.api.deleteApiKey` with session headers.
  - `disabledPaths` blocks the HTTP routes `/api-key/{create,update,get,list,delete}`, **every organization-plugin
    route except `/organization/create` and `/organization/accept-invitation`** (`ORGANIZATION_PATHS` minus
    `ORGANIZATION_HTTP_PATHS` — Better Auth's routes skip `orgAccess` (SSO/2FA requirements), the directory-managed
    member lock and the audit log, which the dashboard's actions apply before calling `auth.api.*`; add a new
    plugin route to `ORGANIZATION_PATHS`), the account routes (`/update-user`, `/change-password`,
    `/change-email`, `/delete-user`, `/list-sessions` — it returns every session's token —, `/revoke-session(s)`,
    `/revoke-other-sessions`, `/update-session`, linked accounts and their tokens), every admin-plugin mutation
    (`/admin/{create-user,update-user,remove-user,set-role,set-user-password,ban-user,
    unban-user,impersonate-user,revoke-user-session,revoke-user-sessions}`) and SSO provider management
    (`/sso/{register,update-provider,delete-provider,providers,get-provider,request-domain-verification,verify-domain}`)
    (server-side `auth.api.*` still works; the browser's `authClient` calls only sign-in/up, password reset,
    verification email, two-factor, passkeys and those two organization routes).
    Admin mutations go only through `apps/web/src/app/admin/actions.ts`, which records the audit log. Never re-enable
    them to "simplify" things. Impersonation sessions are also refused account changes (`ACCOUNT_CHANGE_PATHS` in
    `hooks.before`) for every caller, like factor management.
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
  - **Google / GitHub sign-in** (`packages/auth/src/social.ts`, Better Auth `socialProviders`, `/sign-in/social` +
    `/callback/:id`; Google's id-token sign-in is off): the two-factor plugin doesn't challenge OAuth callbacks, so
    `socialTwoFactor` swaps a TOTP user's new session for the plugin's `two_factor` challenge (it mirrors the
    plugin's cookie and verification rows — re-check it when bumping Better Auth; `packages/tenancy/test/social.test.ts`
    runs it) and redirects to `/sign-in?step=two-factor`. New users from a callback need a provider-verified address
    and pass the sign-up guard (disposable/undeliverable domains, one account per canonical mailbox) in
    `databaseHooks.user.create`. Implicit linking by address needs both sides verified (`requireLocalEmailVerified`,
    keep it on: an unverified password account may belong to whoever registered someone else's address); keep
    `trustedProviders` empty. Explicit linking (account settings, `allowDifferentEmails`) and adding a first password
    need a session younger than `freshAge` (the actions check; `/link-social`, `/unlink-account` stay closed over
    HTTP). Provider tokens are never stored (`withoutProviderTokens`). Profile pictures: Better Auth copies
    the provider's into `user.image` at sign-up; a linked account's becomes it when there is none
    (`providerPicture` in `account.create.before`, written after commit; the name still never syncs). The
    dashboard shows only `*.googleusercontent.com`/`avatars.githubusercontent.com` pictures (an SSO IdP's
    `picture` could point anywhere), else the verified address's Gravatar (`d=404`), else initials
    (`avatarUrl`, `apps/web/src/lib/avatars.ts`; `UserAvatar` loads it without a referrer). `?error=` codes are mapped by
    `apps/web/src/lib/social-errors.ts` (never show `error_description`). `/sign-in/social` is limited per IP
    (`auth.social.ip`).
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
    `requireOrgMember` redirects members without `user.twoFactorEnabled` to `/settings/security` — passkeys don't satisfy it
    (the password still works without a code). API keys are unaffected. Admin recovery: `resetUserTwoFactor` (audited).
  - `packages/auth` must not import `next/*` or `"server-only"` (the `auth` CLI loads `src/auth.ts` on Node).
    `nextCookies()` is appended last, only in `apps/web/src/lib/auth.ts`.
- **Tenancy rule:** every tenancy/email/webhooks function that touches tenant data takes `organizationId` and scopes its
  SQL by it; writes derive org/project from the environment row. Only `getMembership` (by slug), `authenticateApiKey`
  (from the key's binding), the platform-level `@coss/tenancy/admin` and `@coss/email/admin` modules,
  `listScreeningsForAdmin`/`countScreeningsForAdmin` (`@coss/screening`) and `platformUsageByDay` (`@coss/billing`)
  (call them only after `requirePlatformAdmin*`), and these system-level functions resolve the org
  themselves (scoping every write by the row's own org): `recordProviderEvent`/`ingestProviderEvents` (from the email
  id tag), `applyTenantStatus` (prefix-checked tenant name), `authorizeLiveSender` (reads domain names across orgs),
  `recordOpen`/`recordClick` (from the email's tracking token), `trackingBaseUrlFor` (dispatch; reads domain names
  across orgs like `authorizeLiveSender`), `receiveEmail`/`routeRecipients` (receiving; from the envelope recipients), `reencryptWebhookSecrets` (operator script), `authenticateHookPortalSession` (from the session), and the worker scans `runDueWebhookDeliveries`, `runDueLogDrainDeliveries`, `runDueHookDeliveries`, `parkHeldHookDeliveries`, `runDueHookRecoveries`, the Hooks purges, `recheckDueDomains`,
  `recheckDueTrackingDomains`, `recheckDueReceivingDomains`, `sweepStaleClaims`, `sweepUnclaimedEmails`, `runDueReputationEvaluations`, `runDueOrganizationDeletions`, `EmailService.dispatchDue`
  (and the dispatch job, from the job's `organizationId`). Server actions take only slugs +
  target ids and derive the org from `requireOrgPermission`; every Better Auth organization call passes `organizationId`
  explicitly (never rely on `session.activeOrganizationId`).
- **Client-safe modules** never import `@coss/db`: `@coss/risk/{schemas,env}`, `@coss/observability/*`, `@coss/auth/{permissions,slugs,constants,org-access}`, `@coss/push/schemas`, `@coss/email/schemas`,
  `@coss/email/{env,templates}`, `@coss/hooks/{schemas,env}`, `@coss/reputation/schemas`, `@coss/screening/env`, `@coss/webhooks/{schemas,env}`, `@coss/versioning`, `@coss/retention`, `@coss/logs/{schemas,query}`, `@coss/billing/{catalog,schemas,engine,money,env,gate,wire}` (`gate` is types only), `@coss/ui/*`, `@coss/ui/theme.css`, `@coss/companion`. `@coss/webhooks`, `@coss/db/jobs`, `@coss/screening/{ai,runtime}`, `@coss/email/{runtime,ses,dispatch}`, `@coss/risk/{runtime,datasets}`, `@coss/signals/*`, `@coss/push` (root, `./apns`) and `@coss/billing` (root, `./metering`, `./runtime`, `./stripe`) are server-only; only `./stripe` (and `./runtime`) import the Stripe SDK. Server-only web
  modules start with `import "server-only"`.
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
- **Rate limits** (`@coss/ratelimit`): buckets are defined only in `BUCKETS` (`src/buckets.ts`); GCRA state is one
  key per bucket, `GCRA_SCRIPT` (Valkey) and `gcraStep` (memory) must stay in step (`test/store.test.ts` runs both).
  One consume call = one hash tag (`{scope:subject}`), so all its buckets share a scope and a cluster slot. The
  limiter applies each bucket's explicit `failureMode` on store errors and logs them: read-only API traffic allows,
  while authentication, writes, sends, quotas and public-ingress abuse controls deny. Never make it throw or block on Valkey. Never
  `FLUSH*`/`KEYS` (tests use random prefixes). Valkey time (`TIME`) is the clock, not the app's. API key buckets run
  after `requireApiKey` (a bad key spends no route bucket); key and aggregate-IP authentication buckets run before
  every database lookup, and `api.auth_failure` adds a client-IP penalty for bad keys. Send quotas are charged before `emailService.send` and refunded on replays and thrown errors.
  The worker charges `email.inbound.day` (per org, one per environment a message reaches) and **fails open** on
  purpose: a Valkey outage must never lose customer mail.
  Client IPs come only from `clientIpResolver` (`CLIENT_IP_HEADER`, rightmost-trusted `x-forwarded-for` entry) —
  never trust a raw header. Emails are hashed into keys. Better Auth's built-in limiter stays off
  (`rateLimit: { enabled: false }`): `apps/web/src/lib/auth-rate-limit.ts` wraps the `/api/auth` POST handler. The
  ElastiCache user's ACL (`valkey-bootstrap.ts` `APP_ACCESS`) must list every command the client and the scripts use
  (risk's `VELOCITY_SCRIPT` too). Changing it changes nothing live: re-run `valkey:bootstrap` in production (it
  rewrites the user's access string), or every script call with a new command fails with `NOPERM`/`ACL failure`.
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
  with `{{else}}`, comments, `\{{`; no code runs, output and work are capped while rendering (2 MB and 1,000,000 steps a field, nesting 10).
  Publishing needs a parse-clean draft whose names are all declared and content for the default locale;
  re-publishing an unchanged draft returns the current version (retry-safe). Variables are checked strictly
  (unknown names refused, `null` = absent, defaults applied, lists ≤ 1,000 objects, `variables` ≤ 64 KB); errors
  are 422 `invalid_request_error` codes (`template_*`, `invalid_template_variables` with `issues`), never 404/409.
  Only the dashboard's test sends render a draft (`SendEmailInput.templateDraft`, only at the revision the
  editor checked; `version: null` on the email): they need `email:send`, go to verified members only (`listVerifiedMemberEmails`), and are charged
  `emailSendQuota` (`@coss/ratelimit`, shared with the API and the SMTP relay) through the dashboard's own email service
  (`apps/web/src/lib/email-service.ts`, a pg-boss producer). `sample_variables` is in `OPAQUE_FIELDS`.
- **SMTP relay** (`apps/smtp`, mapping in `packages/email/src/smtp-message.ts` = `@coss/email/smtp`): never a raw
  MIME passthrough — every message becomes a `SendEmailRequest` and goes through `EmailService.send` exactly like
  `POST /v1/emails` (sender authorization, suppressions, billing, screening, webhooks). AUTH (`PLAIN`/`LOGIN`) only
  after TLS (`allowInsecureAuth` only for `localhost` in development), username `coss`, the password an API key
  needing `email:send`; `authenticateSmtp` (`src/auth.ts`) repeats `requireApiKey`'s throttling in its order
  (`api.authentication.key`/`.ip` before the lookup, `api.auth_failure` peeked, charged for bad keys and wrong
  usernames). Every message checks the key again first (`recheckSmtpKey` at MAIL FROM: pooled connections stay
  open for hours, and revoking a key or suspending its organization must stop them). Connections are charged per client IP (`smtp.connections.ip`, the socket's address: the NLB preserves
  it, never trust a header), each message `api.send` (per key) and `emailSendQuota` (`@coss/ratelimit`, shared with
  the API's send routes; refunded on replays and errors). Mapping: the `From` header (one mailbox) is the sender
  (`MAIL FROM` is ignored); the envelope (`RCPT TO`, ≤ `MAX_RECIPIENTS`) decides who receives it — `To`/`Cc` header
  addresses stay `to`/`cc`, every other envelope recipient is `bcc`; a header recipient missing from the envelope
  or a message without a `To` recipient is refused (never move Bcc'd addresses into visible headers). Reserved,
  `Content-*` and mail-client headers are dropped, the rest (≤ `MAX_HEADERS`) kept with RFC 2047 words still
  encoded; `X-Coss-{Category,Tags,Tracking,Scheduled-At,Idempotency-Key}` set the API's fields and are never sent
  on. Failures are SMTP replies (`src/replies.ts`): 4xx where a retry can help (quotas, `request_in_progress`,
  outages), 5xx otherwise; a `250` names the email id. Each attributable message is a log line (source `smtp`,
  type `smtp.message`; `smtp.auth` for real keys refused), without addresses, subjects or content: refusals log
  their stable `errorCode` (the client's reply may quote addresses) and `loggedMessage` masks any address left.
  Both `SMTPServer`s need their `error` handlers (an unhandled handshake failure ends the process). SIGTERM: stop
  accepting, `421` to idle clients, let messages in progress finish. TLS: the process holds the certificate
  (STARTTLS can't be offloaded): production exports the ACM certificate (`src/tls.ts`), the NLB forwards plain TCP.
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
- **API versions** (`organization_api_version`, `webhook_endpoint.api_version`): an organization is pinned lazily to
  the latest version by its first authenticated request (`getOrganizationApiVersion`, insert-or-read; the dashboard
  only reads with `readOrganizationApiVersion`), and only moves forward (`setOrganizationApiVersion`, from org
  settings, `organization:update`). The outbox stores the latest-shape event; `renderWebhookPayload` renders it in
  the endpoint's version at every attempt and adds `api_version` (signed, in the body). Outbox payloads are typed
  `Stored*WebhookEvent` (no `api_version`). Never version error envelopes, and never transform in handlers.
- **Billing** (`packages/billing`; tables `billing_*`, ids `bacct_`, `bcon_`, `bcg_`, `bce_`, `bper_`, `inv_`, `invl_`,
  `bpay_`, `bcn_`, `bpev_`, `bntf_`): COSS owns the catalog, contracts, metering, rating, credits, invoices and
  dunning; a `BillingProvider` (per `billing_account.provider`: `fake`, `stripe` or `manual` for off-Stripe deals) only
  keeps customers and payment methods, issues the invoices COSS pushes (numbered by COSS, `auto_advance: false`) and
  collects them. Never move pricing into Stripe objects (prices, subscriptions, meters).
  - **Catalog** (`./catalog`, client-safe, reviewed like code): `METERS`, dated `RATE_CARDS` (a price change is a new
    card; periods before it keep the old prices), `PLANS` (Free/Pro/Scale/Enterprise: fee = spendable usage credit,
    included units, `overage: blocked | billed`, entitlements incl. plan rate limits), `ADD_ONS` (empty until named).
    The docs' `/docs/billing` (`<PlanTable />`, `<UsageRates />`) and the dashboard render it.
  - **Contracts** (`billing_contract`, `terms` jsonb = `ContractTerms` v1, zod, bigints as strings): a confirmed
    contract is in effect while `effective_from <= t < effective_until`; **time decides, never a loop**; none in effect
    = Free (no rows). Every change takes `lockBillingAccount` first, which keeps contracts from overlapping. Self-serve
    contracts store only `{ version: 1, plan }`; sales contracts pin what they override (fee, rates/tiers, discounts,
    commitments, add-ons, entitlements, caps). A future contract starts on the 1st of a month (UTC); one starting now
    (or backdated within the open month) is invoiced for the rest of it at once. Self-serve plan changes are refused on
    `sales`/`internal` contracts and while one is scheduled (`scheduledManagedContract`); a self-serve contract never
    cancels a scheduled managed one (`supersedeAt` ends it where that one starts).
  - **Money**: unit prices are bigint **nanos**, every stored amount bigint **cents**; a line is rounded once
    (half away from zero) and an invoice's total is the sum of its lines. USD only (`currency` column).
  - **Metering** (`billing_usage`, hourly counters by org/environment/meter/dimension, 8 shards, no FK to the
    environment): products call `recordUsage(tx, …)` in the transaction that makes usage billable; the hour is the
    transaction's (`date_trunc('hour', transaction_timestamp(), 'UTC')`), so a month is closed only after
    `USAGE_SETTLE_MS`. Email is metered at `sent` (all four paths: `complete`, both `recordProviderEvent` transitions,
    `sweepStaleClaims`) for its `billable_recipients` (non-suppressed, frozen at claim), once
    (`usage_recorded_at` compare-and-set); sandbox never.
  - **Rating** (`./engine`, pure, most tests): graduated or volume tiers carried across the month's contract segments
    (or the term, `tierWindow: term`); included units and unit grants take the period's first positions (Free's
    allowance per period, never prorated); dollar grants drawn down most specific scope first, then soonest expiry;
    capped plans never charge usage (`write_off`); minimum-spend shortfalls at their period's end; fees and add-ons in
    advance or arrears; each month's fee becomes its credit grant. Charges and grants are idempotent across invoices by
    `charge_key` / `grant_key` (voiding an invoice clears its keys, reverses its credit entries and voids grants it
    funded).
  - **Month close** (`runDueBillingPeriods`, worker `billing-periods`): one invoice per account and month
    (`billing_period` makes it idempotent) with the month's arrears and the next month's advance charges; only accounts
    with a contract around it. Upgrades take effect once their prorated invoice is paid (`pending` contract, grants
    deferred in `terms_snapshot.pendingGrants`, expired after a day); downgrades and cancellations at the month's end,
    refused while the org uses something the lower plan lacks (the dashboard's preflight), and creation meanwhile is
    checked against both plans (`creatableEntitlements`). Auto-renewing contracts get a successor a week before
    their term ends (note `renewalNote(id)`; ending the contract cancels it if it hasn't started); non-renewing ones
    end with their term.
  - **Collection**: `billing-sync` pushes and collects (charge, or send with net terms). A charge is never attempted
    without a payment method (`no_payment_method`): a pending upgrade's invoice waits for one (its customer is in
    Checkout; returning collects at once through `collectInvoiceNow`, which also retries a failed or 3-D Secure
    charge), anything else is dunned as `No payment method on file.`. Stripe's invalid-request refusals are read
    back (an invoice already paid on the hosted page is recorded as paid). Stripe carries invoices below its minimum
    charge to the next one (customer balance); every paid amount COSS reads leaves that debit out
    (`paidTowardInvoice`). `billing-collection` retries failed charges (+3/+5/+7 days), reminds about net-terms
    invoices, sets `past_due`, and after `grace_days` (and, for an automatic charge, once no retry or charge is left
    to come) places a `delinquent` **billing hold** (`billing_hold`, presence = held). A hold makes
    `authorizeLiveSender` refuse
    (`EmailError("billing_hold")`, 402) and holds scheduled sends (`organizationActive`) — never fails them; paying lifts
    it. Holds are independent of reputation suspensions: never fold one into the other. Spend limits place a
    `spend_limit` hold (worker `billing-usage`), lifted by the next month or a higher limit. COSS's own organization is
    never held or capped (`systemOrganizationId`).
  - **Provider events**: the dashboard's `/api/billing/webhook` (public) verifies Stripe's signature and only stores the
    event (`billing_provider_event`); the worker's `billing-events` loop re-reads each object from Stripe and moves
    states forward only (`paid` is final). `billing-reconcile` re-checks quiet open invoices hourly.
  - **Enforcement is injected**: `PlanGate` (`DomainDeps.plans`, `WebhookManagementDeps.plans`, the API's `plans`
    option → `requirePlanFeature`), `UsageGate` (`EmailServiceOptions.billing`: Free's cap, reserved in the send's
    transaction against `billing_quota`, refused as `BillingError("usage_limit_exceeded")`), plan rate limits
    (`createRateLimitRuntime({ planRules })`: default < plan < admin override), the member limit
    (`setMembershipLimitResolver`). Packages and test helpers default to unenforced; the apps wire the real ones.
    Errors: `BillingError` (402 codes → API `billing_error`, never retried by the SDK).
  - **Admin changes** (contracts, credits, invoice voids/payments/credit notes/one-off invoices, account settings,
    holds) write `admin_audit_event` in their transaction (`auditBillingChange`; `billing.*` in `ADMIN_ACTIONS`).
  - **Public API and events** (`apps/api/src/routes/billing.ts`, read models in `src/api.ts`, wire schemas in
    `./wire`): `GET /v1/billing`, `/v1/billing/usage` (≤ 400 days, 7 by hour), `/v1/billing/invoices[/{id}]`
    (finalized only; drafts are never exposed) and `/v1/billing/credits`, read-only with `billing:read` from any
    environment's key (`coss.billing`). Changes stay in the dashboard. `billing.*` events (`BILLING_EVENT_TYPES`, part
    of `WEBHOOK_EVENT_TYPES`) go through `announce(tx, organizationId, …)` to every **live** environment's endpoints, in
    the transaction that decided them: invoice finalized/paid/payment failed/voided, plan changed (also when scheduled
    or undone), usage threshold, hold placed/lifted, credit granted. Emit them only when the change actually applied
    (`placeHold`/`liftHold`/`enqueueBillingNotification` return whether they did). Payloads carry invoice summaries
    (no lines) and customer-facing credit fields — never internal reasons, notes or admin identities.
  - **Invoices outlive the organization** (no FK, names copied, `RETENTION_DAYS.invoices`); deleting an organization
    issues one `final` invoice for the running month (`finalizeOrganizationBilling`, in `releaseProviderResources`)
    and leaves the Stripe customer so it can still be collected; owners can't request deletion with open invoices.
- **Data retention** (`@coss/retention`): `RETENTION_DAYS` / `RETENTION_POLICY` are the only source of retention
  periods — the docs page (`/docs/data-retention`, `<RetentionTable />`/`<RetentionPeriod of>` MDX components, also
  rendered into `/llms*.txt`) and the dashboard's settings card render them, and each owning package's purge
  enforces them: `purgeExpiredEmails`/`purgeEmptyEmailBatches`/`purgeExpiredReputationRollups`/
  `purgeExpiredReceivedEmails`/`purgeExpiredFakeInboundObjects`/`purgeExpiredInboundDropCounters` (`@coss/email`;
  received content in S3 expires by the bucket's lifecycle rule, retention + 1 day),
  `purgeExpiredWebhookMessages` (`@coss/webhooks`), `purgeExpiredScreenings` (`@coss/screening`),
  `purgeExpiredReputationNotifications`/`purgeExpiredReputationEvents` (`@coss/reputation`),
  `purgeExpiredRiskPersonalData`/`purgeExpiredRiskMemory`/`purgeExpiredRiskAssessments` (`@coss/risk`),
  `purgeExpiredPushNotifications` (`@coss/push`),
  `purgeExpiredAuthRows`/`purgeExpiredAdminAuditEvents` (`@coss/tenancy/retention`). The worker's `retention` loop
  (`apps/worker/src/retention.ts`, every 10 min, 1,000 rows per step, back-to-back while a step fills its batch) runs
  them in order (emails before their batches). Purges are system-level `DELETE … WHERE id IN (oldest batch)` with
  the condition re-checked, take `{ now, limit, scope }` (always pass `scope` in tests), and rely on cascades for
  children. Never purge: `queued`/`scheduled` emails, webhook messages with a `pending` delivery (suspended orgs' are held),
  an org's latest reputation transition (notifications compare against it), `content_screening_counter` (the
  sampling sequence), suppressions (they outlive their email; the dashboard hides "View email" past the cutoff).
  The exception is Hooks: messages, deliveries and attempts are dropped by whole days with their partitions
  (`RETENTION_DAYS.hookMessages`, the worker's `partitions` loop), pending or not (the policy says so); its small tables
  have purges (`purgeExpiredHookIdempotencyKeys`, `purgeExpiredHookPortalSessions`, `purgeFinishedHookRecoveries`).
  Email retention must exceed the reputation window (≤ 30 days) and rollup recounts (31 days) — a test checks it. A
  new table either gets a catalog entry + purge or is covered by an existing "while your account exists" rule; changing
  a period changes the published policy, so treat it like a terms change.
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
- **Webhooks:** deliver only through `createWebhookSender` (every resolved address must be public; the socket is pinned
  to the checked address; no redirects; 10 s timeout for COSS's own webhooks and log drains, 15 s for Hooks; 1 KB response excerpt). `allowPrivateNetworks`/insecure URLs are
  for non-production only. Payloads never include bodies, headers, cc or bcc. Secrets are AES-256-GCM encrypted with
  `WEBHOOK_SECRETS_KEY`, a key ring (`parseSecretsKeys`): stored as `v2:<key id>:<iv>:<ciphertext>:<tag>` (the
  `v2:<key id>` prefix is the AAD; ids are derived from the keys), encrypted with the first key, decrypted with the
  one named. Keyless `v1:` rows from before are still read by trying every key until `webhooks:reencrypt` rewrites
  them. Every write of a secret column goes through `encryptSecret`, and `reencryptWebhookSecrets` must cover every
  encrypted column (today the webhook and Hooks endpoints' `secret_ciphertext` and `previous_secret_ciphertext`, `log_drain.secret_ciphertext` and `risk_settings.captcha_secret_ciphertext`). Rotation runbook: README.md,
  "Rotating `WEBHOOK_SECRETS_KEY`". The initial upgrade from v1-only readers must use README.md's
  "Upgrading from v1 webhook secret storage" coordinated cutover, not a rolling deployment.
- **Delivery engine** (`@coss/webhooks/engine`): webhook deliveries, log drain batches (and future products) share
  `organizationNotHeld` (suspended or deleting orgs are held), `deliveryOutcome` (retry schedules; jitter only with
  an injected `random`), `sendAttempt`, `endpointHealth` and `runClaimed`; each product keeps its own tables and SQL.
  A claimed row's `lease_expires_at` is its fencing token: always bind it from a JS `Date` (`leaseUntil`), finish
  with a `stillOwned` update **first**, and write attempt rows, log lines and health changes only when that update
  matched, so a worker whose lease was taken over records nothing.
- **Endpoint health** (`webhook_endpoint.failing_since`, `disabled_reason` `manual`|`failing`, `disabled_at`; no
  CHECK ties them to `enabled`, since code running during a deploy's migration sets `enabled` alone, so a disabled
  endpoint without a reason reads as `manual`): a delivery that failed every attempt starts a streak, any success ends it
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
- **Hooks** (`packages/hooks`, `/v1/hooks/*`, `coss.hooks`, permission `hook`): customer messages are opaque JSON
  with customer-defined types, kept apart from COSS's own `webhook_*` tables (which render through `@coss/versioning`)
  on the shared delivery engine. Every function takes `organizationId` (+ the environment or application); the API
  addresses applications by id **or** `uid` (`requireHookApplication`). `hook_message`/`hook_delivery`/`hook_attempt`
  are partitioned by UTC day of the **message** (migrations 0050/0051) with **no default partition** (expired days
  are detached `CONCURRENTLY`; `migrate.ts`, the test preload and the worker keep days ahead): nothing has an FK into
  them, they have none to applications or endpoints (deleting one must never cascade into millions of rows; a
  delivery to a missing endpoint fails at its attempt) and none to `environment` either (dropping a partition that
  references a table takes an ACCESS EXCLUSIVE lock on that table; organization deletion deletes them). Their
  `created_at` and ids are bound from the same JS millisecond (`newId(prefix, ms)`, never `defaultNow()`), so an id
  alone finds its partition: every lookup by id adds the partition column (`cursorOf`). Idempotency keys live in
  `hook_idempotency_key` (a partitioned table can't be unique on them). Sends are charged per fan-out
  (`hooks.messages.second`/`hooks.deliveries.day`, sandbox `hooks.sandbox_deliveries.day`, refunded on replays and
  errors); live sends refuse reputation-suspended orgs (`account_suspended`), replays still return. Delivery
  (`runDueHookDeliveries`): claims at most `MAX_IN_FLIGHT_PER_ENDPOINT` per endpoint, skips held orgs
  (`parkHeldHookDeliveries` puts their due rows off an hour so they never block the queue's head), batch-loads
  messages and endpoints, charges `hookThrottle` (per endpoint, `org:host`, global per host; a denial reschedules
  without counting an attempt), then signs the stored payload (`webhook-id` = message id) and finishes fenced. Payloads
  are normalized JSON (parsed and re-serialized), and `OPAQUE_FIELDS` keeps versioning out of payloads, schemas,
  examples and metadata. Portal sessions: only the token's sha256 is stored; the URL is `<PORTAL_PUBLIC_URL>/s/<id>#<token>`
  — never put a token in a path, query or cookie. `reencryptWebhookSecrets` must also cover `hook_endpoint` secrets.
  Abuse: an endpoint failing for 5 days is disabled (`endpointHealth`), which records a `hook_endpoint.disabled` audit
  event and sends the customer's own webhook endpoints a `hook_endpoint.disabled` event (`HOOK_OPERATIONAL_EVENT_TYPES`
  in `@coss/webhooks/schemas`, part of `WEBHOOK_EVENT_TYPES`), in the same transaction. Live outcomes are counted per
  org and hour into `hook_delivery_rollup` (once per claimed batch, `recordHookDeliveryOutcomes`, the worker's
  `onFinished`; sandbox never counts) for the `hook_failure_rate` check (`hookFailureRateCheck`), which only warns by
  default (`ReputationPolicy.hookFailureRate.suspend: null`; admins can set one per org). Dashboard:
  `[envSlug]/hooks/*` (applications, endpoints, messages, event types, portal settings; `hook:*` permissions);
  "Open portal" mints a session for the signed-in member (`createHookPortalSession({ userId })`).
- **Platform admin** (`/admin`, `@coss/tenancy/admin`): every admin page calls `requirePlatformAdmin()` itself — Next
  renders layouts and pages in parallel, so the layout's check alone would still stream the page's data to non-admins
  (verified). Actions use `requirePlatformAdminAction()` and record an `admin_audit_event` (append-only; no FKs; the
  actor's email is copied; deleted after `RETENTION_DAYS.adminAuditLog`); suspension/key revocation write it in the same transaction. Admins can't act on
  themselves; never send session tokens to the browser (revoke-one looks the token up server-side).
  Visibility: the overview, Sending (orgs by live volume), Emails (every org's emails, `@coss/email/admin`),
  Sign-ups (`RISK_SIGNUP_ENVIRONMENT_ID`'s assessments joined to accounts by address) and Screening pages. An
  email's content is only loaded by `revealEmailContentAction`, which records `email.view_content` in the
  admin audit log (never the organization's own: that would tip off an abuser); never render it with the page,
  and preview it with `UNTRUSTED_PREVIEW_HEAD` (no remote loads: a tracking pixel would tell the sender too).
  **Take down** (`takeDownOrganizationAction`, from `planOrganizationTakedown`) suspends the organization,
  revokes its keys and permanently bans members without another active organization (platform admins, the
  actor and already-banned users are kept), each step audited on its own, so it can be re-run.
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
  rates over live emails sent in the window (by `coalesce(sent_at, created_at)`, `SEND_TIME`, so a send scheduled weeks
  ahead counts when it goes out; default 7 days, never before the last reinstatement), excluding
  suppressed/failed/queued/canceled recipients and `SIMULATOR_DOMAIN` (unless the `countSimulatorRecipients` override is on).
  Closed hours (ended ≥ `ROLLUP_SETTLE_MS` ago) are counted once into `email_reputation_rollup` (by that send hour,
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
  through the allow-lists in `redact.ts` — never `Authorization`, cookies or attachment bytes. Successful
  `/v1/received_emails*` responses keep no body at all (`CONTENT_RESPONSES` in `request-log.ts`): third-party mail
  must not be copied into logs and drains, where it would outlive deleting the email. Reads are scoped by
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
  (3 s) record an `error` verdict. Enforced screening **holds** that email: the claim is given back (`provider` NULL,
  `error_code = 'content_screening_unavailable'` as the marker) and it is dispatched again in
  `SCREENING_RETRY_DELAY_S`, its retry screened again at its old position (`retry`, never counted twice), until it is
  sent or the unclaimed sweep fails it `content_screening_unavailable` an hour after it was due (`UNCLAIMED_FAIL_MS`,
  from `scheduled_at` for scheduled sends) — an unscreened sample is never sent. Shadow mode and COSS's own
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
  `deleting`, the received emails' content store (`orgs/<org>/` in S3), tracking hostnames, identities, domain rows, then the SES tenant via `DeleteTenant`, prefix-checked), deletes bulky data
  (including SCIM directory records, environment logs, received emails, log drain records/batches and the org audit log) in batches of `DELETION_BATCH_SIZE` along indexed columns, then deletes the organization row
  (cascading the rest) and marks the row `completed` in one transaction. A new table with a lot of rows per
  organization belongs in `deleteOrganizationData`; anything held outside Postgres (a new provider resource)
  belongs in `releaseProviderResources`. Admin audit events are kept (no FKs).
- **Risk** (`packages/risk`, tables `risk_assessment` (ids `rsk_`), `risk_feedback` (`rskfb_`), `risk_identity`
  (`rskid_`), `risk_report` (`rskrep_`), `risk_list_entry` (`rskle_`), `risk_rule` (`rskrule_`), `risk_settings`
  (one row per environment), `risk_user_network` (`rskun_`), `risk_limit_bucket` (`rsklb_`), `risk_assessment_preparation`, platform tables
  `risk_dataset` and `risk_domain_age`):
  `assessRisk` collects every signal in parallel and **fails open per signal** (DNS 800 ms, RDAP domain age 1 s —
  a slower lookup keeps running and fills `risk_domain_age` —, captcha siteverify 2 s, Valkey's 100 ms command
  timeout, missing datasets → listed in `degraded`, never an error). Order of decision: allow list, block list, the
  first enabled matching rule (`firstMatchingRule`: `position`, then age; facts from `ruleFacts`, a field without a
  value never matches; rules see facts behind disabled reasons), then the score (`1 − Π(1 − weight)` over enabled
  `REASONS`; thresholds from `risk_settings`, else `DEFAULT_THRESHOLDS`) — change weights only with the golden cases
  in `packages/risk/test/score.test.ts`. New rule fields go in `RULE_FIELDS` (schemas) and `ruleFacts` (assess.ts)
  together. Captcha secrets are encrypted with the webhook key ring (`encryptSecret`; `reencryptWebhookSecrets`
  covers `risk_settings.captcha_secret_ciphertext`) and never returned or logged (request logs redact `secret`
  and `token`). RDAP lookups send only the domain, never for free or disposable domains. Login networks are keyed
  by the user hash; only users with history get `login.*`, and `block` decisions are never remembered. Memory is **HMAC-only** (`riskHasher`, `RISK_HASH_KEY`, separated by
  environment and kind): velocity keys `<prefix>:risk:v:<event>:<dimension>:{<hash>}` (one key per call, so
  cluster-safe; private IPs never counted), mailbox identities (only rows with a user id count as accounts;
  serialized per mailbox by `pg_advisory_xact_lock` in the insert transaction; `block` decisions never claim the
  mailbox), fraud reports from feedback (IP/subnet ones count 30 days, `NETWORK_REPORT_TTL_MS`). Raw email, IP and
  user agent live only on `risk_assessment` and are purged after `RETENTION_DAYS.riskPersonalData`; `signals` and
  `reasons` must never hold identifiers (messages are rendered on read, `reasonMessage`; the email domain comes from
  the `email` column). Webhook payloads and log lines carry no email or IP. Retries never count twice: `assessRisk`
  serializes an `Idempotency-Key` with a transaction advisory lock and replays before stateful collection.
  `forgetRiskUser` (`DELETE /v1/risk/users/{id}`) must keep removing everything that identifies a user,
  including `previous_user` in other assessments' reasons. IP data: the worker's `risk-datasets` loop downloads Tor,
  cloud ranges and IPinfo Lite into `risk_dataset` (never replacing a good copy with a smaller or invalid one); API
  processes reload changed ones every 5 minutes. Sandbox environments use the fixtures in `src/sandbox.ts`
  (`192.0.2.x`, `@disposable.test`, `@undeliverable.test`, `@new.test`, captcha tokens `test-pass`/`test-fail`),
  documented in `/docs/risk/testing`. Credit IPinfo where its data is shown (CC BY-SA). Permissions: `risk`
  (`assess`, `read`, `feedback`, `update` for settings), `riskList` and `riskRule` (backfilled by `0047` and `0054`);
  members read. Resolving an open review sends `risk.assessment.reviewed`.
  **Content** (`content: { text }` on assessments, `POST /v1/risk/content/classify`): scored per category
  (`CONTENT_CATEGORIES`) by the `text` kind of `@coss/screening`'s classifier at request time (3 s; sandbox
  environments read the markers in `sandboxContentScores`), **outside** the assessment's transaction and after a
  replay pre-check. With an `Idempotency-Key`, a preparation claim (`risk_assessment_preparation`) deduplicates concurrent retries before charging,
  caches only scores for transaction retries, and holds no connection during classification. A crashed
  preparation fails open after 30 seconds without another charge; preparation rows are purged after 48 hours. COSS never decides from scores:
  `content.*` reasons fire only at the environment's `content_thresholds`, and rules test `content.*` fields. The
  text is never stored or logged — the classify route keeps neither request nor response bodies (`CONTENT_REQUESTS` in
  `request-log.ts`) and `redactBody` keeps only string lengths inside `content` objects. Live classifications
  charge the organization's `risk.classify`/`risk.classify.day` buckets (`chargeClassification`): over them, classify
  is a 429 and assessments go on without content (`degraded: ["content"]`). The building blocks
  (`/v1/risk/email/check`, `/ip/check`, classify) store and count nothing about the address or text and share
  `risk:assess` and the `risk.assess` bucket. **Checkouts** (`checkout` on `checkout` events only): amount,
  currency, the card's country/funding, billing and shipping countries; the processor's card `fingerprint` is
  hashed (`card` kind, `card_hash`, velocity dimension `card`, `history.fraud_card`) and redacted from request logs
  (`fingerprint` is a secret-named key). **Devices** (`device: { token }` from `coss/device`, `cd1.<base64url JSON>`,
  read by `readDeviceToken`; unsigned, so device facts are hints): the browser's random id is hashed (`device` kind,
  `device_hash`, `risk_identity` kind `device` for `duplicate.device` under its own advisory lock after the mailbox's,
  velocity and fraud memory); malformed or day-old tokens are `device.invalid`. **IP privacy data**
  (`RiskDeps.ipPrivacy`, `RISK_IP_PRIVACY`): looked up before the transaction like the datasets, 500 ms, failures are
  `degraded: ["ip_privacy"]`; a provider's answer replaces the network's `ip.vpn_network` guess. **Calibration**
  (`GET /v1/risk/calibration`, the dashboard's Calibration page and rule precision): reasons' and rules' outcomes over
  90 days with suggested weights (precision pulled toward the default, none below 20 labeled); COSS only suggests,
  and `risk_settings.reason_weights` (`scoreReasons(reasons, weights)`) applies what the customer chose.
  **Dogfooding**: `@coss/auth/risk` (`setSignUpRiskAssessor`, injected by the dashboard's `lib/risk.ts`) assesses
  `/sign-up/email` and new social accounts in `RISK_SIGNUP_ENVIRONMENT_ID`, failing open after 3 s; only `block`
  refuses (`SIGN_UP_REFUSED`, no reasons). **Rate limiting as a service** (`POST /v1/risk/limits`): GCRA through
  `@coss/ratelimit`'s `RateLimitStore` (the API's Valkey connection) with the bucket's own rule read on every
  check; keys are HMACs (`limit_key`), store keys `<prefix>:risk:l:{<bucket id>:<hash>}` (an `Idempotency-Key`
  caches an allowed answer for an hour under the same hash tag); a store failure answers with the bucket's
  `on_failure` (`degraded: true`). Buckets need `risk:read`/`risk:update`; checks `risk:assess` and the
  `risk.limit` bucket (fails open, so the customer's own `on_failure` decides).
- **Monitoring** (Sentry, `@coss/observability`): api and worker import `src/instrument.ts` first in `src/index.ts`
  (`@sentry/bun`; Bun has no runtime module hooks, so Hono gets `honoMiddleware(app)` in `createApp` — route names
  only, errors come from `onError`'s `console.error` — and pg/AWS calls aren't traced). The dashboard initializes
  its server in `register()` after env validation and exports `onRequestError`; both Next apps' browsers run
  `startBrowserMonitoring` (`src/instrumentation-client.ts`), which fetches the config from the dashboard's
  `/api/monitoring` (public in `proxy.ts`; the site proxies it in `next dev`) and tunnels envelopes through it
  (only the configured DSN's — never make it an open relay or add a Sentry origin to a CSP). The browser SDK is
  dynamically imported from `src/lib/monitoring-browser.ts` (named re-exports) only once that config arrives:
  client code never imports `@sentry/nextjs` statically, and never `import * as Sentry` (the namespace defeats
  tree-shaking and shipped Session Replay — ~150 KB gzipped — on every page). Every server runs
  `captureConsoleIntegration({ levels: ["error"] })`: a `console.error` with an error **is** a Sentry event, so
  packages keep logging handled failures that way and never import an SDK (expected outcomes don't belong in
  `console.error`). Every SDK uses `sentryOptions`: `DATA_COLLECTION` turns off what SDK v11 collects by default (bodies, IPs, cookies, query strings, AI prompts, local variables — never loosen it) and the `scrub*` hooks mask what remains; new URL secrets
  (tokens in paths) go in `SECRET_PATH_SEGMENTS` (`packages/observability/src/scrub.ts`). Tags: `request_id`,
  `organization_id`, `environment_id`, `api_key_id` (API), user id + `organization_id` (dashboard), `loop`,
  `email_id` (worker); never emails or content. No session replay (it would record customer data).
- **iOS app sign-in** (`@coss/auth/mobile`, `apps/web/src/app/app/authorize`, `apps/web/src/lib/mobile-api.ts`): the app
  opens `/app/authorize?code_challenge&state` in an ephemeral browser sheet; the signed-in user approves (refused while
  impersonating or unverified) and gets a 60-second one-time code bound to the PKCE S256 challenge, stored hashed in
  Better Auth's `verification` table (`mobile-auth:` identifiers) and consumed by one `DELETE … RETURNING`. `POST
  /api/mobile/v1/auth/token` (`mobile.token.ip`) opens an ordinary Better Auth session (listed and revocable in
  `/settings/sessions`, ended by password resets; it copies the approving session's `ssoProviderId`) and returns a
  mobile-only credential, `cm1.<session token>.<HMAC over "coss-mobile-session:" + token>` — never Better Auth's
  signed cookie value, which a browser could replay to use the whole dashboard. Better Auth's `bearer` plugin stays
  off — it would expose every web session token in a `set-auth-token` header —, so the credential works only on
  `/api/mobile/*` (public in `proxy.ts`): `requireMobileSession` verifies it, signs the session cookie server-side
  and reads it with the base `@coss/auth` instance (the
  dashboard's `nextCookies()` would set cookies on the app's responses); request cookies never authenticate there.
  `createSession` outside an endpoint skips Better Auth's ban check, so the exchange checks bans itself.
  `requireMobileOrgMember` applies `getMembership` + `orgAccess` + `memberCan` like `requireOrgMember`, as JSON:
  404 for non-members, 403 `sso_required`/`two_factor_required` with the dashboard page to fix it, and a `mobile.api`
  bucket per user. Responses are `@coss/companion` types built from the public objects (webhook rows only through
  `toWebhookEndpointObject`, never secrets); reputation history leaves out policy changes, admin identities and
  notes (like the customer page), sent/received email detail never includes the HTML body, and Hooks endpoints
  and log drains never include secrets. The app's only changes (POST: retry a webhook delivery, recover an
  endpoint's failed deliveries, enable or disable an endpoint, cancel or reschedule a scheduled email,
  report a risk outcome, also from the review queue) repeat the dashboard action's
  checks (`requireMobileWrite`: role, then suspension; the environment owns the endpoint) and record the same audit
  event with `recordAudit`; a new one must too.
- **Push notifications** (`packages/push`, tables `push_device` (ids `pushdev_`) and `push_notification` (`pushntf_`)):
  the app registers its raw APNs token on its own session (`PUT/PATCH/DELETE /api/mobile/v1/push`, `GET` reads it;
  categories `reputation`, `billing`, `endpoints`, `risk_reviews` per device). A device row has `session_id` → `session`
  **ON DELETE CASCADE**: signing out, revoking the session, password resets, bans and the expired-session purge end
  its pushes — never key devices by user alone. A token is unique (`push_device_token_idx`): registering it takes an
  advisory lock on it and removes its other rows (a re-signed-in or handed-over phone). The app's sign-out also
  unregisters from APNs and, offline, keeps the credential to revoke on a later start. Products call `enqueuePush(tx, …)` in the transaction that decided the event — reputation
  warnings/suspensions (`applyTransition`), failed payments and holds (`enqueueBillingNotification`, `PUSHED`, so
  once per `dedupe_key`), endpoints, Hooks endpoints and log drains disabled for failing, and risk reviews in
  **live** environments (`collapse_key` `risk_review:<env id>`: a pending row absorbs later ones, and the worker sends
  at most one per environment every `PUSH_THROTTLE_MS`). The worker's `push-notifications` loop
  (`runDuePushNotifications`, system-level; lease, backoff, `failed` after 8 attempts) fences every write with the
  claimed `attempt_count`, renews the lease after each device and stops once it lost it; events that coalesced into a
  notification after its claim (`count` grew) get a follow-up notification when it settles. It resolves **at send time**:
  the subject must still be in that state (else `skipped`/`resolved`; older than an hour: `too_old`), the paths use
  current slugs, and the recipients (`pushTargets`) are unexpired, unimpersonated app sessions of unbanned members
  whose role can act on it (`AUDIENCE`) and whom `orgAccess` (`@coss/auth/org-access`, shared with the dashboard)
  lets in — the app would refuse to show anything else. `delivered_device_ids` keeps a retry from sending twice;
  APNs' `Unregistered`/`BadDeviceToken` deletes the device. The text passes through Apple: organization, project and
  environment names and counts only — never free-form text (descriptions, application names), addresses, URLs,
  scores or notes. The payload's `body.path` (what expo-notifications calls `data`) is a
  dashboard path that is also the app's route; the app opens only paths in its allow-list (`push-route.ts`).
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
  current state (queued included). If a worker dies after the claim (or SES's answer is lost: a timeout or reset
  connection, `UncertainSendError`), the row stays `queued` until the stale-claim sweep
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

- Receiving is SES-region bound (SES receiving regions only) and accepts any mail for a verified domain of the
  account, then drops what doesn't route (no SMTP-time rejection, no bounces). Over an organization's daily inbound
  limit mail is dropped and only counted. Received `cid:` inline images don't render in the dashboard preview.
  Content written for a message whose row never committed (a crash in between) stays until the lifecycle rule.
- Account emails go to unverified addresses by design (sign-up verification, invitations) from COSS's own
  organization, so bounces from made-up sign-up addresses count against that organization's reputation like any
  customer's — but the worker never suspends it on its own (`systemOrganizationId`: the guard only warns it and a
  screening block only flags its message), and neither can platform admins (the dashboard reads the same variable).
  If it was suspended before this rule, an admin can still lift it. Sign-up and verification
  resends are rate limited per IP and address; invitations only by Better Auth's pending-invitation limit per org.
- Reputation rollups are kept per hour of sending, so late events for an old hour make the next evaluation
  recount that whole hour. Emails are purged 45 days after creation, so a send scheduled weeks ahead can be gone
  before it leaves a 30-day window; its closed hour keeps its rolled-up counts unless a later event forces a recount. A send already past `authorizeLiveSender` when the org is suspended still goes out.
  Customers are told by banner, page, API, webhooks and a notification email to owners/admins — only for warnings
  and suspensions (not recoveries or reinstatements), and only once the worker's `NOTIFICATIONS_*` variables point
  at a verified sender of COSS's own organization.

**Not built yet** (don't assume these exist; delete a line when it ships): the real landing page,
Universal Link sign-in callbacks, an Android app, App Store (beyond TestFlight) releases of the iOS app, push notifications for other events (or per organization),
log drain secret rolls and custom request headers (vendor intake APIs that need an API key header take a relay),
IdP-initiated SAML and SAML single logout, more than one SSO provider per organization,
org logos, uploading a profile picture, user account deletion (before adding it: `sso_provider.user_id` and `member.user_id` cascade, which
would drop an org's SSO provider or last owner), email change,
email/SMS two-factor codes, sign-in providers other than Google and GitHub, "trust this device" for 2FA, renaming passkeys, self-serve add-ons (none is named yet), an automatic direct-debit policy (only per-account
required payment methods), multi-currency, metering for SMS/video/scheduling (their meters
and rates exist; the products don't), and
these Hooks features: channels, payload transformations, custom endpoint headers, sending one message to several
applications, strict ordering, portal custom domains, per-destination rate-limit overrides, Hooks attempts in
environment logs and log drains.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
