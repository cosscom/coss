import type { DomainDeps, EmailService } from "@coss/email";
import type { RiskDeps } from "@coss/risk";
import type { WebhookManagementDeps } from "@coss/webhooks";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../types.ts";
import { createAuditEventRoutes } from "./audit-events.ts";
import { createDomainRoutes } from "./domains.ts";
import { createEmailRoutes } from "./emails.ts";
import { createLogDrainRoutes } from "./log-drains.ts";
import { createLogRoutes } from "./logs.ts";
import { createReputationRoutes } from "./reputation.ts";
import { createRiskRoutes } from "./risk.ts";
import { createSuppressionRoutes } from "./suppressions.ts";
import { createWebhookEndpointRoutes } from "./webhook-endpoints.ts";

export type V1Dependencies = {
  emailService: EmailService;
  domainDeps: DomainDeps;
  webhookDeps: WebhookManagementDeps;
  riskDeps: RiskDeps;
};

/** Everything under `/v1`. Each product mounts its routes here. */
export function createV1Router(deps: V1Dependencies): OpenAPIHono<AppEnv> {
  const v1 = new OpenAPIHono<AppEnv>();
  v1.route("/", createEmailRoutes(deps.emailService));
  v1.route("/", createDomainRoutes(deps.domainDeps));
  v1.route("/", createWebhookEndpointRoutes(deps.webhookDeps));
  v1.route("/", createSuppressionRoutes());
  v1.route("/", createReputationRoutes());
  v1.route("/", createLogRoutes());
  v1.route("/", createAuditEventRoutes());
  // Drain secrets use the same key ring as webhook endpoints.
  v1.route("/", createLogDrainRoutes(deps.webhookDeps));
  v1.route("/", createRiskRoutes(deps.riskDeps));
  return v1;
}
