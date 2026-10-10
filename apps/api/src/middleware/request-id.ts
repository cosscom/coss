import { ID_PREFIXES, newId } from "@coss/db/id";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.ts";

/**
 * Generates a `req_…` id for every request. Unlike `hono/request-id`, it never trusts a
 * client-supplied value, so ids in logs and error envelopes are always ours.
 */
export const requestId = createMiddleware<AppEnv>(async (c, next) => {
  const id = newId(ID_PREFIXES.request);
  c.set("requestId", id);
  await next();
  // Set after `next()` so it lands on whatever response won: handlers, onError and notFound.
  c.header("X-Request-Id", id);
});
