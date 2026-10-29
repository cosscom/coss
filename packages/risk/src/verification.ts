/**
 * Verify's fraud guard: decides, before a one-time code is sent (and paid for), whether the
 * request looks like abuse — SMS pumping (codes requested for premium-rate numbers or whole
 * ranges of numbers, never entered), or one client requesting codes for many destinations. Built
 * from Risk's parts: the environment's lists, IP data and velocity counters (HMAC-keyed, as
 * everything Risk remembers). It stores no assessment and fails open: a missing signal is
 * `degraded`, never a block.
 */
import { db } from "@coss/db";
import { canonicalEmail } from "@coss/signals/email";
import { isBlockedAddress, normalizeIp } from "@coss/signals/ip";
import type { RiskDeps } from "./assess.ts";
import { matchListEntries } from "./lists.ts";
import { ipSignalsFor } from "./lookups.ts";
import { sandboxIpSignals } from "./sandbox.ts";
import { VERIFICATION_THRESHOLDS, type VerificationReasonCode } from "./schemas.ts";
import { velocityKey } from "./velocity.ts";

export type VerificationEnvironment = {
  organizationId: string;
  environmentId: string;
  mode: "live" | "sandbox";
};

export type VerificationDestination =
  | {
      channel: "sms";
      /** E.164. */
      phoneNumber: string;
      /** ISO 3166. */
      country: string;
      /** The number's line type (`@coss/sms`'s `phoneNumberType`). */
      lineType: string;
    }
  | { channel: "email"; address: string };

export type VerificationRiskInput = {
  destination: VerificationDestination;
  /** The end user's IP address, if the customer passed it. */
  ip?: string | null;
  /** The customer's id for the end user, if passed. */
  userId?: string | null;
  /** Sent from coss.com's shared numbers: also counted across every environment using them. */
  shared?: boolean;
};

export type VerificationReason = { code: VerificationReasonCode; value?: number };

export type VerificationRisk = {
  decision: "allow" | "block";
  reasons: VerificationReason[];
  /** A signal was unavailable (velocity or IP data), so the decision went without it. */
  degraded: boolean;
  /**
   * The velocity counters this check moved, each with the bucket it counted in: what
   * `uncountVerificationStart` takes back.
   */
  counted: readonly { key: string; bucket: number }[];
};

/** The counters shared numbers keep across environments are keyed as this environment. */
const SHARED_SCOPE = "verify:shared";
const EVENT = "verify";

const PREMIUM_RATE = new Set(["premium_rate", "shared_cost"]);
const NOT_MOBILE = new Set(["toll_free", "pager", "uan", "voicemail"]);

/**
 * A number's prefix: everything but its last four digits (a US number's area code and exchange).
 * Pumping requests codes for many numbers of one range.
 */
export function phonePrefix(phoneNumber: string): string {
  return phoneNumber.slice(0, Math.max(phoneNumber.length - 4, 4));
}

function emailDomain(address: string): string {
  return address.slice(address.lastIndexOf("@") + 1).toLowerCase();
}

/** The velocity keys of a destination's prefix and country, started and approved. */
function destinationKeys(
  deps: RiskDeps,
  scope: string,
  destination: Extract<VerificationDestination, { channel: "sms" }>,
) {
  const prefix = deps.hash(scope, "phone_prefix", phonePrefix(destination.phoneNumber));
  const country = deps.hash(scope, "phone_prefix", `country:${destination.country}`);
  return {
    prefix: velocityKey(deps.keyPrefix, EVENT, "prefix", prefix),
    country: velocityKey(deps.keyPrefix, EVENT, "country", country),
    approvedPrefix: velocityKey(deps.keyPrefix, `${EVENT}.approved`, "prefix", prefix),
    approvedCountry: velocityKey(deps.keyPrefix, `${EVENT}.approved`, "country", country),
  };
}

function percent(approved: number, started: number): number {
  return started === 0 ? 100 : Math.round((approved / started) * 100);
}

/** The velocity counters a new verification moves (`null`: not counted). */
function startCounters(
  deps: RiskDeps,
  environment: VerificationEnvironment,
  input: VerificationRiskInput,
): {
  ip: string | null;
  user: string | null;
  prefix: string | null;
  country: string | null;
  sharedPrefix: string | null;
} {
  const sandbox = environment.mode === "sandbox";
  const ip = input.ip ? (normalizeIp(input.ip) ?? null) : null;
  // Private addresses are the integration's proxy, shared by every request: never counted.
  const publicIp =
    ip !== null && ((sandbox && sandboxIpSignals(ip) !== null) || !isBlockedAddress(ip));
  const env = environment.environmentId;
  const { destination } = input;
  const keys = destination.channel === "sms" ? destinationKeys(deps, env, destination) : null;
  return {
    ip: publicIp && ip ? velocityKey(deps.keyPrefix, EVENT, "ip", deps.hash(env, "ip", ip)) : null,
    user: input.userId
      ? velocityKey(deps.keyPrefix, EVENT, "user", deps.hash(env, "user", input.userId))
      : null,
    prefix: keys?.prefix ?? null,
    country: keys?.country ?? null,
    sharedPrefix:
      destination.channel === "sms" && input.shared
        ? destinationKeys(deps, SHARED_SCOPE, destination).prefix
        : null,
  };
}

/**
 * Decides on one verification and counts it in the same step (concurrent starts can't all slip
 * under a threshold), allowed or blocked: an attack keeps counting. A caller whose start turned
 * out not to make a verification (a resend, a replay) takes it back with
 * `uncountVerificationStart`.
 */
