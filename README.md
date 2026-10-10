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

Transactional email is the first product. Today it is delivered by a **fake provider** (nothing leaves your
machine); Amazon SES comes next. Development environments always stay on the sandbox provider.

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
cp .env.example .env             # then set DATABASE_URL, TEST_DATABASE_URL and BETTER_AUTH_SECRET
                                 # (openssl rand -base64 32)
bun run db:migrate
bun run db:seed                  # creates demo@coss.local (admin), org "acme", a project, and prints a dev API key
bun run dev                      # dashboard http://localhost:3000 · API http://localhost:3001
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

The email shows up in the dashboard under the project's **Development** environment. Auth emails (email
verification, invitations) are printed to the dashboard's server console in development.

## Concepts

- **Organizations & members** — Better Auth organization plugin (roles: owner, admin, member).
- **Projects** — belong to an organization; each gets two **environments**:
  `production` (mode `live`, keys `coss_live_…`) and `development` (mode `sandbox`, keys `coss_test_…`, never really sends).
- **API keys** — Better Auth API key plugin, owned by the organization and bound to one environment.
- **Platform admins** — Better Auth admin plugin (`/admin` in the dashboard). Promote with `bun run admin:create --email …`.

## Commands

| Command | |
|---|---|
| `bun run dev` | Run dashboard + API |
| `bun run lint` / `bun run format` | Biome check / fix |
| `bun run typecheck` | Type-check every package |
| `bun run test` | Run all tests (against `coss_test`) |
| `bun run build` | Build dashboard + SDK |
| `bun run db:generate` / `db:migrate` / `db:studio` | Drizzle migrations |
| `bun run auth:generate` | Regenerate Better Auth tables after changing auth plugins (then `db:generate` + `db:migrate`) |

## API

- `POST /v1/emails` — send an email (`Idempotency-Key` header supported)
- `GET /v1/emails/{id}` — retrieve an email
- `GET /openapi.json` — OpenAPI 3.1 document
