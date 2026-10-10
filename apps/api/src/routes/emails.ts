import { type EmailService, getEmail, listEmailEvents } from "@coss/email";
import {
  EmailEventList,
  EmailObject,
  SendEmailRequest,
  uniqueRecipientCount,
} from "@coss/email/schemas";
import type { RateLimitRequest } from "@coss/ratelimit";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { ApiError, notFound } from "../errors.ts";
import { requireApiKey } from "../middleware/api-key.ts";
import { rateLimit, rateLimitError } from "../middleware/rate-limit.ts";
import type { AppEnv } from "../types.ts";
import { validationHook } from "../validation.ts";
import { commonErrors, errorDoc, requestIdHeader } from "./docs.ts";

export const IDEMPOTENCY_KEY_MAX_LENGTH = 256;

// Header keys are matched case-insensitively by the validator; this spelling is what docs show.
const SendEmailHeaders = z.object({
  "Idempotency-Key": z
    .string()
    .min(1)
    .max(IDEMPOTENCY_KEY_MAX_LENGTH)
    .optional()
    .meta({
      description:
        "Makes retries safe: a repeated request with the same key and body returns the original " +
        `email instead of sending again (for 24 hours). 1-${IDEMPOTENCY_KEY_MAX_LENGTH} characters.`,
      example: "welcome-user-123",
    }),
});

const EmailIdParams = z.object({
  id: z.string().meta({
    description: "The email's id.",
    example: "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
  }),
});

export const sendEmailRoute = createRoute({
  method: "post",
  path: "/emails",
  operationId: "sendEmail",
  tags: ["Emails"],
  summary: "Send an email",
  description:
    "Sends an email from the API key's environment. Live (`coss_live_…`) keys must send from a " +
    "verified domain of the organization. Sandbox (`coss_test_…`) keys accept any `from` and " +
    "never deliver anything; the response has `sandbox: true`. Recipients on the environment's " +
    "suppression list (for every email, or for the email's `category`) are skipped and get " +
    "the status `suppressed`. Recipients count against the organization's send quota (per " +
    "second and per day; sandbox environments have their own daily quota).",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ email: ["send"] }), rateLimit("api.send")],
  request: {
    headers: SendEmailHeaders,
    body: { required: true, content: { "application/json": { schema: SendEmailRequest } } },
  },
  responses: {
    200: {
      description: "The email and its delivery status.",
      headers: {
        "X-Request-Id": requestIdHeader,
        "Idempotent-Replayed": {
          description:
            "`true` when this response replays an earlier request with the same `Idempotency-Key`.",
          schema: { type: "string", enum: ["true"] },
        },
      },
      content: { "application/json": { schema: EmailObject } },
    },
    400: errorDoc(
      "The body is not valid JSON (`invalid_json`) or the `Idempotency-Key` header is invalid " +
        "(`invalid_idempotency_key`).",
    ),
    ...commonErrors,
    409: errorDoc(
      "A request with this `Idempotency-Key` is still in progress (`request_in_progress`). " +
        "Retry after `Retry-After` seconds.",
      { "Retry-After": { description: "Seconds to wait.", schema: { type: "integer" } } },
    ),
    413: errorDoc("The request body is larger than 5 MB (`payload_too_large`)."),
    429: errorDoc(
      "Too many requests with this API key (`rate_limited`), or the email's recipients exceed " +
        "the send quota (`quota_exceeded`). Retry after `Retry-After` seconds; without " +
        "`Retry-After` the email has more recipients than the quota allows at once.",
      { "Retry-After": { description: "Seconds to wait.", schema: { type: "integer" } } },
    ),
    415: errorDoc("The body is not sent as `application/json` (`unsupported_media_type`)."),
    403: errorDoc(
      "The API key lacks the permission this endpoint needs (`insufficient_permissions`), or " +
        "sending is paused for the organization because of its sending reputation " +
        "(`sending_paused`).",
    ),
    422: errorDoc(
      "The body failed validation (`validation_error`, see `issues`), the `from` domain is not a " +
        "verified domain of the organization (`domain_not_verified`, live keys only), or the " +
        "`Idempotency-Key` was already used with a different body (`idempotency_key_reused`).",
    ),
  },
});

export const getEmailRoute = createRoute({
  method: "get",
  path: "/emails/{id}",
  operationId: "getEmail",
  tags: ["Emails"],
  summary: "Retrieve an email",
  description: "Only emails sent from the API key's own environment can be retrieved.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ email: ["read"] }), rateLimit("api.read")],
  request: { params: EmailIdParams },
  responses: {
    200: {
      description: "The email.",
      headers: { "X-Request-Id": requestIdHeader },
      content: { "application/json": { schema: EmailObject } },
    },
    ...commonErrors,
    404: errorDoc("No email with this id exists in the API key's environment (`not_found`)."),
  },
});

