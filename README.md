# COSS

One API key, one SDK, every communication primitive:

```ts
import { Coss } from "coss";

const coss = new Coss({ apiKey: process.env.COSS_API_KEY });

const { data, error } = await coss.email.send({
  from: "Acme <hello@acme.dev>",
  to: "user@example.com",
  subject: "Welcome",
  html: "<p>Hi there</p>",
});
```

Transactional email is the first product, delivered by **Amazon SES** (`EMAIL_PROVIDER=ses`) or a **fake
provider** for local development (nothing leaves your machine). Development (sandbox) environments always use the
fake provider, which simulates delivery events like the SES mailbox simulator. Live sends come from verified
domains; every recipient gets a delivery status, and signed webhooks report `email.delivered`, `email.bounced`
and the rest.

## Stack

Bun workspaces · Turborepo · TypeScript 7 · Biome · Next.js 16 (dashboard) · Hono (public API) ·
Postgres + Drizzle · Valkey (rate limits) · Better Auth (organization, admin, API key plugins) · Tailwind v4 + [coss ui](https://coss.com/ui) ·
[Fumadocs](https://fumadocs.dev) (coss.com and its docs: OpenAPI reference, Twoslash)

See [AGENTS.md](./AGENTS.md) for the layout, conventions and guardrails.

## Prerequisites

- [Bun](https://bun.com) ≥ 1.4.2 and Node.js ≥ 24 (Next.js and the Better Auth CLI run on Node)
- PostgreSQL 18 (e.g. [Postgres.app](https://postgresapp.com))
- [Valkey](https://valkey.io) 8 (or Redis) for the test suite, e.g. `brew install valkey && brew services start valkey`
- VS Code: install the recommended extensions (Biome, TypeScript Native Preview)

## Setup

```sh
bun install
createdb coss && createdb coss_test
cp .env.example .env             # then set DATABASE_URL, TEST_DATABASE_URL, BETTER_AUTH_SECRET and
                                 # WEBHOOK_SECRETS_KEY (each: openssl rand -base64 32)
bun run db:migrate
bun run db:seed                  # creates demo@coss.local (admin), org "acme" with the verified domain
                                 # acme.test, a project, and prints a dev API key
bun run dev                      # dashboard http://localhost:3000/dashboard · API http://localhost:3001 ·
                                 # site + docs http://localhost:3002 · worker
```

`db:migrate` also installs the `pgboss` schema: sends return `202` with `status: "queued"` and the worker
dispatches them moments later, so keep the worker running.

Send an email with the key printed by the seed:

```sh
curl -X POST http://localhost:3001/v1/emails \
  -H "Authorization: Bearer $COSS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"Acme <hello@acme.dev>","to":"user@example.com","subject":"Hello","text":"Hi!"}'

# or with the SDK from this repo
COSS_API_KEY=coss_test_... COSS_BASE_URL=http://localhost:3001 bun packages/sdk/examples/send-email.ts
```

The email shows up in the dashboard under the project's **Development** environment, with per-recipient
status and events. Send to `bounce@simulator.amazonses.com` (or `complaint@`, `suppressionlist@`) to simulate
failures. Add a webhook endpoint in the environment's **Webhooks** page (local `http://` URLs are allowed outside
production) and the worker delivers signed events to it. Auth emails (email verification, invitations, password
resets) are printed to the dashboard's server console in development.

## Concepts

- **Organizations & members** — Better Auth organization plugin (roles: owner, admin, member).
- **Projects** — belong to an organization; each gets two **environments**:
  `production` (mode `live`, keys `coss_live_…`) and `development` (mode `sandbox`, keys `coss_test_…`, never really sends).
- **API keys** — Better Auth API key plugin, owned by the organization and bound to one environment.
- **Domains** — owned by the organization and shared by its projects. Live keys can only send from verified
  domains (Easy DKIM + a `send.` MAIL FROM subdomain); sandbox keys accept any `from`.
- **Recipients & events** — each email has one recipient per distinct address, whose status follows delivery
  events: `queued` → `sent` → `delivery_delayed` → `delivered`, then `bounced`/`suppressed`/`failed`, `complained`.
- **Attachments** — up to 20 base64 files per send (25 MB combined), inline images via `content_id` (`cid:`).
  Only metadata is kept once the email is sent.
- **Suppressions** — per environment. Sends skip a suppressed recipient (status `suppressed`, event
  `email.suppressed`) and still deliver to the rest. An entry covers every email (scope `*`) or one **category**
  (the optional `category` of a send, e.g. `marketing`), so it can back an unsubscribe flow. Permanent bounces and
  complaints add `*` entries automatically (except for mailbox simulator addresses). COSS keeps the only list: SES
  suppression is turned off.
- **Scheduled sends** — pass `scheduled_at` (ISO 8601 with an offset, up to 30 days ahead) and the email is stored
  as `scheduled` (event `email.scheduled`); the worker sends it when it is due, re-checking the domain and the
  suppression list. Until then `POST /v1/emails/{id}/cancel` cancels it (`canceled`, event `email.canceled`).
- **Open & click tracking** — off by default. Turn it on per environment (a default plus per-category rules, in the
  dashboard) or per send (`tracking: { opens, clicks }`). COSS adds an invisible image and rewrites HTML links to its
  own redirect (`API_PUBLIC_URL/t/…`) when it hands the email to the provider; the stored email keeps the original
  HTML. Opens and clicks show up as `email.opened` / `email.clicked` events, webhooks, counts on the email
  (`tracking`) and per-link click counts. Independent of SES's own tracking, which stays off.
- **Webhooks** — per environment, signed with [Standard Webhooks](https://www.standardwebhooks.com) headers and
  retried for about a day. Verify them with `verifyWebhook` from the SDK.
- **Single sign-on** — per organization, OpenID Connect or SAML 2.0 (Better Auth's SSO plugin), set up under
  the organization's Settings → Single sign-on. Its domains must be the organization's **verified email domains**:
  no second DNS check. People at those domains join as members on their first SSO sign-in, and existing accounts
  with a verified email are linked. Owners can **require SSO**: members and admins then need an SSO session from the
  organization's provider (owners keep password "break-glass" access). An SSO session also satisfies the
  organization's two-factor requirement — the IdP is responsible for MFA. Support recovers broken setups from
  `/admin` (unlink a user's SSO accounts, stop requiring SSO, disable a provider).
- **Platform admins** — the console at `/admin` (promote with `bun run admin:create --email …`): search users and
  organizations; ban users (with a reason and duration — signs them out everywhere), grant/remove the admin role,
  revoke sessions, impersonate (with a reason, never other admins); **suspend organizations** (API keys get 403
  `organization_suspended`, webhook deliveries are held until lifted, the dashboard turns read-only and membership
  changes are blocked; members never see the internal reason); revoke a single leaked API key. Every action is
  recorded in an append-only audit log (`/admin/audit`). Banning a user doesn't stop their organizations' keys —
  suspend the organization for that.

## Commands

| Command | |
|---|---|
| `bun run dev` | Run dashboard + API + site + worker |
| `bun run lint` / `bun run format` | Biome check / fix |
| `bun run typecheck` | Type-check every package |
| `bun run test` | Run all tests (against `coss_test`) |
| `bun run build` | Build dashboard + site (standalone servers) + SDK |
| `bun run db:generate` / `db:migrate` / `db:studio` | Drizzle migrations |
| `bun run auth:generate` | Regenerate Better Auth tables after changing auth plugins (then `db:generate` + `db:migrate`) |
| `bun run ses:bootstrap` | Create/update the shared AWS resources for `EMAIL_PROVIDER=ses` (see below) |
| `bun run valkey:bootstrap` | Create/update the ElastiCache Serverless for Valkey cache for rate limits (see below) |
| `bun run ratelimit:set --org <slug> [--bucket … --limit … \| --reset]` | Show or change an organization's rate limits |

## API

- `POST /v1/emails` — send an email (`Idempotency-Key` header supported)
- `GET /v1/emails/{id}` — retrieve an email, with its recipients' delivery status
- `GET /v1/emails/{id}/events` — list an email's delivery, open and click events
- `GET /v1/emails/{id}/links` — list an email's tracked links with their click counts
- `POST /v1/emails/{id}/cancel` — cancel a scheduled email (`scheduled_at` on send)
- `POST|GET /v1/domains`, `GET|DELETE /v1/domains/{id}`, `POST /v1/domains/{id}/verify` — sending domains
  (organization-wide, so every key of the organization sees the same ones)
- `POST|GET /v1/webhook_endpoints`, `GET|PATCH|DELETE /v1/webhook_endpoints/{id}` — webhook endpoints of the
  key's own environment; the signing secret is returned only when one is created
- `POST /v1/suppressions` — suppress an address (`scope`: `*` or a category)
- `GET /v1/suppressions` — list the environment's suppressions (`address`, `scope`, `limit`, `after`)
- `GET /v1/suppressions/check?address=…&category=…` — would a send skip this address?
- `GET /v1/suppressions/{id}` / `DELETE /v1/suppressions/{id}` — retrieve / remove an entry
- `POST /v1/suppressions/import` — add up to 1,000 entries at once (invalid ones are skipped and reported)
- `GET /v1/suppressions/export` — the whole list as CSV (`scope`, `reason` filters); it imports again as is
- `GET /openapi.json` — OpenAPI 3.1 document
- `GET /t/o/{token}`, `GET /t/c/{token}/{position}` — public open-pixel and click-redirect endpoints that tracked
  emails link to (not part of the documented API)

Everything is also available in the dashboard, and through the SDK as `coss.email`, `coss.domains` and
`coss.webhookEndpoints`.

Requests are rate limited per API key by route class (reads, writes, sends; responses carry `RateLimit-Limit`,
`RateLimit-Remaining` and `RateLimit-Reset`), and sends count their distinct recipients against the
organization's quota per second and per day (sandbox environments have a small daily quota of their own).
Over a limit the API answers `429 rate_limit_error` (`rate_limited` or `quota_exceeded`) with `Retry-After`.
Defaults live in `packages/ratelimit/src/buckets.ts`; platform admins override them per organization with
`bun run ratelimit:set`. The dashboard limits sign-in, sign-up, password reset and verification emails per
client IP and per email address.

## Running on Amazon SES

Each organization gets its own SES **tenant** (isolated reputation and pausing), created with its first domain.
SES suppression is off for tenants and the configuration set: COSS's own suppression lists decide who is skipped. All tenants share one **configuration set**, which publishes delivery events to SNS → SQS,
where the worker picks them up; an EventBridge rule sends tenant pause/resume events to the same queue.

1. Use a dedicated AWS account (or at least region) per stage: SES identities are account-wide, so the same
   domain can't be verified in two stages of one account. New accounts start in the SES sandbox; request
   production access in the SES console.
2. Apply `bun run db:migrate`, then with admin credentials and this stage's `DATABASE_URL`, create the shared
   resources (idempotent; re-run after upgrades):
   `AWS_REGION=eu-west-1 bun run ses:bootstrap [--name coss] [--tenant-prefix coss] [--alert-email ops@…]`
   This also creates least-privilege IAM policies `<name>-api`, `<name>-dashboard` and `<name>-worker` (path
   `/coss/`, defined in `apps/worker/scripts/ses-policies.ts`) and, with `--alert-email`, CloudWatch alarms
   (`<name>-events-dead-letters`: events failed to be recorded; `<name>-events-backlog`: the worker isn't
   consuming) sent to that address once its SNS subscription is confirmed.
3. Set what it prints (`EMAIL_PROVIDER=ses`, `AWS_REGION`, `SES_CONFIGURATION_SET`, `SES_TENANT_PREFIX`,
   `SES_EVENTS_QUEUE_URL`) for the API, dashboard and worker, and attach each app's policy to the identity it
   runs as (role, or credentials as a last resort).
   When upgrading an existing SES deployment, pause sends and domain changes, drain the SES event
   queue with the worker, then run bootstrap before resuming with the new application version.
   For scheduled sends, first apply migration `0014_pretty_thunderbolts` with `bun run db:migrate`.
   Deploy the API and worker from the same release. Rerun bootstrap with the deployment's existing region, name and tenant prefix
   to update the attached `<name>-worker` policy with SES send permissions before starting the new
   worker. Bootstrap makes the updated policy version the default; existing attachments stay in place.
   If you manage IAM policies separately, apply both worker `ses:SendEmail` grants from
   `apps/worker/scripts/ses-policies.ts` (identities and the COSS configuration set).
   Bootstrap imports historical SES permanent bounces and complaints into their original live
   environments, and conservatively copies the SES account and tenant lists to every live
   environment of each matching organization (SES lists have no environment attribution).
   Sandbox lists are untouched. The database records completion per tenant in the same transaction;
   reruns preserve later COSS removals. All imports must succeed before bootstrap disables any SES
   suppression. Keep traffic paused if bootstrap fails, correct the error, and rerun it.
   Bootstrap needs `ses:ListSuppressedDestinations` for both account and tenant lists in addition
   to its infrastructure permissions; an unmapped SES tenant stops the transition.

COSS tags the identities it creates `coss_managed=<tenant prefix>` and only ever recreates or deletes identities
carrying its own tag (enforced in code and by the IAM policies), so domains verified by hand in the same account
are left alone. Sending can't be limited by tag (SES authorizes sends against the sender address), so the API
and worker policies allow `ses:SendEmail` on any identity but only with the COSS configuration set (another set,
or none, is denied); COSS always sends with the organization's tenant, which SES only allows for identities associated with it.

## Rate limits on ElastiCache Serverless for Valkey

Rate limit counters live in Valkey (one GCRA bucket per key, updated atomically by a Lua script with the
server's clock). Without `VALKEY_URL` each process counts in memory, which is fine for development but
refused in production. If Valkey is unreachable, requests are **allowed** (fail open) and a warning is logged.

1. The cache lives in a VPC: the API and dashboard must run in it, and its security group must allow inbound
   TCP 6379 from them.
2. With admin credentials, create it (idempotent; it takes a few minutes the first time):
   `AWS_REGION=eu-west-1 bun run valkey:bootstrap --subnet-ids subnet-a,subnet-b --security-group-ids sg-… [--name coss] [--max-ecpu 5000] [--max-storage-gb 1]`
   It creates a password user limited to the `<prefix>:*` keys and the commands the limiter uses, a disabled
   `default` user, a user group and the serverless cache (Valkey 8, TLS).
3. Set what it prints (`VALKEY_URL=rediss://…`, `VALKEY_CLUSTER=true`, `RATE_LIMIT_KEY_PREFIX`) for the API
   and dashboard. The password is only printed when the user is created; `--rotate-password` makes a new one
   (running processes fail open until they get it).
4. Set `CLIENT_IP_HEADER` (e.g. `x-forwarded-for`) and `TRUSTED_PROXY_COUNT` (how many of your proxies append
   to it) to match your load balancers; without them per-IP limits (repeated invalid API keys, dashboard
   sign-in) are off, because the socket address would be the load balancer's.

## Deploying to AWS

Everything runs on AWS; nothing is provisioned yet. The repository holds what provisioning needs: one
Dockerfile per app (`apps/{web,site,api,worker}/Dockerfile`, built from the repository root) and a
machine-readable spec in [`infra/`](./infra/AGENTS.md): `bun run --cwd infra aws:spec` prints every service's
port, health check, stop timeout, size, task-role policy and env vars, the ALB listener rules and the
CloudFront behaviours as JSON. This section is the runbook around it.

```
viewer ─▶ CloudFront + WAF ──(HTTPS, X-Origin-Verify)──▶ ALB ─┬─▶ web    (Next, :3000) ─┐
          coss.com, api.coss.com                              ├─▶ site   (Next, :3002)  ├─▶ RDS Postgres
                                                              ├─▶ api    (Bun,  :3001) ─┤   SES · SNS · SQS
                                                              └─▶ ui     (coss ui app)  │   EventBridge
                                                     worker (Bun, no load balancer) ────┘
```

### Resources

- **Network:** a VPC over 2+ AZs; public subnets for the ALB and the NAT gateway, private subnets for tasks and
  RDS. Security groups: ALB inbound 443 only from the managed prefix list
  `com.amazonaws.global.cloudfront.origin-facing`; each service's tasks inbound only from the ALB on their port;
  RDS 5432 only from the web, api and worker tasks; ElastiCache Serverless 6379 only from web and api.
- **NAT gateway (required):** the worker delivers customer webhooks to arbitrary public URLs and ports, and
  domain verification in web, api and worker queries public DNS (1.1.1.1 / 8.8.8.8, port 53) directly. The site
  needs no egress. **Cost trap:** NAT charges per GB processed, so keep AWS traffic off it with VPC endpoints:
  interface endpoints for `sqs`, `secretsmanager`, `ecr.api`, `ecr.dkr`, `logs` (and the SES API if
  `aws ec2 describe-vpc-endpoint-services` lists one for your region), plus the free `s3` gateway endpoint (ECR
  image layers).
- **ECS on Fargate (arm64):** one cluster, four services (`web`, `site`, `api`, `worker`), one ECR repository per
  image, CloudWatch log groups (`awslogs`). Task sizes, minimum counts and `stopTimeout` (worker 120 s) are in
  `infra/aws/services.ts`.
- **ALB:** HTTPS listener with an ACM certificate (in the stack's region) for `coss.com` and `api.coss.com`
  (CloudFront forwards the viewer `Host`, and validates the origin certificate against it). Default action: fixed
  403. Rules from the spec, which are generated from `ZONE_ROUTES` in `packages/auth/src/slugs.ts`:

  | Priority | Conditions (all also require `X-Origin-Verify`) | Target group |
  |---|---|---|
  | 10 | host `api.coss.com` | api |
  | 20… | the site's paths: `/`, `/docs`, `/docs/*`, `/llms.txt`, `/llms-full.txt`, `/site-assets/*`, `/icon.svg`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml`, `/.well-known/*` (3 per rule) | site |
  | … | `/ui`, `/ui/*` | ui (separate app) |
  | last | host `coss.com` (every other path: org slugs, `/dashboard`, `/api/auth/*`, `/_next/*`) | web |

  Target groups: health checks `/api/health` (web, site) and `/health` (api), HTTP 200, no database access;
  deregistration delay 30 s. Keep the idle timeout at 60 s: the apps hold idle connections for 75 s
  (`KEEP_ALIVE_TIMEOUT`, Bun `idleTimeout`) so the ALB never reuses one they are closing.
- **CloudFront + WAF:** two distributions with the ALB as their only origin (HTTPS only, custom header
  `X-Origin-Verify: <secret>`), certificates from ACM in us-east-1, HTTP→HTTPS redirect, a response headers policy
  that adds HSTS. Every behaviour uses the origin request policy `Managed-AllViewer` (all viewer headers including
  `Host`, cookies and query strings).
  - `coss.com`: default behaviour `Managed-CachingDisabled` (dashboard, auth, server actions, and the landing page,
    since a path pattern can't match exactly `/`). The cached behaviours from the spec (`/_next/static/*`,
    `/site-assets/*`, `/docs`, `/docs/*`, `/llms*.txt`, root files, `/.well-known/*`, `/ui*`) use a custom cache
    policy that honours the origin's `Cache-Control`: min/default TTL 0, max 1 year, all query strings (`_rsc`),
    no cookies, and the headers `RSC`, `Next-Router-Prefetch`, `Next-Router-State-Tree`,
    `Next-Router-Segment-Prefetch` in the cache key. Docs pages are sent with `s-maxage=31536000`: **invalidate
    `/*` after every site deploy.**
  - `api.coss.com`: default behaviour only, never cached.
  - WAF web ACLs (scope `CLOUDFRONT`): AWS managed rule groups (common, known bad inputs, IP reputation) plus a
    rate-based rule until app-level rate limiting exists. Set the common rule set's `SizeRestrictions_BODY` to
    count: API sends (HTML bodies) and dashboard requests routinely exceed its 8 KB limit.
- **RDS Postgres 18:** private, encrypted, Multi-AZ for production. Apps connect with
  `?sslmode=verify-full&sslrootcert=/etc/ssl/certs/rds-global-bundle.pem` (each image ships the RDS CA bundle
  there). **Pool sizing:** every task opens up to `DATABASE_POOL_MAX` (default 10) app connections.
  Each API task also opens one pg-boss metadata connection; each worker adds up to four pg-boss
  connections and one LISTEN connection. Budget
  `(max web + max api + max worker tasks) × DATABASE_POOL_MAX + max api tasks + 5 × max worker tasks`,
  plus two connections for migrations and a few for operators. Keep the total below `max_connections` (`SHOW max_connections;` — on RDS it scales with instance memory, roughly
  `memory / 9.5 MB`). Lower the pool size or add RDS Proxy before scaling task counts past that.
- **SES, SNS, SQS, EventBridge:** created by `ses:bootstrap` (see [Running on Amazon SES](#running-on-amazon-ses)),
  run as a one-off task (below).
- **Route 53:** `coss.com` and `api.coss.com` alias records to their distributions.

### Secrets and environment

One Secrets Manager secret per stage (JSON), injected through each task definition's `secrets`:
`VALKEY_URL` (from `valkey:bootstrap`), `DATABASE_URL`, `BETTER_AUTH_SECRET`, `WEBHOOK_SECRETS_KEY` and `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (generate the
last three with `openssl rand -base64 32`; losing `WEBHOOK_SECRETS_KEY` makes webhook secrets unreadable). The origin
header value is a separate secret, used only by CloudFront and the ALB rules (rotate it by adding the new value to the
rules, then CloudFront, then removing the old one). Plain values per service:

| Service | Variables |
|---|---|
| web | `BETTER_AUTH_URL=https://coss.com`, `API_PUBLIC_URL=https://api.coss.com`, `TRUSTED_PROXY_HOPS=2`, `EMAIL_PROVIDER=ses`, `AWS_REGION`, `SES_CONFIGURATION_SET`, `SES_TENANT_PREFIX`, optional `DATABASE_POOL_MAX`, `VALKEY_CLUSTER=true`, `RATE_LIMIT_KEY_PREFIX=coss`, `CLIENT_IP_HEADER=x-forwarded-for`, `TRUSTED_PROXY_COUNT=2` |
| api | the same minus `TRUSTED_PROXY_HOPS`, plus `API_CORS_ORIGINS=https://coss.com` |
| worker | `API_PUBLIC_URL=https://api.coss.com`, `EMAIL_PROVIDER=ses`, `AWS_REGION`, `SES_CONFIGURATION_SET`, `SES_TENANT_PREFIX`, `SES_EVENTS_QUEUE_URL` |
| site | none (static; everything it needs is in the image) |

Images are built once and promoted through stages: builds set `SKIP_ENV_VALIDATION` and bake in nothing
stage-specific (only `NEXT_DEPLOYMENT_ID`, the commit). Each server validates its environment at startup and exits
if it is wrong. AWS credentials come from the task role.

### IAM

- **Execution role** (shared): pull from ECR, write logs, read the stage's secret (`secretsmanager:GetSecretValue`,
  plus `kms:Decrypt` with a customer key).
- **Task roles:** web → `<name>-dashboard`, api → `<name>-api`, worker → `<name>-worker`: the policies
  `ses:bootstrap` creates under `/coss/` (defined in
  [`apps/worker/scripts/ses-policies.ts`](./apps/worker/scripts/ses-policies.ts)). The site gets no permissions.
  The `ses-bootstrap` one-off task needs a role that can manage SES, SNS, SQS, EventBridge, IAM and CloudWatch.

### Deploy order

1. Build and push the four images, tagged with the commit (`docker build --platform linux/arm64 -f
   apps/web/Dockerfile --build-arg NEXT_DEPLOYMENT_ID=<sha> .`; only the Next apps use the build arg).
2. Run migrations as a one-off task from the worker image: `bun packages/db/src/migrate.ts` (needs only
   `DATABASE_URL`; never two at once). Wait for exit code 0. Migrations must be backward compatible with the
   running code.
3. Update `api` and `worker`, then `web` and `site`. Rolling deploys keep 100 % healthy; SIGTERM drains each task
   (Next and the API finish in-flight requests, the worker finishes each loop's current item).
4. Invalidate `/*` on the coss.com distribution once the site is stable.

First deployment of a stage: network, RDS, ElastiCache (`valkey:bootstrap`) and secrets → images → migrate → `ses-bootstrap` one-off task
(`bun apps/worker/scripts/ses-bootstrap.ts --name coss --tenant-prefix coss`, prints the SES variables) → services,
ALB, CloudFront, WAF, DNS → sign up on the dashboard → `create-admin` one-off task from the api image
(`bun packages/tenancy/scripts/create-admin.ts --email you@example.com`, with the api's environment) → request SES
production access.

### Known gaps

- Next's data cache is per task (in memory and on local disk). Nothing uses `revalidateTag`/ISR today; a shared
  `cacheHandler` is needed before anything does.
