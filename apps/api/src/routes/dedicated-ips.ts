import { dedicatedIpPoolObject } from "@coss/email";
import { DedicatedIpPoolObject } from "@coss/email/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { requireApiKey } from "../middleware/api-key.ts";
import { rateLimit } from "../middleware/rate-limit.ts";
import type { AppEnv } from "../types.ts";
import { commonErrors, jsonDoc } from "./docs.ts";

export const getDedicatedIpPoolRoute = createRoute({
  method: "get",
  path: "/dedicated_ips",
  operationId: "getDedicatedIpPool",
  tags: ["Dedicated IPs"],
  summary: "Retrieve the organization's dedicated IPs",
  description:
    "The organization's dedicated IP pool (the Dedicated IPs add-on, bought on the dashboard's " +
    "billing page): its status, its IPs and how much of the last week's mail they delivered. " +
    "Organization-wide, like domains: every environment's key sees the same pool; only live " +
    "emails go through it. Without the add-on the status is `not_enabled`.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ domain: ["read"] }), rateLimit("api.read")],
  responses: {
    200: jsonDoc("The organization's dedicated IPs.", DedicatedIpPoolObject),
    ...commonErrors,
  },
});

export function createDedicatedIpRoutes(): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(getDedicatedIpPoolRoute, async (c) => {
    return c.json(await dedicatedIpPoolObject(c.var.auth.organizationId), 200);
  });

  return router;
}
