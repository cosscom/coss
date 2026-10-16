/**
 * The hosted preference center behind marketing email's links: `/t/u/:token` (preferences, and
 * RFC 8058 one-click unsubscribes), `/t/u/:token/unsubscribe` (the body's unsubscribe link) and
 * `/t/u/confirm/:token` (double opt-in). Public and unauthenticated like the tracking routes,
 * served on every tracking host (customers' tracking domains too; `Host` is ignored), outside
 * `/v1` and the OpenAPI document, and never answering with the JSON error envelope.
 *
 * One-click unsubscribe's own links (`/t/u/<tracking token>`, a 32-character token that is never a
 * link token) fall through to the tracking routes.
 *
 * Nothing changes on a GET or HEAD: mail scanners and link checkers fetch every URL. Tokens are
 * decrypted before any database work; a bad one is a plain-text 404. Pages are plain forms with
 * one nonce'd inline style and no script (`Content-Security-Policy`).
 */
import { createHash, randomBytes } from "node:crypto";
import {
  applyPreferences,
  confirmationPage,
  confirmContact,
  getMarketingSettingsRow,
  isTrackingToken,
  type LinkKeyRing,
  type LinkKind,
  type LinkPayload,
  loadPreferences,
  type PreferenceChange,
  preferencesPage,
  readLinkToken,
  unsubscribePage,
} from "@coss/email";
import { type Context, Hono, type Next } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { AppEnv } from "../types.ts";

/** Preference forms are a few checkboxes. */
const BODY_LIMIT_BYTES = 16 * 1024;
/** Topics one form can change. */
const MAX_TOPIC_FIELDS = 100;

const NO_STORE = "no-store, private";

function pageHeaders(nonce: string, formOrigins: string[] = []): Record<string, string> {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": NO_STORE,
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex",
    // `form-action` also covers the redirect after a POST (a customer's confirmed page).
    "Content-Security-Policy":
      `default-src 'none'; style-src 'nonce-${nonce}'; form-action 'self'` +
      `${formOrigins.map((origin) => ` ${origin}`).join("")}; frame-ancestors 'none'; base-uri 'none'`,
  };
}

function notFoundText(c: Context<AppEnv>) {
  return c.text("Not found.", 404, { "Cache-Control": NO_STORE });
}

async function allowed(c: Context<AppEnv>, token: string): Promise<boolean> {
  const byToken = await c.var.rateLimiter.consume({
    buckets: ["preferences.token"],
    subject: createHash("sha256").update(token).digest("hex").slice(0, 32),
  });
  if (!byToken.allowed) return false;
  const byIp = await c.var.rateLimiter.consume({
    buckets: ["preferences.ip"],
    subject: c.var.clientIp ?? "unattributed",
  });
  return byIp.allowed;
}

/**
 * Wraps a handler: decrypts the token (404 when it isn't one of `kind`), applies the rate limits
 * (429) and turns unexpected failures into a plain 500, never the API's envelope.
 */
function handler(
  keys: LinkKeyRing,
  kind: LinkKind,
  run: (c: Context<AppEnv>, link: LinkPayload, token: string) => Promise<Response>,
) {
  return async (c: Context<AppEnv>, next: Next) => {
    const token = c.req.param("token") ?? "";
    if (isTrackingToken(token)) return next();
    const link = readLinkToken(keys, token, kind);
    if (!link) return notFoundText(c);
    if (!(await allowed(c, token))) {
      return c.text("Too many requests. Try again in a moment.", 429, {
        "Cache-Control": NO_STORE,
        "Retry-After": "1",
      });
    }
    try {
      return await run(c, link, token);
    } catch (error) {
      console.error(
        `[api:preferences] ${c.req.method} failed (request_id=${c.var.requestId}):`,
        error,
      );
      return c.text("Something went wrong. Try again in a moment.", 500, {
        "Cache-Control": NO_STORE,
      });
    }
  };
}

/** The preference form's change: `action=save` (checkboxes) or `action=unsubscribe_all`. */
function changeOf(form: Record<string, unknown>): PreferenceChange {
  if (form.action === "unsubscribe_all") return { kind: "unsubscribe_all" };
  const topics: Record<string, boolean> = {};
  const shown = typeof form.topics === "string" ? form.topics.split(",") : [];
  for (const key of shown.slice(0, MAX_TOPIC_FIELDS)) {
    if (key) topics[key] = form[`topic:${key}`] === "on";
  }
  return { kind: "save", subscribed: form.subscribed === "on", topics };
}

