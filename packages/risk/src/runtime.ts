/**
 * Builds risk's dependencies from validated env, once per process. The API passes the rate
 * limiter's Valkey connection (velocity, customers' buckets) and the limiter itself (the
 * classification budget); the dashboard only needs the hasher.
 */
import { MemoryStore, type RateLimiter, ValkeyStore } from "@coss/ratelimit";
import {
  createClassifier,
  DEFAULT_SCREENING_MODEL,
  type ScreeningEnv,
} from "@coss/screening/runtime";
import { cachedMailDomainCheck } from "@coss/signals/email";
import { rdapClient } from "@coss/signals/rdap";
import type { SecretsKeyRing } from "@coss/webhooks";
import type { Cluster, Redis } from "iovalkey";
import type { RiskDeps } from "./assess.ts";
import { createIpIntelligenceSource } from "./datasets.ts";
import type { RiskEnv } from "./env.ts";
import { DEVELOPMENT_HASH_KEY, type RiskHasher, riskHasher } from "./hash.ts";
import { MemoryVelocityStore, ValkeyVelocityStore } from "./velocity.ts";

export { type RiskEnv, riskEnvShape } from "./env.ts";

/** The identifier hasher; production refuses to run without `RISK_HASH_KEY`. */
export function riskHasherFromEnv(env: RiskEnv, opts: { production?: boolean } = {}): RiskHasher {
  const production = opts.production ?? process.env.NODE_ENV === "production";
  if (env.RISK_HASH_KEY) return riskHasher(Buffer.from(env.RISK_HASH_KEY, "base64"));
  if (production) {
    throw new Error("RISK_HASH_KEY is required in production (openssl rand -base64 32).");
  }
  return riskHasher(DEVELOPMENT_HASH_KEY);
}

export function createRiskDeps(
  env: RiskEnv &
    Partial<Pick<ScreeningEnv, "SCREENING_MODEL" | "AI_GATEWAY_API_KEY">> & {
      RATE_LIMIT_KEY_PREFIX?: string | undefined;
    },
  opts: {
    valkey: Redis | Cluster | null;
    secretsKeys: SecretsKeyRing;
    /** Charges the `risk.classify*` buckets before live classifications. */
    limiter?: RateLimiter;
    production?: boolean;
  },
): RiskDeps {
  const rdap = rdapClient();
  const { limiter } = opts;
  return {
    hash: riskHasherFromEnv(env, opts),
    ipIntelligence: createIpIntelligenceSource(),
    // Without Valkey (development only: the rate limiter requires it in production), counters
    // live in this process.
    velocity: opts.valkey ? new ValkeyVelocityStore(opts.valkey) : new MemoryVelocityStore(),
    keyPrefix: env.RATE_LIMIT_KEY_PREFIX ?? "coss",
    checkMailDomain: cachedMailDomainCheck(),
    domainAge: (domain) => rdap.registration(domain),
    secretsKeys: opts.secretsKeys,
    classifier: createClassifier({
      SCREENING_CLASSIFIER: env.RISK_CLASSIFIER ?? "off",
      SCREENING_MODEL: env.SCREENING_MODEL ?? DEFAULT_SCREENING_MODEL,
      AI_GATEWAY_API_KEY: env.AI_GATEWAY_API_KEY,
    }),
    chargeClassification: limiter
      ? async (organizationId) =>
          (
            await limiter.consume({
              buckets: ["risk.classify", "risk.classify.day"],
              subject: organizationId,
              organizationId,
            })
          ).allowed
      : undefined,
    // Customers' buckets share the velocity connection; in memory without Valkey (development).
    limits: opts.valkey ? new ValkeyStore(opts.valkey) : new MemoryStore(),
  };
}
