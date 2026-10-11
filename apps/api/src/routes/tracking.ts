/**
 * Public open/click tracking endpoints (no API key: they are fetched by mail clients). Mounted
 * outside `/v1` and the OpenAPI document. They never answer with the JSON error envelope: a pixel
 * is always a GIF, and a click either redirects to the link stored at send or is a plain 404.
 */

import { createHash } from "node:crypto";
import { recordClick, recordOpen } from "@coss/email";
import { type Context, Hono } from "hono";
import type { AppEnv } from "../types.ts";

export const TRACKING_PATH_PREFIX = "/t/";

// A 1×1 transparent GIF.
export const PIXEL_GIF = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  (char) => char.charCodeAt(0),
);

const NO_STORE = "no-store, no-cache, must-revalidate, private";

function userAgent(header: string | undefined): string | null {
  return header?.trim() || null;
}

async function trackingAllowed(c: Context<AppEnv>, token: string): Promise<boolean> {
  // Hash the bearer-like tracking token before using it as a store key.
  const tokenDecision = await c.var.rateLimiter.consume({
    buckets: ["tracking.token"],
    subject: createHash("sha256").update(token).digest("hex").slice(0, 32),
  });
  if (!tokenDecision.allowed) return false;
  const ipDecision = await c.var.rateLimiter.consume({
    buckets: ["tracking.ip"],
    // A process-wide fallback also bounds attackers rotating arbitrary invalid tokens.
    subject: c.var.clientIp ?? "unattributed",
  });
  return ipDecision.allowed;
}

export function createTrackingRoutes(): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/o/:token", async (c) => {
    // Mail clients prefetch with HEAD: answer it (Hono routes HEAD to GET) without recording.
    if (c.req.method === "GET" && (await trackingAllowed(c, c.req.param("token")))) {
      try {
        await recordOpen({
          token: c.req.param("token"),
          userAgent: userAgent(c.req.header("user-agent")),
        });
      } catch (error) {
        console.error(
          `[api:tracking] failed to record an open (request_id=${c.var.requestId}):`,
          error,
        );
      }
    }
    return c.body(PIXEL_GIF, 200, { "Content-Type": "image/gif", "Cache-Control": NO_STORE });
  });

  router.get("/c/:token/:position", async (c) => {
    if (c.req.method === "GET" && !(await trackingAllowed(c, c.req.param("token")))) {
      return c.text("Too many tracking requests.", 429, {
        "Cache-Control": NO_STORE,
        "Retry-After": "1",
      });
    }
    const position = c.req.param("position");
    const url = /^\d{1,6}$/.test(position)
      ? await recordClick({
          token: c.req.param("token"),
          position: Number(position),
          userAgent: userAgent(c.req.header("user-agent")),
          record: c.req.method === "GET",
        }).catch((error: unknown) => {
          console.error(
            `[api:tracking] failed to resolve a click (request_id=${c.var.requestId}):`,
            error,
          );
          return null;
        })
      : null;
    const destination = url ? URL.parse(url) : null;
    if (!destination) {
      return c.text("This link is not valid.", 404, { "Cache-Control": NO_STORE });
    }
    c.header("Cache-Control", NO_STORE);
    // Encode Unicode without making Hono double-encode existing percent escapes.
    return c.redirect(destination.href, 302);
  });

  return router;
}
