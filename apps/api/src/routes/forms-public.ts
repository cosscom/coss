/**
 * Forms' public endpoint (`<FORMS_PUBLIC_URL>/f/:formId`), where customers' sites post: plain HTML
 * forms (`application/x-www-form-urlencoded`, `multipart/form-data` with files), `coss/forms` and
 * other scripts (`Accept: application/json`, JSON bodies too). Unauthenticated, outside `/v1` and the
 * OpenAPI document, never answered with the API's error envelope: HTML posts get pages and 303
 * redirects, scripts get `{ ok, … }` JSON with CORS (no credentials, ever).
 *
 * Production serves these paths only on the forms host (`hostOnly`), a registrable domain of its
 * own, so a phishing report about a form never lands on coss.com. Spam is answered exactly like a
 * success: nothing tells a bot what tripped it.
 */
import { randomBytes } from "node:crypto";
import type { UsageGate } from "@coss/billing/gate";
import {
  confirmationPage,
  confirmFormSubmission,
  errorsPage,
  type FieldError,
  type FormFileStore,
  type FormLinks,
  findConfirmation,
  type SubmitFormResult,
  type SubmittedFile,
  submitForm,
  thanksPage,
  unavailablePage,
} from "@coss/forms";
import { MAX_SUBMISSION_FILE_BYTES } from "@coss/forms/schemas";
import type { RiskDeps } from "@coss/risk";
import { type Context, Hono, type Next } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { AppEnv } from "../types.ts";

export const FORMS_PATH_PREFIX = "/f/";

const NO_STORE = "no-store, private";
/** Text bodies: well over a submission's 64 KB of text, encoded. */
const TEXT_BODY_LIMIT_BYTES = 512 * 1024;
/** Uploads: every file a submission may carry, plus the multipart framing and its text. */
const MULTIPART_BODY_LIMIT_BYTES = MAX_SUBMISSION_FILE_BYTES + 2 * 1024 * 1024;

export type FormEndpointOptions = {
  riskDeps: RiskDeps;
  store: FormFileStore | null;
  links: FormLinks;
  /** Serve only requests for this host (`FORMS_PUBLIC_URL`'s); `null`: any host (development). */
  hostOnly: string | null;
  /** Capped plans' `forms.submissions` (`UsageGate`), reserved as submissions are accepted. */
  billing?: UsageGate | undefined;
};

/** Scripts: a JSON body, or an `Accept` asking for JSON and not HTML (browsers' posts ask for HTML). */
function wantsJson(c: Context<AppEnv>): boolean {
  if ((c.req.header("content-type") ?? "").startsWith("application/json")) return true;
  const accept = c.req.header("accept") ?? "";
  return accept.includes("application/json") && !accept.includes("text/html");
}

function pageHeaders(nonce: string, formOrigins: readonly string[] = []): Record<string, string> {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": NO_STORE,
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex",
    "Content-Security-Policy":
      `default-src 'none'; style-src 'nonce-${nonce}'; form-action 'self'` +
      `${formOrigins.map((origin) => ` ${origin}`).join("")}; frame-ancestors 'none'; base-uri 'none'`,
  };
}

/** The CORS headers of a form's answer to a script: any origin unless the form lists its own. */
function corsHeaders(
  origin: string | undefined,
  allowedOrigins: readonly string[] | null,
): Record<string, string> {
  if (!origin) return {};
  if (allowedOrigins && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": allowedOrigins && allowedOrigins.length > 0 ? origin : "*",
    Vary: "Origin",
  };
}

type ReadBody = { fields: [string, string][]; files: SubmittedFile[] };

async function readBody(c: Context<AppEnv>): Promise<ReadBody | null> {
  const type = c.req.header("content-type") ?? "";
  const fields: [string, string][] = [];
  const files: SubmittedFile[] = [];
  try {
    if (type.startsWith("application/json")) {
      const body = (await c.req.json()) as unknown;
      if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
      for (const [name, value] of Object.entries(body)) {
        for (const one of Array.isArray(value) ? value : [value]) {
          if (typeof one === "string" || typeof one === "number" || typeof one === "boolean") {
            fields.push([name, String(one)]);
          }
        }
      }
      return { fields, files };
    }
    if (
      !type.startsWith("application/x-www-form-urlencoded") &&
      !type.startsWith("multipart/form-data")
    ) {
      return null;
    }
    const form = await c.req.formData();
    for (const [name, entry] of form.entries()) {
      // Bun's types say string; multipart parts are `File`s.
      const value = entry as string | File;
      if (typeof value === "string") fields.push([name, value]);
      else {
        files.push({
          field: name,
          filename: value.name,
          contentType: value.type || "application/octet-stream",
          content: new Uint8Array(await value.arrayBuffer()),
        });
      }
    }
    return { fields, files };
  } catch {
    return null;
  }
}

