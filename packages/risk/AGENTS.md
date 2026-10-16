# packages/risk — COSS Risk

Read together with the root `AGENTS.md` (conventions, tenancy rule, tests). Paths are from the
repository root.

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
