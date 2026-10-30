import { parseTraceparent } from "@coss/webhooks/schemas";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.ts";

/**
 * Reads the caller's W3C `traceparent` (`/v1/*`): sends store it on the emails and text messages
 * they create, whose log lines and webhooks echo it. An invalid one is ignored, never refused (the
 * spec's rule: a broken tracer must not break the request).
 */
export const traceContext = createMiddleware<AppEnv>(async (c, next) => {
  c.set("traceparent", parseTraceparent(c.req.header("traceparent")));
  await next();
});
