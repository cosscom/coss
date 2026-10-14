/**
 * Every rate limit COSS enforces. A bucket holds `burst` tokens and refills `limit` per `periodMs`
 * (GCRA, see `gcra.ts`): `burst` requests can arrive at once, then the long-run rate applies.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** What a bucket counts per: one API key, organization, environment, client IP or email address. */
export type BucketScope = "key" | "org" | "environment" | "ip" | "email";

export type LimitRule = {
  /** Tokens added per `periodMs`. */
  limit: number;
  periodMs: number;
  /** Bucket size: how many can be spent at once. Defaults to `limit`. */
  burst?: number;
};

export type BucketDefinition = LimitRule & {
  scope: BucketScope;
  /** Organizations can get a different rule (`rate_limit_override`). Only org-owned scopes. */
  overridable: boolean;
  /** What to do when the shared store is unavailable. Security and cost controls deny. */
  failureMode: "allow" | "deny";
};

export const BUCKETS = {
  // Public API requests per key, by route class.
  "api.read": {
    scope: "key",
    limit: 50,
    periodMs: SECOND,
    burst: 100,
    overridable: true,
    failureMode: "allow",
  },
  "api.write": {
    scope: "key",
    limit: 10,
    periodMs: SECOND,
    burst: 30,
    overridable: true,
    failureMode: "deny",
  },
  "api.send": {
    scope: "key",
    limit: 20,
    periodMs: SECOND,
    burst: 50,
    overridable: true,
    failureMode: "deny",
  },
  // Risk assessments (`POST /v1/risk/assessments`) sit in customers' sign-up and login paths, so
  // they get far more room than other writes. Denies on a store outage like every write (the
  // authentication buckets before it deny then anyway); integrations are told to fail open.
  "risk.assess": {
    scope: "key",
    limit: 100,
    periodMs: SECOND,
    burst: 200,
    overridable: true,
    failureMode: "deny",
  },
  // Database-backed API key verification. These run before the key lookup, so a valid or
  // attacker-chosen key cannot turn the database pool into the first line of rate limiting.
  "api.authentication.key": {
    scope: "key",
    limit: 50,
    periodMs: SECOND,
    burst: 100,
    overridable: false,
    failureMode: "deny",
  },
  "api.authentication.ip": {
    scope: "ip",
    limit: 100,
    periodMs: SECOND,
    burst: 200,
    overridable: false,
    failureMode: "deny",
  },
  // Recipients sent per organization (live) or environment (sandbox), across all keys. The burst
  // of the per-second bucket must stay at least MAX_RECIPIENTS (50), or a full email never fits.
  "email.recipients.second": {
    scope: "org",
    limit: 14,
    periodMs: SECOND,
    burst: 100,
    overridable: true,
    failureMode: "deny",
  },
  "email.recipients.day": {
    scope: "org",
    limit: 10_000,
    periodMs: DAY,
    overridable: true,
    failureMode: "deny",
  },
  "email.sandbox_recipients.day": {
    scope: "environment",
    limit: 500,
    periodMs: DAY,
    overridable: true,
    failureMode: "deny",
  },
  // Received emails accepted per organization (the worker charges one per environment a message
  // is delivered to). Over the limit, messages are dropped and counted. Fails open: a store outage
  // must never lose a customer's mail.
  "email.inbound.day": {
    scope: "org",
    limit: 10_000,
    periodMs: DAY,
    burst: 10_000,
    overridable: true,
    failureMode: "allow",
  },
  // Invitations sent (and resent) per organization: each one emails an address the org chose.
  "dashboard.invitations": {
    scope: "org",
    limit: 50,
    periodMs: DAY,
    burst: 20,
    overridable: true,
    failureMode: "deny",
  },
  // Failed API key authentications per client IP (bad keys are rejected before the key lookup).
  "api.auth_failure": {
    scope: "ip",
    limit: 30,
    periodMs: MINUTE,
    overridable: false,
    failureMode: "deny",
  },
  // Dashboard authentication (Better Auth endpoints), per client IP and per email address.
  "auth.sign_in.ip": {
    scope: "ip",
    limit: 20,
    periodMs: MINUTE,
    overridable: false,
    failureMode: "deny",
  },
  "auth.sign_in.email": {
    scope: "email",
    limit: 5,
    periodMs: MINUTE,
    overridable: false,
    failureMode: "deny",
  },
  "auth.sign_up.ip": {
    scope: "ip",
    limit: 5,
    periodMs: HOUR,
    overridable: false,
    failureMode: "deny",
  },
  "auth.password_reset.ip": {
    scope: "ip",
    limit: 5,
    periodMs: HOUR,
    overridable: false,
    failureMode: "deny",
  },
  "auth.password_reset.email": {
    scope: "email",
    limit: 3,
    periodMs: HOUR,
    overridable: false,
    failureMode: "deny",
  },
  "auth.verification_email.ip": {
    scope: "ip",
    limit: 5,
    periodMs: HOUR,
    overridable: false,
    failureMode: "deny",
  },
  "auth.verification_email.email": {
    scope: "email",
    limit: 3,
    periodMs: HOUR,
    overridable: false,
    failureMode: "deny",
  },
  "auth.reset_password.ip": {
    scope: "ip",
    limit: 10,
    periodMs: HOUR,
    overridable: false,
    failureMode: "deny",
  },
  // Second factor (TOTP / backup code) and passkey sign-ins. Better Auth also locks an account
  // for 15 minutes after 10 failed codes, and each challenge allows 5 attempts.
  "auth.two_factor.ip": {
    scope: "ip",
    limit: 20,
    periodMs: MINUTE,
    overridable: false,
    failureMode: "deny",
  },
  "auth.passkey.ip": {
    scope: "ip",
    limit: 20,
    periodMs: MINUTE,
    overridable: false,
    failureMode: "deny",
  },
  // SSO: starting a sign-in (each one stores state and redirects to the IdP) and SAML responses
  // posted back by the IdP. OIDC callbacks are GETs, which the dashboard doesn't limit.
  "auth.sso.ip": {
    scope: "ip",
    limit: 20,
    periodMs: MINUTE,
    overridable: false,
    failureMode: "deny",
  },
  // SCIM (directory sync) requests, every method. Identity providers send every customer's
  // traffic from a few shared addresses, so the per-IP bucket is wide; each directory token gets
  // its own (keyed by the token's public credential id).
  "auth.scim.ip": {
    scope: "ip",
    limit: 100,
    periodMs: SECOND,
    burst: 500,
    overridable: false,
    failureMode: "deny",
  },
  "auth.scim.token": {
    scope: "key",
    limit: 25,
    periodMs: SECOND,
    burst: 200,
    overridable: false,
    failureMode: "deny",
  },
  // Organizations created per client IP (each user may also own at most 5, see @coss/auth).
  "auth.org_create.ip": {
    scope: "ip",
    limit: 10,
    periodMs: DAY,
    overridable: false,
    failureMode: "deny",
  },
  // Public telemetry ingress. This is intentionally per process/IP as well as bounded by its body
  // limit; a monitoring outage must not become an unlimited relay or connection sink.
  "monitoring.envelopes": {
    scope: "ip",
    limit: 30,
    periodMs: MINUTE,
    burst: 60,
    overridable: false,
    failureMode: "deny",
  },
  // The payment provider's webhooks (the dashboard's `/api/billing/webhook`): signatures are
  // checked before anything is stored, so this only bounds the work forged requests cause. Stripe
  // retries what is refused, so a store outage allows rather than drops events.
  "billing.webhooks": {
    scope: "ip",
    limit: 50,
    periodMs: SECOND,
    burst: 200,
    overridable: false,
    failureMode: "allow",
  },
  // Public recipient-facing tracking endpoints. The token bucket always bounds database work for
  // one message; the IP bucket also limits callers when the deployment has a trusted client IP.
  "tracking.token": {
    scope: "key",
    limit: 10,
    periodMs: SECOND,
    burst: 30,
    overridable: false,
    failureMode: "deny",
  },
  "tracking.ip": {
    scope: "ip",
    limit: 30,
    periodMs: SECOND,
    burst: 100,
    overridable: false,
    failureMode: "deny",
  },
} as const satisfies Record<string, BucketDefinition>;

export type BucketName = keyof typeof BUCKETS;

export const BUCKET_NAMES = Object.keys(BUCKETS) as BucketName[];

export function isBucketName(value: string): value is BucketName {
  return Object.hasOwn(BUCKETS, value);
}

export function isOverridableBucket(value: string): value is BucketName {
  return isBucketName(value) && BUCKETS[value].overridable;
}

export function bucketDefinition(name: BucketName): BucketDefinition {
  return BUCKETS[name];
}

/** Largest value a rule field can hold (`rate_limit_override` stores them as `integer`). */
export const MAX_RULE_VALUE = 2_147_483_647;

/** Validates a rule (from code or an override row): positive integers up to `MAX_RULE_VALUE`. */
export function assertValidRule(rule: LimitRule): void {
  const { limit, periodMs, burst = limit } = rule;
  for (const [name, value] of [
    ["limit", limit],
    ["periodMs", periodMs],
    ["burst", burst],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new RangeError(`Rate limit ${name} must be a positive integer (got ${value}).`);
    }
    if (value > MAX_RULE_VALUE) {
      throw new RangeError(`Rate limit ${name} must be at most ${MAX_RULE_VALUE} (got ${value}).`);
    }
  }
}
