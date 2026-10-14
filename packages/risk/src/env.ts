/**
 * Environment variables of risk, for the apps' t3-env schemas. Imports only zod.
 */
import { z } from "zod";

/** 32+ random bytes, base64. */
const HashKey = z.string().refine(
  (value) => {
    try {
      return atob(value).length >= 32;
    } catch {
      return false;
    }
  },
  { message: "RISK_HASH_KEY must be at least 32 bytes, base64-encoded (openssl rand -base64 32)." },
);

export const riskEnvShape = {
  // Keys every identifier risk remembers (HMAC). Required in production; rotating it resets
  // velocity, duplicate detection and fraud memory.
  RISK_HASH_KEY: HashKey.optional(),
};

/** The worker downloads IP datasets; without a token there is no ASN or country data. */
export const riskDatasetEnvShape = {
  IPINFO_TOKEN: z.string().min(1).optional(),
};

export type RiskEnv = { RISK_HASH_KEY?: string | undefined };
export type RiskDatasetEnv = { IPINFO_TOKEN?: string | undefined };
