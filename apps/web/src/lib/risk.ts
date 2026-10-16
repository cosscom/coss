import "server-only";
import type { SignUpRiskAssessor } from "@coss/auth/risk";
import { db } from "@coss/db";
import { assessRisk, type RiskAssessEnvironment, type RiskDeps, type RiskHasher } from "@coss/risk";
import { createRiskDeps, riskHasherFromEnv } from "@coss/risk/runtime";
import { parseSecretsKeys } from "@coss/webhooks";
import { env } from "@/env";
import { rateLimitRuntime } from "./rate-limit";
import { signUpRiskParams } from "./signup-risk-params";

let hasher: RiskHasher | undefined;

/** Hashes identifiers like the API does (`RISK_HASH_KEY`), for feedback recorded here. */
export function riskHasher(): RiskHasher {
  hasher ??= riskHasherFromEnv(env);
  return hasher;
}

let deps: RiskDeps | undefined;
let signUpEnvironment: Promise<RiskAssessEnvironment | null> | undefined;

/** coss.com's own environment sign-ups are assessed in (`RISK_SIGNUP_ENVIRONMENT_ID`), looked up once. */
function signUpRiskEnvironment(environmentId: string): Promise<RiskAssessEnvironment | null> {
  signUpEnvironment ??= db.query.environment
    .findFirst({
      columns: { id: true, organizationId: true, projectId: true, mode: true },
      where: (environment, { eq }) => eq(environment.id, environmentId),
    })
    .then((row) => {
      if (!row) {
        console.error(`[risk] RISK_SIGNUP_ENVIRONMENT_ID ${environmentId} doesn't exist.`);
        return null;
      }
      const { id, ...rest } = row;
      return { environmentId: id, ...rest };
    })
    .catch((error: unknown) => {
      // Looked up again by the next sign-up.
      signUpEnvironment = undefined;
      throw error;
    });
  return signUpEnvironment;
}

/** The environment coss.com's own sign-ups are assessed in, for the admin console; `null` without one. */
export async function signUpRiskScope(): Promise<{
  organizationId: string;
  environmentId: string;
} | null> {
  const environmentId = env.RISK_SIGNUP_ENVIRONMENT_ID;
  if (!environmentId) return null;
  const environment = await signUpRiskEnvironment(environmentId);
  return environment
    ? { organizationId: environment.organizationId, environmentId: environment.environmentId }
    : null;
}

/**
 * coss.com Risk on coss.com's own sign-ups (dogfooding): each `/sign-up/email` (and new Google or GitHub
 * account) is assessed in `RISK_SIGNUP_ENVIRONMENT_ID`, with the client's address, user agent and
 * `coss/device` token, exactly as a customer would. `null` (nothing assessed) without it.
 */
export const assessSignUp: SignUpRiskAssessor = async ({ email, headers }) => {
  const environmentId = env.RISK_SIGNUP_ENVIRONMENT_ID;
  if (!environmentId) return null;
  const environment = await signUpRiskEnvironment(environmentId);
  if (!environment) return null;
  const runtime = rateLimitRuntime();
  deps ??= createRiskDeps(env, {
    valkey: runtime.valkey,
    limiter: runtime.limiter,
    secretsKeys: parseSecretsKeys(env.WEBHOOK_SECRETS_KEY),
  });
  const ip = headers ? runtime.clientIp(headers) : null;
  const params = signUpRiskParams(email, ip, headers);
  const { assessment } = await assessRisk(deps, { environment, params });
  return { decision: assessment.decision, assessmentId: assessment.id };
};
