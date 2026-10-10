# AGENTS.md — apps/site (coss.com)

Landing page (`/`) and docs (`/docs`) on Next.js 16 + [Fumadocs](https://fumadocs.dev), port :3002. Fully static
apart from `/api/search`; no env vars, no database. It shares coss.com with the dashboard (`apps/web`, a separate
zone): dashboard pages and Better Auth (`/api/auth/*`) are same-origin in production. Fumadocs is the **Base UI** build: `fumadocs-ui` is an npm alias
of `@fumadocs/base-ui` (so `fumadocs-openapi`/`fumadocs-twoslash`, which peer on `fumadocs-ui`, get it too); keep
`fumadocs-core`, `@fumadocs/base-ui` on one version. Read the source in `node_modules` before relying on memory —
the macro API, `staticSource` and code-usage APIs are recent.

## Layout

| Path | What |
|---|---|
| `content/docs/` | MDX pages. Top-level folders with `"root": true` are the sidebar tabs: `(guides)` (URL-less group → `/docs/…`; includes the TypeScript SDK pages at `/docs/sdk/…`) and `api-reference`. Order lives in each `meta.json`. |
| `src/lib/collections.ts` | `defineDocs` via `fumadocs-mdx/macro` (compiled by the bundler; `dir` must stay a literal). |
| `source.config.ts` | Global MDX options only: Shiki themes/langs and the Twoslash transformer. |
| `src/lib/openapi.ts` | `createOpenAPI` over the committed `apps/api/openapi.json` (imported, so it is bundled). |
| `src/lib/source.ts` | `loader()` merging MDX + `openapi.staticSource()` (one virtual page per operation at `/docs/api-reference/<tag>/<kebab operationId>`), plus `docsLlms` (`/llms.txt`, `/llms-full.txt`). Server-only. |
| `src/components/api-page.tsx` | `createOpenAPIPage`: code-usage tabs (TypeScript SDK, cURL, Python, Go) and the playground, which calls the API from the browser (allowed by the API's `API_CORS_ORIGINS`). In `next dev` the reference targets `http://localhost:3001` first (`src/lib/openapi.ts`). |
| `src/lib/use-account.ts`, `src/components/account-links.tsx` | Signed-in detection: Better Auth's `/api/auth/get-session` + `/organization/list` from the browser (the session cookie is HttpOnly), so pages stay static. Shows "Dashboard" (first org by name) or "Sign in"/"Sign up". |
| `src/lib/sdk-samples.ts` | `METHOD /path` → `coss` method + argument builders for the SDK tab. |
| `src/app/(home)` | Placeholder landing page (coss ui components). |

## Rules

- **Styling is coss ui.** `src/app/global.css` imports `tailwindcss`, `@coss/ui/theme.css` (tokens), then
  `fumadocs-ui/css/shadcn.css` (maps Fumadocs colors onto those tokens), the Fumadocs/OpenAPI/Twoslash presets. Use
  `@coss/ui/components/*` for custom UI; don't add a Fumadocs color theme or hard-coded colors.
- **API reference comes from the snapshot.** After changing API routes run `bun run openapi:generate` (root) and
  commit `apps/api/openapi.json`; `apps/api/test/openapi-snapshot.test.ts` fails when it is stale. Never import
  `@coss/api` code (it pulls in the DB and AWS SDK) — only `@coss/api/openapi.json`.
- **New endpoint ⇒ SDK sample.** Add its `METHOD /path` to `SDK_SAMPLES`; `test/sdk-samples.test.ts` fails for
  any operation without one, or a sample naming a method missing from the `Coss` client. Samples and the playground
  start from the schemas' `examples` (see the root AGENTS.md); without them they show `"string"` placeholders.
- **No per-method SDK pages:** each endpoint's SDK call is its API reference page's TypeScript tab. The SDK pages
  cover only what isn't an endpoint (client setup, results and errors, retries, `verifyWebhook`); guides show SDK
  usage in context.
- **SDK code in MDX uses ` ```ts twoslash `.** Snippets compile against the built `coss` package (resolved from this
  app; turbo builds the SDK before `dev`/`build`, otherwise `bun run --cwd packages/sdk build`) and an unexpected
  type error **fails the build** — fix the snippet or the SDK, don't add `@noErrors`. Use `// ---cut---` to hide
  setup lines and `//    ^?` to show a type. Blocks are written to `.twoslash/` while checked (git-ignored).
  No Twoslash types cache on purpose: it would hide SDK changes that break snippets.
- Internal links are absolute (`/docs/…`). Facts in the docs (limits, retry schedules, statuses) must match the code;
  update the page when the behaviour changes.
- **Dashboard links** use `dashboardUrl(path)` and a plain `<a>` (another zone: no `next/link`). In `next dev` they
  point at :3000 and `next.config.ts` proxies `/api/auth/*` there; localhost cookies are shared across ports, so a
  dashboard sign-in shows here. Never read the session server-side in pages: that makes them dynamic.
- **Top-level routes are org slugs too:** the dashboard's org slugs are its first URL segment, so every top-level
  route here must be in `RESERVED_ORG_SLUGS` (`test/reserved-slugs.test.ts`). `/ui` is routed to the coss ui app.

Test: `bun run --cwd apps/site test` (DB-free). Build: `bun run --cwd apps/site build`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
