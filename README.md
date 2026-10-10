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
Postgres + Drizzle · Better Auth (organization, admin, API key plugins) · Tailwind v4 + [coss ui](https://coss.com/ui)

See [AGENTS.md](./AGENTS.md) for the layout, conventions and guardrails.

## Prerequisites

- [Bun](https://bun.com) ≥ 1.4.2 and Node.js ≥ 24 (Next.js and the Better Auth CLI run on Node)
- PostgreSQL 18 (e.g. [Postgres.app](https://postgresapp.com))
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
bun run dev                      # dashboard http://localhost:3000 · API http://localhost:3001 · worker
```

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
- **Suppressions** — per environment. Sends skip a suppressed recipient (status `suppressed`, event
  `email.suppressed`) and still deliver to the rest. An entry covers every email (scope `*`) or one **category**
  (the optional `category` of a send, e.g. `marketing`), so it can back an unsubscribe flow. Permanent bounces and
  complaints add `*` entries automatically (except for mailbox simulator addresses). COSS keeps the only list: SES
  suppression is turned off.
- **Scheduled sends** — pass `scheduled_at` (ISO 8601 with an offset, up to 30 days ahead) and the email is stored
  as `scheduled` (event `email.scheduled`); the worker sends it when it is due, re-checking the domain and the
  suppression list. Until then `POST /v1/emails/{id}/cancel` cancels it (`canceled`, event `email.canceled`).
- **Webhooks** — per environment, signed with [Standard Webhooks](https://www.standardwebhooks.com) headers and
  retried for about a day. Verify them with `verifyWebhook` from the SDK.
- **Platform admins** — Better Auth admin plugin (`/admin` in the dashboard). Promote with `bun run admin:create --email …`.

## Commands

| Command | |
|---|---|
| `bun run dev` | Run dashboard + API + worker |
| `bun run lint` / `bun run format` | Biome check / fix |
| `bun run typecheck` | Type-check every package |
| `bun run test` | Run all tests (against `coss_test`) |
| `bun run build` | Build dashboard + SDK |
| `bun run db:generate` / `db:migrate` / `db:studio` | Drizzle migrations |
| `bun run auth:generate` | Regenerate Better Auth tables after changing auth plugins (then `db:generate` + `db:migrate`) |
| `bun run ses:bootstrap` | Create/update the shared AWS resources for `EMAIL_PROVIDER=ses` (see below) |

## API

- `POST /v1/emails` — send an email (`Idempotency-Key` header supported)
- `GET /v1/emails/{id}` — retrieve an email, with its recipients' delivery status
- `GET /v1/emails/{id}/events` — list an email's delivery events
- `POST /v1/emails/{id}/cancel` — cancel a scheduled email (`scheduled_at` on send)
- `POST|GET /v1/domains`, `GET|DELETE /v1/domains/{id}`, `POST /v1/domains/{id}/verify` — sending domains
  (organization-wide, so every key of the organization sees the same ones)
- `POST|GET /v1/webhook_endpoints`, `GET|PATCH|DELETE /v1/webhook_endpoints/{id}` — webhook endpoints of the
  key's own environment; the signing secret is returned only when one is created
- `POST /v1/suppressions` — suppress an address (`scope`: `*` or a category)
- `GET /v1/suppressions` — list the environment's suppressions (`address`, `scope`, `limit`, `after`)
- `GET /v1/suppressions/check?address=…&category=…` — would a send skip this address?
- `GET /v1/suppressions/{id}` / `DELETE /v1/suppressions/{id}` — retrieve / remove an entry
- `GET /openapi.json` — OpenAPI 3.1 document

Everything is also available in the dashboard, and through the SDK as `coss.email`, `coss.domains` and
`coss.webhookEndpoints`.

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
policy allows `ses:SendEmail` on any identity but only with the COSS configuration set (another set, or none, is
denied); COSS always sends with the organization's tenant, which SES only allows for identities associated with it.
