import { createTestTenant } from "@coss/tenancy/testing";
import { assessRisk, type RiskAssessEnvironment, type RiskDeps } from "../src/assess.ts";
import type { CreateRiskAssessmentRequestInput } from "../src/schemas.ts";
import { CreateRiskAssessmentRequest } from "../src/schemas.ts";
import { testRiskDeps } from "../src/testing.ts";

export type Setup = {
  deps: RiskDeps;
  live: RiskAssessEnvironment;
  sandbox: RiskAssessEnvironment;
  organizationId: string;
  assess: (
    params: CreateRiskAssessmentRequestInput,
    opts?: { env?: RiskAssessEnvironment; idempotencyKey?: string },
  ) => ReturnType<typeof assessRisk>;
};

/** A fresh tenant and test dependencies; `assess` defaults to the live environment. */
export async function setup(overrides: Partial<RiskDeps> = {}): Promise<Setup> {
  const tenant = await createTestTenant();
  const deps = testRiskDeps(overrides);
  const live: RiskAssessEnvironment = {
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    environmentId: tenant.production.id,
    mode: "live",
  };
  const sandbox: RiskAssessEnvironment = {
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    environmentId: tenant.development.id,
    mode: "sandbox",
  };
  return {
    deps,
    live,
    sandbox,
    organizationId: tenant.organization.id,
    assess: (params, opts = {}) =>
      assessRisk(deps, {
        environment: opts.env ?? live,
        params: CreateRiskAssessmentRequest.parse(params),
        idempotencyKey: opts.idempotencyKey,
      }),
  };
}
