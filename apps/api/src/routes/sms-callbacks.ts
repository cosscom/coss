/**
 * Twilio's callbacks (no API key: Twilio signs them with the subaccount's auth token). Mounted at
 * `/sms/twilio`, outside `/v1` and the OpenAPI document, and never answered with the JSON error
 * envelope: status callbacks get an empty 200, inbound messages empty TwiML (Twilio's Advanced
 * Opt-Out answers STOP and HELP itself). Signatures cover the public URL Twilio was given
 * (`API_PUBLIC_URL` + path + query), never the request's own, which arrives through proxies.
 */
import { type CallbackOutcome, handleInboundCallback, handleStatusCallback } from "@coss/sms";
import type { SecretsKeyRing } from "@coss/webhooks";
import { type Context, Hono } from "hono";
import type { AppEnv } from "../types.ts";

export const SMS_CALLBACK_PATH = "/sms/twilio";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

async function form(c: Context<AppEnv>): Promise<Record<string, string> | null> {
  try {
    const body = await c.req.parseBody();
    const params: Record<string, string> = {};
    for (const [name, value] of Object.entries(body)) {
      if (typeof value === "string") params[name] = value;
    }
    return params;
  } catch {
    return null;
  }
}

function refused(c: Context<AppEnv>, outcome: CallbackOutcome) {
  if (outcome.status === "unknown_account") return c.text("Unknown account.", 404);
  if (outcome.status === "invalid_signature") return c.text("Invalid signature.", 403);
  return null;
}

export function createSmsCallbackRoutes(opts: {
  keys: SecretsKeyRing;
  /** `API_PUBLIC_URL`; the request's origin otherwise (development and tests). */
  publicUrl?: string;
}): Hono<AppEnv> {
  const router = new Hono<AppEnv>();
  const publicUrl = opts.publicUrl?.replace(/\/+$/, "");

  const signedUrl = (c: Context<AppEnv>) => {
    const url = new URL(c.req.url);
    return `${publicUrl ?? url.origin}${url.pathname}${url.search}`;
  };

  router.use(async (c, next) => {
    const decision = await c.var.rateLimiter.consume({
      buckets: ["sms.callbacks"],
      subject: c.var.clientIp ?? "unattributed",
    });
    if (!decision.allowed) return c.text("Too many requests.", 429);
    await next();
  });

  router.post("/status", async (c) => {
    const smsId = c.req.query("sms_id");
    const params = await form(c);
    if (!smsId || !params) return c.text("Bad request.", 400);
    const outcome = await handleStatusCallback(
      { url: signedUrl(c), params, signature: c.req.header("x-twilio-signature") ?? null, smsId },
      opts.keys,
    );
    return refused(c, outcome) ?? c.body(null, 200);
  });

  router.post("/inbound", async (c) => {
    const params = await form(c);
    if (!params) return c.text("Bad request.", 400);
    const outcome = await handleInboundCallback(
      { url: signedUrl(c), params, signature: c.req.header("x-twilio-signature") ?? null },
      opts.keys,
    );
    return refused(c, outcome) ?? c.body(EMPTY_TWIML, 200, { "Content-Type": "text/xml" });
  });

  return router;
}
