# apps/hub — the hub (the next GitHub, without the code)

`hub.coss.com` (locally :3004): GitHub's layout for projects and people, with everything about
code removed. Nobody reads or shows source here. A **Prompt Request** replaces the pull request:
a change described in English, triaged by the hub, decided by the maintainers (or auto-allowed by
the project's rules), built, tested and shipped by the maintainers' **software factory**, which
reports back into the thread. There are no issues: a request *is* the issue and its resolution.

Next.js 16, standalone-ready like the portal (`next.config.ts`), its own registrable domain
(never under coss.com: same-origin with the dashboard would be a problem). Not deployed by `infra`
yet: no Dockerfile, no service. The layout follows coss.com (`@coss/ui`, Cal Sans/Paper Mono,
grayscale, hue only for status) with GitHub's furniture (tabs, Watch/Star, About, the rows).

## Prototype boundaries (replace, don't extend)

- **Store** (`src/lib/store.ts`): everything in memory on `globalThis`, seeded by `src/lib/seed.ts`
  (cal.com = GitHub's `calcom/cal.com`, its maintainers and contributors with their GitHub
  avatars, Prompt Requests in every state). Reads return live objects; write only through the
  store's functions. Each function maps to a table when this moves to `@coss/db`.
- **Accounts** are real: the hub's own Better Auth instance (`src/lib/auth-options.ts`, the
  instance with `nextCookies()` in `src/lib/auth.ts`, the route at `/api/auth/[...all]`) in the
  hub's own database (`src/db`: `HUB_DATABASE_URL`, locally `coss_hub`; `bun run db:generate`
  after editing `src/db/schema/*.ts`, `bun run db:migrate`; `bun run auth:generate` rewrites
  `src/db/schema/auth.ts` after changing Better Auth options). Email + password, and GitHub when
  `HUB_GITHUB_CLIENT_*` are set. `/onboarding` fills `hub_profile` (`src/lib/profiles.ts`: handle,
  display name, bio, company, location, website, role, what they build, their factory, the
  uploaded avatar as bytes); `requireViewer()` sends unfinished accounts there. `currentViewer()`
  (`src/lib/session.ts`) mirrors the account into the store as a hub `User` so threads and
  profiles resolve it; signed-out visitors read everything and can't write. Avatars of accounts
  are served by `/a/<handle>` (the upload, else the provider's picture proxied). Handles can't be
  an organization's or a route's (`handleProblem`); a seeded person's handle (peerrich…) can be
  claimed, and the account then is that person on the hub with their seeded history (`toUser`
  merges; first come, first served in this prototype).
- **Security headers** (`src/proxy.ts`, `src/lib/security-headers.ts`): strict CSP with no
  third-party image or script origin (only the YouTube player's frame). Every avatar is served
  from `public/avatars`, downloaded by `bun run avatars:fetch` (`scripts/fetch-avatars.ts`:
  GitHub's by handle, Unsplash portraits for people who aren't on GitHub) into
  `src/lib/avatars.generated.ts`; run it after changing the seed's people.

## The Prompt Request lifecycle (`src/lib/workflow.ts`)

`needs_context` → `awaiting_review` → `approved` → `building` → `in_production` (or `declined`,
`failed`). Every transition writes into the thread (`Comment.kind`: `comment`, `triage`,
`decision`, `factory`, `system`); the thread is the audit log.

- **Triage** (`src/lib/triage.ts`): on open, and again on every top-level answer from the author
  while context is missing. Decides whether a factory could start (where, what, expected result)
  and the kind of change (`ChangeKind`). `aiTriager` asks jev (`SCREENING_MODEL` on the AI Gateway,
  `experimental_decide`, the same adapter shape as `@coss/screening/ai`); `fakeTriager` counts
  words and cues ("page broken" never passes). The questions it asks are `CONTEXT_QUESTIONS`.
- **Decision**: maintainers (`Project.maintainers`) approve or decline from the approval card,
  with a comment that is required either way (the author reads it and it goes into the factory's
  brief). Kinds in `Project.autoAllow` skip them (`decision.by === "hub"`).
- **Factory** (`src/lib/factory/`): `Factory` = `start` (a session from the brief), `poll` (its
  updates, status, preview/production URLs, tokens and cost when it reports them) and `message` (a maintainer's reply under a factory
  update, forwarded while it builds). `devin.ts` is Devin's REST API v1 (`POST /sessions`,
  `GET /sessions/{id}`, `POST /sessions/{id}/message`; `fetch` injectable; `HUB_FACTORY=devin` +
  `DEVIN_API_KEY`); `fake.ts` plays four
  stages in 30 s, computed from the session id's start time (no timers). `syncBuild` copies new
  updates into the thread when the thread is read (`LiveRefresh` re-reads every 4 s while
  building); `Build.seenUpdates` keeps them from repeating.
- Routes: `/` (coss.com's crowd-opinionated page, the live `/calcom/cal.com` framed as the demo
  (`ProductDemo`; the CSP allows `frame-ancestors 'self'`), plus what's on the hub), `/sign-in`,
  `/sign-up`, `/onboarding`, `/<owner>` (profile or
  organization), `/<owner>/<project>` (overview: latest shipped, the README from `ReadmeBlock`s,
  open requests, About), `…/prompts` (filters), `…/prompts/new`, `…/prompts/<number>` (the
  thread), `…/factory` (what it runs on, working on now, queue, rules, shipped), `…/insights`
  (stats, bklit charts on made-up series, what the factory burned, the contribution graph).
- **The thread** (`src/components/thread/thread.tsx`, client) is coss ui's chat, all of it, on
  the scrolling page with the composer pinned: date pills, the unread divider from the viewer's previous
  read (`PromptRequest.reads`, written by `markRead` when the page renders: that is the read
  receipt), grouped messages, `ChatDeliveryIndicator` on the viewer's own messages, reactions
  (`Comment.reactions`, `toggleReaction`), the action toolbar (react, reply, copy, message info
  with who read it), reply references and the animated reply preview, collapsible long bodies,
  the typing indicator while the factory works, a status bar per state. The page builds a
  serializable `ThreadView` (`view.ts`) for it; avatars come from it, never from the store.
  **No client component imports the store** (`"use client"` bundles it with the seed and loses
  every account): pass what they show as props.
- **Charts** (`src/components/charts`, `src/components/shimmering-text.tsx`, `src/lib/utils.ts`)
  are vendored from bklit's shadcn registry (`components.json`, `@bklit`), excluded from Biome;
  `bunx shadcn@latest add @bklit/<name>` from this directory re-adds them. Their tokens
  (`--chart-*`) sit in `globals.css`.
  Mutations are server actions next to their page (`actions.ts`), re-reading the actor from the
  cookie and the request from the store; errors are `HubError` messages.

## Tests

`bun run --cwd apps/hub test`: `test/triage.test.ts` (the fake's bar), `test/devin.test.ts` (the
client against a fake `fetch`), `test/workflow.test.ts` (open → ask → answer → approve → build →
production with the fakes). DB-free; no preload.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
