import { getReputation } from "@coss/reputation";
import { ReputationObject } from "@coss/reputation/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { requireApiKey } from "../middleware/api-key.ts";
import { rateLimit } from "../middleware/rate-limit.ts";
import type { AppEnv } from "../types.ts";
import { commonErrors, jsonDoc } from "./docs.ts";

export const getReputationRoute = createRoute({
  method: "get",
  path: "/reputation",
  operationId: "getReputation",
  tags: ["Reputation"],
  summary: "Retrieve the organization's sending reputation",
  description:
    "The organization's standing with the coss.com reputation guard and the latest rates it " +
    "measured over live environments. When a rate reaches its suspension threshold, live sending " +
    "is suspended automatically (`account_suspended`) until coss.com support reinstates the " +
    "organization; sandbox keys keep working. Subscribe to the `account.*` webhook events to be " +
    "notified of changes.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ reputation: ["read"] }), rateLimit("api.read")],
  responses: {
    200: jsonDoc("The organization's reputation.", ReputationObject),
    ...commonErrors,
  },
});

export function createReputationRoutes(): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(getReputationRoute, async (c) => {
    // Organization-wide: every environment's key sees the same standing.
    return c.json(await getReputation(c.var.auth.organizationId), 200);
  });

  return router;
}
