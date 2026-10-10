import type { EmailService } from "@coss/email";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../types.ts";
import { createEmailRoutes } from "./emails.ts";
import { createSuppressionRoutes } from "./suppressions.ts";

export type V1Dependencies = { emailService: EmailService };

/** Everything under `/v1`. Each product mounts its routes here. */
export function createV1Router(deps: V1Dependencies): OpenAPIHono<AppEnv> {
  const v1 = new OpenAPIHono<AppEnv>();
  v1.route("/", createEmailRoutes(deps.emailService));
  v1.route("/", createSuppressionRoutes());
  return v1;
}
