# apps/sign — Sign's signing app

The page a signer opens to sign a signature request: in the customer's app (an iframe, mounted with
`mountSigning` from `coss/sign`), by redirect, or from coss.com's email (later). Next.js 16 (:3004
locally), standalone image (`Dockerfile`), meant for its own ECS service on **its own registrable
domain** (placeholder `cosssign.com`; not deployed yet, `SIGN_PUBLIC_URL` unset in production):
never serve it under coss.com, which would make it same-site with the dashboard. Product rules are
in `packages/sign/AGENTS.md`.

## Auth (no cookies, ever)

- The customer's backend creates a session for an `embedded` signer (`POST
  /v1/sign/requests/{id}/signers/{signer_id}/sessions`, `coss.sign.sessions.create`). Only
  `sha256(token)` is stored (`sign_session`).
- The URL is `/s/<session id>#<token>`. The id is not secret (it only selects the page's
  `frame-ancestors`); the token stays in the fragment, which never reaches a server, and the page
  moves it to `sessionStorage` (this tab) and strips it from the address bar.
- The browser calls `/api/sessions/<id>/…` (`src/lib/sign-api.ts`, one catch-all route) with
  `Authorization: Bearer <token>`. Every failure (unknown id, wrong token, expired, organization
  being deleted) is the same 404. Rate limits (`sign.session`, `sign.ip`) run before the token
  check. Suspended organizations can be read but not signed (403 `account_suspended`).
- Never add a cookie, a token in a path or query string, or CORS.

## Signing

- The page shows the consent text first (`sign_settings.disclosure` or `DEFAULT_SIGN_DISCLOSURE`,
  with the requester's name); the signer's agreement records its SHA-256. Documents are served
  only after it (`consent_required`).
- Documents are drawn with pdf.js (legacy build, a module worker of this origin; its CMaps, fonts,
  ICC profiles and wasm decoders from `/pdfjs/<folder>/<file>`, traced into the standalone server
  by `outputFileTracingIncludes`) on canvases, with
  the signer's fields on top, placed by the same top-left, as-displayed PDF points as the API.
  Signers adopt a signature (and initials, when they have initials fields) by typing or drawing;
  it is sent as a PNG with the field values, and nothing changes after "Finish".
- The embedding page gets `postMessage`s (`src/lib/embed.ts`: `ready`, `viewed`, `signed`,
  `declined`, `error`, `resize`; ids and statuses only) to any origin: only allowed origins can
  frame the page. Keep them in step with `SigningEvent` in `packages/sdk/src/sign.ts`.

## Headers

`src/proxy.ts` sets every response's headers (`src/lib/security-headers.ts`): a strict CSP with no
third-party origins (plus `'wasm-unsafe-eval'` and `blob:` workers for pdf.js),
`Referrer-Policy: no-referrer`, `no-store`. `frame-ancestors` is `'none'` except on a live
session's page, where it lists the environment's `allowed_origins` (`checkedSignOrigin`).

## Everything else

- The document store is `FakeDocumentStore` outside production and none in production (503)
  until the S3 store lands.
- Tests (`test/`, DB-backed) call `handleSignRequest` directly.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
