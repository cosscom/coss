import "server-only";
import type { RiskHasher } from "@coss/risk";
import { riskHasherFromEnv } from "@coss/risk/runtime";
import { env } from "@/env";

let hasher: RiskHasher | undefined;

/** Hashes identifiers like the API does (`RISK_HASH_KEY`), for feedback recorded here. */
export function riskHasher(): RiskHasher {
  hasher ??= riskHasherFromEnv(env);
  return hasher;
}