/**
 * The client's own limit first: a client already over it never spends the form's shared
 * allowance, so one sender can't keep a form answering 429 to everyone else.
 */
async function allowed(c: Context<AppEnv>, formId: string): Promise<boolean> {
  const byIp = await c.var.rateLimiter.consume({
    buckets: ["forms.submit.ip"],
    subject: c.var.clientIp ?? "unattributed",
  });
  if (!byIp.allowed) return false;
  const byForm = await c.var.rateLimiter.consume({
    buckets: ["forms.submit.form"],
    subject: formId.slice(0, 64),
  });
  return byForm.allowed;
}

/** Verification links: per client IP (a token is 256 random bits; guessing one is hopeless). */
async function confirmAllowed(c: Context<AppEnv>): Promise<boolean> {
  return (
    await c.var.rateLimiter.consume({
      buckets: ["forms.submit.ip"],
      subject: c.var.clientIp ?? "unattributed",
    })
  ).allowed;
}

function tooMany(c: Context<AppEnv>) {
  return c.text("Too many requests. Try again in a moment.", 429, {
    "Cache-Control": NO_STORE,
    "Retry-After": "1",
  });
}

function linkGone(c: Context<AppEnv>) {
  const nonce = randomBytes(16).toString("base64");
  return c.body(
    unavailablePage({
      message: "This link has expired or was already replaced by a newer one.",
      nonce,
    }),
    404,
    pageHeaders(nonce),
  );
}

/** What the submitter is told: spam and held look accepted, and pending when the form verifies. */
function publicStatus(result: Extract<SubmitFormResult, { submissionId: string }>) {
  return result.outcome === "pending_confirmation" ||
    (result.form.verifySubmitter && result.outcome !== "accepted")
    ? "pending_confirmation"
    : "received";
}