export const listEmailEventsRoute = createRoute({
  method: "get",
  path: "/emails/{id}/events",
  operationId: "listEmailEvents",
  tags: ["Emails"],
  summary: "List an email's delivery events",
  description:
    "Every delivery event of the email, oldest first: `email.sent` and `email.failed` for the " +
    "whole email, and `email.delivered`, `email.delivery_delayed`, `email.bounced`, " +
    "`email.complained` and `email.suppressed` (skipped because of the suppression list) per " +
    "recipient.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ email: ["read"] }), rateLimit("api.read")],
  request: { params: EmailIdParams },
  responses: {
    200: {
      description: "The email's events.",
      headers: { "X-Request-Id": requestIdHeader },
      content: { "application/json": { schema: EmailEventList } },
    },
    ...commonErrors,
    404: errorDoc("No email with this id exists in the API key's environment (`not_found`)."),
  },
});

/**
 * The recipient quota a send is charged against: the organization's for live keys, the
 * environment's own (smaller, daily) quota for sandbox keys.
 */
function sendQuota(
  auth: { organizationId: string; environmentId: string; mode: string },
  recipients: number,
): RateLimitRequest {
  return auth.mode === "sandbox"
    ? {
        buckets: ["email.sandbox_recipients.day"],
        subject: auth.environmentId,
        organizationId: auth.organizationId,
        cost: recipients,
      }
    : {
        buckets: ["email.recipients.second", "email.recipients.day"],
        subject: auth.organizationId,
        organizationId: auth.organizationId,
        cost: recipients,
      };
}

function invalidIdempotencyKey(): ApiError {
  return new ApiError(400, {
    type: "invalid_request_error",
    code: "invalid_idempotency_key",
    message: `The Idempotency-Key header must be 1-${IDEMPOTENCY_KEY_MAX_LENGTH} characters.`,
    param: "Idempotency-Key",
  });
}

export function createEmailRoutes(emailService: EmailService): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(
    sendEmailRoute,
    async (c) => {
      const params = c.req.valid("json");
      const idempotencyKey = c.req.valid("header")["Idempotency-Key"];
      const { apiKeyId, organizationId, projectId, environmentId, mode } = c.var.auth;
      const quota = sendQuota(c.var.auth, uniqueRecipientCount(params));
      const decision = await c.var.rateLimiter.consume(quota);
      if (!decision.allowed) {
        throw rateLimitError(decision, {
          code: "quota_exceeded",
          message:
            decision.retryAfterMs === null
              ? "This email has more recipients than the send quota allows at once."
              : `The send quota (${decision.bucket}) is used up. Retry after \`Retry-After\` seconds.`,
        });
      }
      let result: Awaited<ReturnType<EmailService["send"]>>;
      try {
        // Tenancy always comes from the authenticated key, never from the request.
        result = await emailService.send({
          environment: { organizationId, projectId, environmentId, mode },
          apiKeyId,
          params,
          idempotencyKey,
        });
      } catch (error) {
        // Rejected before anything was sent (validation, domain, idempotency conflicts).
        await c.var.rateLimiter.refund(quota);
        throw error;
      }
      const { email, replayed } = result;
      // A replay sent nothing new (an SDK retry reuses its Idempotency-Key).
      if (replayed) {
        await c.var.rateLimiter.refund(quota);
        c.header("Idempotent-Replayed", "true");
      }
      return c.json(email, 200);
    },
    // Replaces the default hook for this route: a bad Idempotency-Key is a 400, not a 422.
    (result) => {
      if (!result.success && result.target === "header") throw invalidIdempotencyKey();
      validationHook(result);
    },
  );

  router.openapi(getEmailRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { organizationId, environmentId } = c.var.auth;
    // Malformed, unknown, other-environment and other-organization ids are all `null`.
    const email = await getEmail({ organizationId, environmentId, id });
    if (!email) throw notFound("No email with this id exists in this API key's environment.");
    return c.json(email, 200);
  });

  router.openapi(listEmailEventsRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { organizationId, environmentId } = c.var.auth;
    const result = await listEmailEvents({ organizationId, environmentId, emailId: id });
    if (!result) throw notFound("No email with this id exists in this API key's environment.");
    return c.json({ object: "list" as const, data: result.events, has_more: result.hasMore }, 200);
  });

  return router;
}
