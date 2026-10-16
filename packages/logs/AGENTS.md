# packages/logs — environment logs and the org audit log

Read together with the root `AGENTS.md` (conventions, tenancy rule, tests). Paths are from the
repository root.

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
  (`supportAudit`: actor "coss.com support", never the admin or their reason); new mutations should record one.