export function createFormEndpointRoutes(opts: FormEndpointOptions): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.use("*", async (c, next) => {
    // The request URL's host is the `Host` header the server received.
    if (opts.hostOnly && new URL(c.req.url).host.toLowerCase() !== opts.hostOnly) {
      return c.text("Not found.", 404, { "Cache-Control": NO_STORE });
    }
    await next();
  });
  const textLimit = bodyLimit({
    maxSize: TEXT_BODY_LIMIT_BYTES,
    onError: (c) => c.text("Payload too large.", 413, { "Cache-Control": NO_STORE }),
  });
  const multipartLimit = bodyLimit({
    maxSize: MULTIPART_BODY_LIMIT_BYTES,
    onError: (c) => c.text("Payload too large.", 413, { "Cache-Control": NO_STORE }),
  });
  router.use("*", (c, next: Next) =>
    (c.req.header("content-type") ?? "").startsWith("multipart/form-data")
      ? multipartLimit(c, next)
      : textLimit(c, next),
  );

  // The submitter's verification link (`verify_submitter`). Mail scanners fetch every link, so the
  // GET only shows a button; the POST confirms.
  router.get("/c/:token", async (c) => {
    if (!(await confirmAllowed(c))) return tooMany(c);
    const found = await findConfirmation(c.req.param("token"));
    if (!found) return linkGone(c);
    const nonce = randomBytes(16).toString("base64");
    return c.body(
      confirmationPage({
        formName: found.form.name,
        successMessage: found.form.successMessage,
        state: found.confirmed ? "already_confirmed" : "ask",
        action: c.req.path,
        nonce,
      }),
      200,
      // `form-action` also covers the redirect after the POST (the form's thank-you page).
      pageHeaders(nonce, found.form.redirectUrl ? [new URL(found.form.redirectUrl).origin] : []),
    );
  });

  router.post("/c/:token", async (c) => {
    if (!(await confirmAllowed(c))) return tooMany(c);
    const result = await confirmFormSubmission(c.req.param("token"), new Date(), opts.billing);
    if (!result) return linkGone(c);
    if (result.outcome === "unavailable") {
      const nonce = randomBytes(16).toString("base64");
      return c.body(
        unavailablePage({ message: "This form isn't accepting submissions right now.", nonce }),
        403,
        pageHeaders(nonce),
      );
    }
    if (result.outcome === "confirmed" && result.form.redirectUrl) {
      return c.redirect(result.form.redirectUrl, 303);
    }
    const nonce = randomBytes(16).toString("base64");
    return c.body(
      confirmationPage({
        formName: result.form.name,
        successMessage: result.form.successMessage,
        state: result.outcome,
        action: c.req.path,
        nonce,
      }),
      200,
      pageHeaders(nonce),
    );
  });

  // Preflight for scripts posting JSON: allowed for any origin the form accepts.
  router.options("/:formId", async (c) => {
    const origin = c.req.header("origin");
    return c.body(null, 204, {
      ...corsHeaders(origin, null),
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Max-Age": "600",
    });
  });

  router.post("/:formId", async (c) => {
    const formId = c.req.param("formId");
    const json = wantsJson(c);
    const origin = c.req.header("origin");
    const nonce = randomBytes(16).toString("base64");
    const unavailable = (status: 403 | 404 | 429, message: string, extra = {}) =>
      json
        ? c.json({ ok: false, error: message }, status, {
            ...corsHeaders(origin, null),
            "Cache-Control": NO_STORE,
            ...extra,
          })
        : c.body(unavailablePage({ message, nonce }), status, { ...pageHeaders(nonce), ...extra });

    if (!(await allowed(c, formId))) {
      return unavailable(429, "Too many submissions. Try again in a moment.", {
        "Retry-After": "1",
      });
    }
    const body = await readBody(c);
    if (!body) {
      return json
        ? c.json({ ok: false, error: "Send the form's fields as a form or JSON object." }, 400, {
            ...corsHeaders(origin, null),
            "Cache-Control": NO_STORE,
          })
        : c.text("Send the form's fields.", 400, { "Cache-Control": NO_STORE });
    }

    let result: SubmitFormResult;
    try {
      result = await submitForm(
        {
          riskDeps: opts.riskDeps,
          store: opts.store,
          links: opts.links,
          ...(opts.billing ? { billing: opts.billing } : {}),
          admit: async (form) =>
            (
              await c.var.rateLimiter.consume({
                buckets: ["forms.submissions.day"],
                subject: form.organizationId,
                // Loads the organization's override of the daily limit.
                organizationId: form.organizationId,
              })
            ).allowed,
        },
        {
          formId,
          fields: body.fields,
          files: body.files,
          ip: c.var.clientIp,
          userAgent: c.req.header("user-agent") ?? null,
          origin: origin ?? null,
          referrer: c.req.header("referer") ?? null,
        },
      );
    } catch (error) {
      console.error(
        `[api:forms] submission to ${formId} failed (request_id=${c.var.requestId}):`,
        error,
      );
      return json
        ? c.json({ ok: false, error: "Something went wrong. Try again in a moment." }, 500, {
            ...corsHeaders(origin, null),
            "Cache-Control": NO_STORE,
          })
        : c.text("Something went wrong. Try again in a moment.", 500, {
            "Cache-Control": NO_STORE,
          });
    }

    switch (result.outcome) {
      case "unavailable":
        return unavailable(404, "This form doesn't exist or isn't accepting submissions.");
      case "origin_refused":
        return unavailable(403, "This form doesn't accept submissions from this site.");
      case "rate_limited":
        return unavailable(429, "Too many submissions. Try again later.", { "Retry-After": "60" });
      case "invalid": {
        const errors: FieldError[] = result.errors;
        return json
          ? c.json({ ok: false, errors }, 422, {
              ...corsHeaders(origin, result.form.allowedOrigins),
              "Cache-Control": NO_STORE,
            })
          : c.body(
              errorsPage({
                formName: result.form.name,
                errors,
                back: c.req.header("referer") ?? null,
                nonce,
              }),
              422,
              pageHeaders(nonce),
            );
      }
      default: {
        const status = publicStatus(result);
        if (json) {
          return c.json({ ok: true, status }, 200, {
            ...corsHeaders(origin, result.form.allowedOrigins),
            "Cache-Control": NO_STORE,
          });
        }
        if (result.redirect && status === "received") return c.redirect(result.redirect, 303);
        return c.body(
          thanksPage({
            formName: result.form.name,
            successMessage: result.form.successMessage,
            pending: status === "pending_confirmation",
            nonce,
          }),
          200,
          pageHeaders(nonce),
        );
      }
    }
  });

  return router;
}
