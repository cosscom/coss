import { type EmailService, getEmail, listEmailEvents } from "@coss/email";
import { EmailEventList, EmailObject, SendEmailRequest } from "@coss/email/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { ApiError, notFound } from "../errors.ts";
import { requireApiKey } from "../middleware/api-key.ts";
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
        "email (with its current status) instead of sending again, for 24 hours. " +
        `1-${IDEMPOTENCY_KEY_MAX_LENGTH} characters.`,
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
    'Queues an email from the API key\'s environment and returns it with `status: "queued"`; ' +
    "it is handed to the delivery provider moments later. Follow it with `GET /v1/emails/{id}` " +
    "or the `email.sent` / `email.failed` webhooks. Live (`coss_live_…`) keys must send from a " +
    "verified domain of the organization. Sandbox (`coss_test_…`) keys accept any `from` and " +
    "never deliver anything; the response has `sandbox: true`. Recipients on the environment's " +
    "suppression list (for every email, or for the email's `category`) are skipped and get " +
    "the status `suppressed`.",
  security: [{ bearerAuth: [] }],
  middleware: requireApiKey({ email: ["send"] }),
  request: {
    headers: SendEmailHeaders,
    body: { required: true, content: { "application/json": { schema: SendEmailRequest } } },
  },
  responses: {
    202: {
      description:
        "The email, accepted for delivery (`queued`). A replay returns the original email with " +
        "its current status.",
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
      "Requests with this `Idempotency-Key` are racing for an expired key " +
        "(`request_in_progress`). Retry after `Retry-After` seconds.",
      { "Retry-After": { description: "Seconds to wait.", schema: { type: "integer" } } },
    ),
    413: errorDoc("The request body is larger than 5 MB (`payload_too_large`)."),
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
  middleware: requireApiKey({ email: ["read"] }),
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
  middleware: requireApiKey({ email: ["read"] }),
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
      // Tenancy always comes from the authenticated key, never from the request.
      const { email, replayed } = await emailService.send({
        environment: { organizationId, projectId, environmentId, mode },
        apiKeyId,
        params,
        idempotencyKey,
      });
      if (replayed) c.header("Idempotent-Replayed", "true");
      return c.json(email, 202);
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