export function createPreferenceRoutes(keys: LinkKeyRing): Hono<AppEnv> {
  const router = new Hono<AppEnv>();
  router.use(
    "*",
    bodyLimit({
      maxSize: BODY_LIMIT_BYTES,
      onError: (c) => c.text("Payload too large.", 413, { "Cache-Control": NO_STORE }),
    }),
  );

  router.get(
    "/confirm/:token",
    handler(keys, "confirmation", async (c, link) => {
      const context = await loadPreferences(link);
      if (!context) return notFoundText(c);
      const redirect = (
        await getMarketingSettingsRow({
          organizationId: context.organizationId,
          environmentId: context.environmentId,
        })
      )?.confirmedRedirectUrl;
      const nonce = randomBytes(16).toString("base64");
      return c.body(
        confirmationPage({
          displayName: context.displayName,
          action: c.req.path,
          nonce,
          state: context.status === "subscribed" ? "already_confirmed" : "ask",
        }),
        200,
        pageHeaders(nonce, redirect ? [new URL(redirect).origin] : []),
      );
    }),
  );

  router.post(
    "/confirm/:token",
    handler(keys, "confirmation", async (c, link) => {
      const context = await loadPreferences(link);
      if (!context) return notFoundText(c);
      const outcome = await confirmContact(link);
      const settings = await getMarketingSettingsRow({
        organizationId: context.organizationId,
        environmentId: context.environmentId,
      });
      const redirect = settings?.confirmedRedirectUrl;
      if (outcome === "confirmed" && redirect) {
        return c.redirect(redirect, 303);
      }
      const nonce = randomBytes(16).toString("base64");
      return c.body(
        confirmationPage({
          displayName: context.displayName,
          action: c.req.path,
          nonce,
          state: outcome,
        }),
        200,
        pageHeaders(nonce),
      );
    }),
  );

  router.get(
    "/:token",
    handler(keys, "preferences", async (c, link) => {
      const context = await loadPreferences(link);
      if (!context) return notFoundText(c);
      const nonce = randomBytes(16).toString("base64");
      return c.body(
        preferencesPage({
          context,
          action: `${c.req.path.replace(/\/+$/, "")}`,
          nonce,
          saved: c.req.query("saved") === "1",
        }),
        200,
        pageHeaders(nonce),
      );
    }),
  );

  router.post(
    "/:token",
    handler(keys, "preferences", async (c, link) => {
      const form = await c.req.parseBody();
      // RFC 8058: mailbox providers POST `List-Unsubscribe=One-Click` to the header's URL.
      if (form["List-Unsubscribe"] === "One-Click") {
        if (!(await applyPreferences(link, { kind: "unsubscribe" }))) return notFoundText(c);
        return c.text("Unsubscribed.", 200, { "Cache-Control": NO_STORE });
      }
      if (!(await applyPreferences(link, changeOf(form)))) return notFoundText(c);
      return c.redirect(`${c.req.path}?saved=1`, 303);
    }),
  );

  router.get(
    "/:token/unsubscribe",
    handler(keys, "preferences", async (c, link) => {
      const context = await loadPreferences(link);
      if (!context) return notFoundText(c);
      const nonce = randomBytes(16).toString("base64");
      return c.body(
        unsubscribePage({
          context,
          action: c.req.path,
          preferencesUrl: c.req.path.replace(/\/unsubscribe$/, ""),
          nonce,
          done: false,
        }),
        200,
        pageHeaders(nonce),
      );
    }),
  );

  router.post(
    "/:token/unsubscribe",
    handler(keys, "preferences", async (c, link) => {
      if (!(await applyPreferences(link, { kind: "unsubscribe" }))) return notFoundText(c);
      const context = await loadPreferences(link);
      if (!context) return notFoundText(c);
      const nonce = randomBytes(16).toString("base64");
      return c.body(
        unsubscribePage({
          context,
          action: c.req.path,
          preferencesUrl: c.req.path.replace(/\/unsubscribe$/, ""),
          nonce,
          done: true,
        }),
        200,
        pageHeaders(nonce),
      );
    }),
  );

  return router;
}
