/**
 * Public open/click tracking endpoints (no API key: they are fetched by mail clients). Mounted
 * outside `/v1` and the OpenAPI document. They never answer with the JSON error envelope: a pixel
 * is always a GIF, and a click either redirects to the link stored at send or is a plain 404.
 */
import { recordClick, recordOpen } from "@coss/email";
import { Hono } from "hono";
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

export function createTrackingRoutes(): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/o/:token", async (c) => {
    // Mail clients prefetch with HEAD: answer it (Hono routes HEAD to GET) without recording.
    if (c.req.method === "GET") {
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
    if (!url) {
      return c.text("This link is not valid.", 404, { "Cache-Control": NO_STORE });
    }
    c.header("Cache-Control", NO_STORE);
    return c.redirect(url, 302);
  });

  return router;
}
