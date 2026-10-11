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
};

export const BUCKETS = {
  // Public API requests per key, by route class.
  "api.read": { scope: "key", limit: 50, periodMs: SECOND, burst: 100, overridable: true },
  "api.write": { scope: "key", limit: 10, periodMs: SECOND, burst: 30, overridable: true },
  "api.send": { scope: "key", limit: 20, periodMs: SECOND, burst: 50, overridable: true },
  // Recipients sent per organization (live) or environment (sandbox), across all keys. The burst
  // of the per-second bucket must stay at least MAX_RECIPIENTS (50), or a full email never fits.
  "email.recipients.second": {
    scope: "org",
    limit: 14,
    periodMs: SECOND,
    burst: 100,
    overridable: true,
  },
  "email.recipients.day": { scope: "org", limit: 10_000, periodMs: DAY, overridable: true },
  "email.sandbox_recipients.day": {
    scope: "environment",
    limit: 500,
    periodMs: DAY,
    overridable: true,
  },
  // Failed API key authentications per client IP (bad keys are rejected before the key lookup).
  "api.auth_failure": { scope: "ip", limit: 30, periodMs: MINUTE, overridable: false },
  // Dashboard authentication (Better Auth endpoints), per client IP and per email address.
  "auth.sign_in.ip": { scope: "ip", limit: 20, periodMs: MINUTE, overridable: false },
  "auth.sign_in.email": { scope: "email", limit: 5, periodMs: MINUTE, overridable: false },
  "auth.sign_up.ip": { scope: "ip", limit: 5, periodMs: HOUR, overridable: false },
  "auth.password_reset.ip": { scope: "ip", limit: 5, periodMs: HOUR, overridable: false },
  "auth.password_reset.email": { scope: "email", limit: 3, periodMs: HOUR, overridable: false },
  "auth.verification_email.ip": { scope: "ip", limit: 5, periodMs: HOUR, overridable: false },
  "auth.verification_email.email": {
    scope: "email",
    limit: 3,
    periodMs: HOUR,
    overridable: false,
  },
  "auth.reset_password.ip": { scope: "ip", limit: 10, periodMs: HOUR, overridable: false },
  // Second factor (TOTP / backup code) and passkey sign-ins. Better Auth also locks an account
  // for 15 minutes after 10 failed codes, and each challenge allows 5 attempts.
  "auth.two_factor.ip": { scope: "ip", limit: 20, periodMs: MINUTE, overridable: false },
  "auth.passkey.ip": { scope: "ip", limit: 20, periodMs: MINUTE, overridable: false },
  // SSO: starting a sign-in (each one stores state and redirects to the IdP) and SAML responses
  // posted back by the IdP. OIDC callbacks are GETs, which the dashboard doesn't limit.
  "auth.sso.ip": { scope: "ip", limit: 20, periodMs: MINUTE, overridable: false },
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

/** Validates a rule (from code or an override row): positive integers, burst ≥ 1. */
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
  }
}
