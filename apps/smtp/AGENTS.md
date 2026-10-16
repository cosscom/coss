# apps/smtp — the SMTP relay

Read together with the root `AGENTS.md` (conventions, tenancy rule, tests). Paths are from the
repository root.

- **SMTP relay** (`apps/smtp`, mapping in `packages/email/src/smtp-message.ts` = `@coss/email/smtp`): never a raw
  MIME passthrough — every message becomes a `SendEmailRequest` and goes through `EmailService.send` exactly like
  `POST /v1/emails` (sender authorization, suppressions, billing, screening, webhooks). AUTH (`PLAIN`/`LOGIN`) only
  after TLS (`allowInsecureAuth` only for `localhost` in development), username `coss`, the password an API key
  needing `email:send`; `authenticateSmtp` (`src/auth.ts`) repeats `requireApiKey`'s throttling in its order
  (`api.authentication.key`/`.ip` before the lookup, `api.auth_failure` peeked, charged for bad keys and wrong
  usernames). Every message checks the key again first (`recheckSmtpKey` at MAIL FROM: pooled connections stay
  open for hours, and revoking a key or suspending its organization must stop them). Connections are charged per client IP (`smtp.connections.ip`, the socket's address: the NLB preserves
  it, never trust a header), each message `api.send` (per key) and `emailSendQuota` (`@coss/ratelimit`, shared with
  the API's send routes and the dashboard's template test sends; refunded on replays and errors). Mapping: the `From` header (one mailbox) is the sender
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
