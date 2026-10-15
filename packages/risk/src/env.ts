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

/** Values of `RISK_CLASSIFIER`: `off` classifies nothing, `fake` reads test markers. */
export const RISK_CLASSIFIERS = ["off", "fake", "ai"] as const;
export type RiskClassifierName = (typeof RISK_CLASSIFIERS)[number];

export const riskEnvShape = {
  // Keys every identifier risk remembers (HMAC). Required in production; rotating it resets
  // velocity, duplicate detection and fraud memory.
  RISK_HASH_KEY: HashKey.optional(),
  // Content classification in live environments (`ai`: `SCREENING_MODEL` through the AI Gateway,
  // with `AI_GATEWAY_API_KEY`). Sandbox environments always use the test markers.
  RISK_CLASSIFIER: z.enum(RISK_CLASSIFIERS).default("off"),
};

/** The worker downloads IP datasets; without a token there is no ASN or country data. */
export const riskDatasetEnvShape = {
  IPINFO_TOKEN: z.string().min(1).optional(),
};

export type RiskEnv = {
  RISK_HASH_KEY?: string | undefined;
  RISK_CLASSIFIER?: RiskClassifierName | undefined;
};
export type RiskDatasetEnv = { IPINFO_TOKEN?: string | undefined };
