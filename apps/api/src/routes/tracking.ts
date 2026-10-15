/**
 * Public open/click tracking and one-click unsubscribe endpoints (no API key: they are fetched by
 * mail clients). Mounted outside `/v1` and the OpenAPI document. They never answer with the JSON
 * error envelope: a pixel is always a GIF, a click either redirects to the link stored at send or
 * is a plain 404, and an unsubscribe is a small HTML page or plain text.
 */

import { createHash } from "node:crypto";
import { getUnsubscribe, recordClick, recordOpen, recordUnsubscribe } from "@coss/email";
import { type Context, Hono } from "hono";
import type { AppEnv } from "../types.ts";

export const TRACKING_PATH_PREFIX = "/t/";

// A 1×1 transparent GIF.
export const PIXEL_GIF = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  (char) => char.charCodeAt(0),
);

const NO_STORE = "no-store, no-cache, must-revalidate, private";

// The unsubscribe pages are static: no scripts, no external assets, posting only to themselves.
const PAGE_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; " +
  "base-uri 'none'";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? "",
  );
}

function unsubscribePage(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#111;background:#fff}button{font:inherit;padding:.5rem 1rem;cursor:pointer}</style></head><body><h1>${title}</h1>${body}</body></html>`;
}

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

  // One-click unsubscribe (RFC 8058). Link scanners and mail clients GET the URL, so a GET (or
  // HEAD) only shows a confirmation page; the unsubscribe is the POST mailbox providers send.
  router.get("/u/:token", async (c) => {
    if (!(await trackingAllowed(c, c.req.param("token")))) {
      return c.text("Too many requests.", 429, { "Cache-Control": NO_STORE, "Retry-After": "1" });
    }
    const found = await getUnsubscribe(c.req.param("token")).catch((error: unknown) => {
      console.error(
        `[api:tracking] failed to look up an unsubscribe (request_id=${c.var.requestId}):`,
        error,
      );
      return null;
    });
    if (!found) return c.text("This link is not valid.", 404, { "Cache-Control": NO_STORE });
    const page = unsubscribePage(
      "Unsubscribe",
      `<p>Stop receiving “${escapeHtml(found.category)}” emails from this sender?</p>` +
        '<form method="post"><input type="hidden" name="List-Unsubscribe" value="One-Click">' +
        '<button type="submit">Unsubscribe</button></form>',
    );
    return c.html(page, 200, { "Cache-Control": NO_STORE, "Content-Security-Policy": PAGE_CSP });
  });

  router.post("/u/:token", async (c) => {
    if (!(await trackingAllowed(c, c.req.param("token")))) {
      return c.text("Too many requests.", 429, { "Cache-Control": NO_STORE, "Retry-After": "1" });
    }
    const body = await c.req.parseBody().catch(() => ({}) as Record<string, unknown>);
    if (body["List-Unsubscribe"] !== "One-Click") {
      return c.text("Expected List-Unsubscribe=One-Click.", 400, { "Cache-Control": NO_STORE });
    }
    let unsubscribed: boolean;
    try {
      unsubscribed = await recordUnsubscribe({ token: c.req.param("token") });
    } catch (error) {
      console.error(
        `[api:tracking] failed to record an unsubscribe (request_id=${c.var.requestId}):`,
        error,
      );
      // Not a 2xx, so the mailbox provider tries again.
      return c.text("Something went wrong. Please try again.", 503, {
        "Cache-Control": NO_STORE,
      });
    }
    if (!unsubscribed) {
      return c.text("This link is not valid.", 404, { "Cache-Control": NO_STORE });
    }
    // Never a redirect (RFC 8058).
    return c.html(
      unsubscribePage("Unsubscribed", "<p>You won’t receive these emails anymore.</p>"),
      200,
      { "Cache-Control": NO_STORE, "Content-Security-Policy": PAGE_CSP },
    );
  });

  return router;
}
