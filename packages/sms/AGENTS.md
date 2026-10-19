# packages/sms — the SMS product

Read together with the root `AGENTS.md` (conventions, tenancy rule, tests). Paths are from the
repository root.

Sending, delivery events, suppressions and receiving over Twilio (one subaccount per organization
under coss.com's shared Twilio ISV account), with carrier registration of the organization's
senders (US A2P 10DLC brands and campaigns, toll-free verification) and its phone numbers.

- **Tables** (`packages/db/src/schema/sms.ts`): `sms_account` (one per organization: allowed
  countries, the subaccount and its encrypted auth token), `sms_registration` (`smsreg_`),
  `sms_number` (`num_`, a phone number is one organization's at a time), `sms_message` (`sms_`),
  `sms_event` (`smsevt_`), `sms_suppression` (`smssup_`), `sms_received` (`smsin_`).
- **Sending** (`service.ts`, the shape of `@coss/email`'s): `send` parses `to` (E.164 only;
  `parsePhoneNumber` gives its country; the simulator's `+1500555xxxx` numbers are the US), counts
  segments (`segments.ts`: GSM-7 160/153, UCS-2 70/67, extension characters and surrogate pairs
  never split; at most 10) and, live only, runs `authorizeLiveSmsSender` (suspended → billing hold →
  `from` an `active` number of the organization whose registration is `approved` → destination
  country allowed, toll-free numbers US/CA only). One transaction stores the message, skips a
  suppressed number (`failed`/`suppressed` + `sms.suppressed`, never handed over or billed), records
  `sms.scheduled` or enqueues the `sms-dispatch` job, and reserves `sms.segments` with the country's
  dimension through the injected `UsageGate` as its last statement (refuses unpriced countries and
  plans without SMS). `Idempotency-Key` through `withIdempotencyKey`; sender and parse failures
  still replay a request that already succeeded. Sandbox environments always use the fake provider
  and skip the sender, country and billing checks.
- **Dispatch**: claim = compare-and-set `queued` + `provider IS NULL` → `provider`; live messages
  are screened (`product: "sms"`, a hold re-enqueues after 60 s, the unclaimed sweep fails it after
  an hour); the route (subaccount + messaging service) is read again (`senderRoute`), a released
  number fails it `sender_unavailable`. A provider acceptance makes it `sent` (no event: Twilio's
  own `sent` callback, the carrier hand-off, is `sms.sent`). `UncertainSendError` leaves it claimed
  for the status callback or `sweepStaleSmsClaims` (15 min → `failed`/`dispatch_interrupted`,
  which a late carrier callback repairs). `SmsRejectedError` fails it with a `failures.ts` code
  (never the provider's text) and may suppress the number (`invalid_number`, `opt_out`). Twilio's
  `SmartEncoded` stays off, or its segment count would differ from what coss.com bills.
- **Events** (`recordSmsEvent`, system-level: the message comes from the callback's `sms_id`
  query parameter, and only its claiming provider with a matching message id may report on it):
  deduplicated per provider status, the message only moves forward (`MOVES`), a log line (`source:
  sms`) and an `sms.*` webhook per new row, in one transaction. **Metering**: a live message is
  billed (`sms.segments`, `country=<to>`) once — compare-and-set on `usage_recorded_at` — on the
  first `sms.sent`, `sms.delivered` or `sms.undelivered` (it reached a carrier); `failed` is free.
  Webhook payloads never carry the text.
- **Suppressions** (environment-scoped, one entry per number): STOP-family keywords (`smsKeyword`)
  add `opt_out` entries to **every live environment** of the organization (numbers are shared);
  START removes `opt_out` entries only. The simulator's numbers are never auto-suppressed.
- **Receiving** (`receiveSms`, system-level, from the number's `To`): stored once per provider
  message id in the number's `receiving_environment_id` (a live environment; none → dropped),
  with `sms.received`; billed as `sms.received_segments` by the number's country. Opt-out keywords
  apply whether or not the message is routed. Sandbox sends to `SMS_SIMULATOR.reply` get a
  simulated reply in their own environment.
- **Reputation** (`smsReputationChecks`): `sms_opt_out_rate` (distinct numbers that opted out /
  live messages that reached a carrier) and `sms_filtered_rate` (`carrier_filtered`, Twilio 30007),
  thresholds `ReputationPolicy.smsOptOutRate`/`smsFilteredRate`.
- **Prices** live in `@coss/billing/catalog` (`sms-prices-<date>.generated.ts`, written by
  `bun run sms:update-prices` from Twilio's per-country prices). The negotiated Twilio rates and
  the markup are script inputs: **never commit them** (the repository is public).