export async function checkVerificationRisk(
  deps: RiskDeps,
  environment: VerificationEnvironment,
  input: VerificationRiskInput,
): Promise<VerificationRisk> {
  const { destination } = input;
  const sandbox = environment.mode === "sandbox";
  const ip = input.ip ? (normalizeIp(input.ip) ?? null) : null;
  const userId = input.userId || null;
  const reasons: VerificationReason[] = [];
  let degraded = false;
  let moved: { key: string; bucket: number }[] = [];

  const { signals: ipSignals, degraded: ipDegraded } = await ipSignalsFor(deps, ip, sandbox);
  degraded ||= ipDegraded;

  const matches = await matchListEntries(
    db,
    { organizationId: environment.organizationId, environmentId: environment.environmentId },
    {
      ip,
      asn: ipSignals?.asn ?? null,
      userId,
      ...(destination.channel === "sms"
        ? { country: destination.country }
        : {
            mailbox: canonicalEmail(destination.address),
            domain: emailDomain(destination.address),
          }),
    },
  );
  if (matches.some((match) => match.list === "allow")) {
    return { decision: "allow", reasons: [], degraded, counted: [] };
  }
  if (matches.some((match) => match.list === "block")) reasons.push({ code: "list.blocked" });

  if (destination.channel === "sms") {
    if (PREMIUM_RATE.has(destination.lineType)) reasons.push({ code: "phone.premium_rate" });
    else if (NOT_MOBILE.has(destination.lineType)) reasons.push({ code: "phone.not_mobile" });
  }
  if (ipSignals?.tor) reasons.push({ code: "ip.tor" });

  if (!deps.velocity) {
    degraded = true;
  } else {
    const counters = startCounters(deps, environment, input);
    const env = environment.environmentId;
    const counted: { key: string; check: (count: number) => void }[] = [];
    const T = VERIFICATION_THRESHOLDS;
    if (counters.ip) {
      counted.push({
        key: counters.ip,
        check: (count) => {
          if (count > T.ipPerHour) {
            reasons.push({ code: "velocity.verifications_per_ip_1h", value: count });
          }
        },
      });
    }
    if (counters.user) {
      counted.push({
        key: counters.user,
        check: (count) => {
          if (count > T.userPerHour) {
            reasons.push({ code: "velocity.verifications_per_user_1h", value: count });
          }
        },
      });
    }
    try {
      if (destination.channel === "sms") {
        const keys = destinationKeys(deps, env, destination);
        const [approvedPrefix, approvedCountry] = await deps.velocity.increment(
          [keys.approvedPrefix, keys.approvedCountry],
          { by: 0 },
        );
        counted.push({
          key: keys.prefix,
          check: (count) => {
            if (count > T.prefixPerHour) {
              reasons.push({ code: "verify.prefix_velocity", value: count });
              return;
            }
            const approved = approvedPrefix?.["1h"] ?? 0;
            if (count >= T.prefixMinimum && approved / count < T.prefixMinApprovalRate) {
              reasons.push({
                code: "verify.prefix_low_conversion",
                value: percent(approved, count),
              });
            }
          },
        });
        counted.push({
          key: keys.country,
          check: (count) => {
            const approved = approvedCountry?.["1h"] ?? 0;
            if (count >= T.countryMinimum && approved / count < T.countryMinApprovalRate) {
              reasons.push({
                code: "verify.country_low_conversion",
                value: percent(approved, count),
              });
            }
          },
        });
        if (counters.sharedPrefix) {
          counted.push({
            key: counters.sharedPrefix,
            check: (count) => {
              if (
                count > T.sharedPrefixPerHour &&
                !reasons.some((r) => r.code === "verify.prefix_velocity")
              ) {
                reasons.push({ code: "verify.prefix_velocity", value: count });
              }
            },
          });
        }
      }
      const counts = await deps.velocity.increment(counted.map((entry) => entry.key));
      moved = counted.map((entry, index) => ({
        key: entry.key,
        bucket: counts[index]?.bucket ?? 0,
      }));
      for (const [index, entry] of counted.entries()) entry.check(counts[index]?.["1h"] ?? 0);
    } catch (error) {
      console.warn(
        "[risk] Velocity is unavailable for a verification:",
        error instanceof Error ? error.message : error,
      );
      degraded = true;
    }
  }

  return { decision: reasons.length > 0 ? "block" : "allow", reasons, degraded, counted: moved };
}

/**
 * Takes back what `checkVerificationRisk` counted for a start that didn't make a verification
 * after all (it became a resend or a replay). Fails silently.
 */
export async function uncountVerificationStart(
  deps: RiskDeps,
  risk: Pick<VerificationRisk, "counted">,
): Promise<void> {
  if (!deps.velocity || risk.counted.length === 0) return;
  try {
    // In the buckets they were counted in: a 5-minute boundary may have passed since.
    await deps.velocity.increment(
      risk.counted.map((counter) => counter.key),
      { by: -1, buckets: risk.counted.map((counter) => counter.bucket) },
    );
  } catch (error) {
    console.warn(
      "[risk] Velocity is unavailable for a verification:",
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Counts an approved verification for its destination's prefix and country (what tells real
 * users from pumping: their codes get entered). Fails silently.
 */
export async function recordVerificationApproval(
  deps: RiskDeps,
  environment: VerificationEnvironment,
  destination: VerificationDestination,
): Promise<void> {
  if (destination.channel !== "sms" || !deps.velocity) return;
  const keys = destinationKeys(deps, environment.environmentId, destination);
  try {
    await deps.velocity.increment([keys.approvedPrefix, keys.approvedCountry]);
  } catch (error) {
    console.warn(
      "[risk] Velocity is unavailable for an approval:",
      error instanceof Error ? error.message : error,
    );
  }
}
