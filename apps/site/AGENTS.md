# AGENTS.md — apps/site (coss.com)

Landing page (`/`), pricing (`/pricing`), Shipyard's landing page (`/shipyard`) and docs (`/docs`) on Next.js 16 + [Fumadocs](https://fumadocs.dev), port
:3002. Fully static apart from the docs search (`/docs/search.json`) and the health check; no env vars, no database.
It shares coss.com with the dashboard (`apps/web`, the default zone): dashboard pages and Better Auth (`/api/auth/*`) are same-origin in
production, and the load balancer sends this app only the paths in `ZONE_ROUTES` (`@coss/auth/slugs`). Fumadocs is
the **Base UI** build: `fumadocs-ui` is an npm alias of `@fumadocs/base-ui` (so `fumadocs-openapi`/`fumadocs-twoslash`,
which peer on `fumadocs-ui`, get it too); keep
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
| `src/lib/use-account.ts`, `src/components/account-links.tsx` | Signed-in detection: Better Auth's `/api/auth/get-session` from the browser (the session cookie is HttpOnly), so pages stay static. Shows "Dashboard" (`/dashboard`, which opens the user's organization) or "Sign in"/"Sign up". |
| `src/lib/security-headers.ts` | CSP and framing headers for every response (`next.config.ts`); the playground's `connect-src` comes from the OpenAPI document's `servers`. |
| `src/app/docs/search.json`, `src/app/api/health` | Docs search (Fumadocs, `SEARCH_API`); the load balancer's health check (never routed on coss.com). |
| `src/app/{icon.svg,robots.ts,sitemap.ts}` | coss.com's root files: the site owns them (the dashboard links to `/icon.svg`). |
| `src/lib/sdk-samples.ts` | `METHOD /path` → `coss` method + argument builders for the SDK tab. |
| `src/instrumentation-client.ts`, `src/app/global-error.tsx` | Browser error monitoring (Sentry): configuration from the dashboard's `/api/monitoring` (same origin on coss.com; `next.config.ts` proxies it in `next dev`), events tunnelled through it to the dashboard's `web` project. The server reports nothing. |
| `src/app/(home)` | Placeholder landing page (coss ui components), the pricing page, the legal pages and `SiteFooter`. |
| `src/app/(home)/pricing`, `src/components/pricing/`, `src/lib/pricing.ts` | `/pricing`: plan cards, an email bill estimator (a client island rating with `@coss/billing/engine`'s `chargeRange`, so it matches invoices), usage rate cards, the plan comparison (`planRows()`, shared with the billing guide's `<PlanTable />`) and an FAQ. Every price, limit and allowance comes from `@coss/billing/catalog`; product availability from `PRODUCTS` (`src/lib/site.ts`). |
| `src/app/(shipyard)/shipyard`, `src/components/shipyard/runtime.tsx`, `src/lib/shipyard.ts`, `public/shipyard/assets/` | `/shipyard`: Shipyard's landing page as it was at berthd.app (moved from the coss ui repository's `apps/shipyard`), in its own route group with its own header links. The page is static markup styled by `landing.css` (scoped to `.shipyard-landing`, its own tokens; the layout loads Cal Sans from `@coss/ui/fonts` for its headlines and JetBrains Mono); the harbour, the night loop, the chapters' loops and line scenes are plain scripts in `public/shipyard/assets` (same-origin, so the CSP allows them) that `LandingRuntime` appends after the first paint and redraws on theme changes. `SHIPYARD` holds its copy, paths and outbound links: downloads, the live demo and the box's install line stay on berthd.app / GitHub releases, and the docs link to the `cosscom/shipyard` repository until they move here. |
| `content/legal/`, `src/lib/legal.ts`, `src/app/(home)/legal` | Terms, Privacy Policy, Acceptable Use Policy, Data Processing Addendum (incorporated into the Terms) at `/legal/…` (Cal.com, Inc. is the legal entity). Their own `defineDocs` collection + `loader`, so they stay out of the docs' sidebar, search and `/llms.txt`; frontmatter needs `lastUpdated` (YYYY-MM-DD). The sign-up form links to `/legal/terms` and `/legal/privacy`. |

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
- Internal links are absolute (`/docs/…`). Facts in the docs and on the pricing page (limits, retry schedules,
  statuses, billing rules) must match the code; update the page when the behaviour changes. Never hard-code a price
  or limit: read it from `@coss/billing/catalog` (the pricing FAQ computes its worked example too).
- **Dashboard links** use `dashboardUrl(path)` and a plain `<a>` (another zone: no `next/link`). In `next dev` they
  point at :3000 and `next.config.ts` proxies `/api/auth/*` there; localhost cookies are shared across ports, so a
  dashboard sign-in shows here. Never read the session server-side in pages: that makes them dynamic.
- **A new top-level route needs a `ZONE_ROUTES` entry** (`packages/auth/src/slugs.ts`): the dashboard is the default
  zone, so without one the load balancer never sends the path here, and its first segment would stay free as an org
  slug. `test/reserved-slugs.test.ts` fails for any route that isn't routed here. Paths under `/docs` need nothing.
  Never add routes under `/api` (the dashboard's on coss.com) or bare `/_next` (assets use `assetPrefix`
  `/site-assets`). `/ui` is routed to the coss ui app. Localized pages use 2-letter prefixes (`/de/…`).
- **Legal pages state facts about the product** (what is stored and for how long, content screening, reputation
  thresholds, subprocessors, cookies). Update them, and their `lastUpdated`, when that behaviour changes: adding a
  subprocessor, an analytics script or a cookie, or a new kind of personal data, is a Privacy Policy change, and
  material changes need notice (Terms section 17). A new subprocessor of Customer Data also goes in the DPA's Annex 3
  and needs 30 days' notice (DPA section 5.3); a new security measure or data category belongs in its Annexes 1–2.
  Have legal review substantive edits.
- **Third-party scripts need the same review as dashboard code.** The site is same-origin with the dashboard: any
  script here can call `/api/auth/*` and the dashboard's server actions as the signed-in user. The CSP
  (`src/lib/security-headers.ts`) allows no script origin but this one; adding one (analytics, chat widgets, tag
  managers) is a security decision, not a marketing one. Scripts keep `'unsafe-inline'` because static pages can't
  carry per-request nonces and Next's inline scripts differ per page (no hashes), so never render untrusted HTML.
  The playground's `connect-src` follows the OpenAPI `servers` automatically.
- **Static and cached.** Pages are static and served from CloudFront by their `Cache-Control` (docs:
  `s-maxage=31536000`; deploys invalidate `/*`). Don't read cookies, headers or env in pages: that makes them
  dynamic, and the image is shared by every stage.

Test: `bun run --cwd apps/site test` (DB-free). Build: `bun run --cwd apps/site build`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
