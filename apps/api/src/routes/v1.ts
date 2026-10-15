import type { DomainDeps, EmailService } from "@coss/email";
import type { InboundRuntime } from "@coss/email/runtime";
import type { RiskDeps } from "@coss/risk";
import type { WebhookManagementDeps } from "@coss/webhooks";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../types.ts";
import { createAuditEventRoutes } from "./audit-events.ts";
import { createBillingRoutes } from "./billing.ts";
import { createDomainRoutes } from "./domains.ts";
import { createEmailRoutes } from "./emails.ts";
import { createHookRoutes } from "./hooks/index.ts";
import { createLogDrainRoutes } from "./log-drains.ts";
import { createLogRoutes } from "./logs.ts";
import { createReceivedEmailRoutes } from "./received-emails.ts";
import { createReputationRoutes } from "./reputation.ts";
import { createRiskRoutes } from "./risk.ts";
import { createRiskConfigRoutes } from "./risk-config.ts";
import { createRiskLimitRoutes } from "./risk-limits.ts";
import { createRiskLookupRoutes } from "./risk-lookups.ts";
import { createSuppressionRoutes } from "./suppressions.ts";
import { createTrackingSettingsRoutes } from "./tracking-settings.ts";
import { createWebhookEndpointRoutes } from "./webhook-endpoints.ts";

export type V1Dependencies = {
  emailService: EmailService;
  domainDeps: DomainDeps;
  webhookDeps: WebhookManagementDeps;
  /** Where portal session links point (`PORTAL_PUBLIC_URL`); `null`: the portal isn't deployed. */
  portalUrl: string | null;
  /** Receiving (`EmailRuntime.inbound`); `null` when the deployment doesn't receive email. */
  inbound: InboundRuntime | null;
  riskDeps: RiskDeps;
};

/** Everything under `/v1`. Each product mounts its routes here. */
export function createV1Router(deps: V1Dependencies): OpenAPIHono<AppEnv> {
  const v1 = new OpenAPIHono<AppEnv>();
  v1.route("/", createEmailRoutes(deps.emailService));
  v1.route("/", createDomainRoutes(deps.domainDeps, deps.inbound));
  v1.route("/", createWebhookEndpointRoutes(deps.webhookDeps));
  v1.route("/", createSuppressionRoutes());
  v1.route("/", createTrackingSettingsRoutes());
  v1.route("/", createReputationRoutes());
  v1.route("/", createLogRoutes());
  v1.route("/", createAuditEventRoutes());
  v1.route("/", createBillingRoutes());
  // Drain secrets use the same key ring as webhook endpoints.
  v1.route("/", createLogDrainRoutes(deps.webhookDeps));
  // Hooks endpoint secrets use the same key ring too.
  v1.route("/", createHookRoutes({ ...deps.webhookDeps, portalUrl: deps.portalUrl }));
  v1.route("/", createReceivedEmailRoutes(deps.inbound));
  v1.route("/", createRiskRoutes(deps.riskDeps));
  v1.route("/", createRiskConfigRoutes(deps.riskDeps));
  v1.route("/", createRiskLookupRoutes(deps.riskDeps));
  v1.route("/", createRiskLimitRoutes(deps.riskDeps));
  return v1;
}
