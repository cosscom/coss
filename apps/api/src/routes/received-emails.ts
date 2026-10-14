import {
  DEFAULT_RECEIVED_EMAIL_LIST_LIMIT,
  deleteReceivedEmail,
  getReceivedEmail,
  getReceivedEmailAttachment,
  getReceivedEmailRaw,
  inboundAddressFor,
  listReceivedEmails,
} from "@coss/email";
import type { InboundRuntime } from "@coss/email/runtime";
import {
  DeletedReceivedEmail,
  InboundAddressObject,
  ListReceivedEmailsQuery,
  ReceivedEmailList,
  ReceivedEmailObject,
} from "@coss/email/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { recordApiAudit } from "../audit.ts";
import { ApiError, notFound } from "../errors.ts";
import { requireApiKey } from "../middleware/api-key.ts";
import { rateLimit } from "../middleware/rate-limit.ts";
import type { AppEnv } from "../types.ts";
import { commonErrors, errorDoc, jsonDoc, requestIdHeader } from "./docs.ts";

const TAG = "Receiving";
const NOT_FOUND_MESSAGE = "No received email with this id exists in this environment.";

const ReceivedEmailIdParams = z.object({
  id: z.string().meta({
    description: "The received email's id.",
    examples: ["rcvd_01k7c8m4q2f3e9v6t5r1n0p8yz"],
  }),
});

const AttachmentParams = ReceivedEmailIdParams.extend({
  attachment_id: z.string().meta({
    description: "The attachment's id (from the received email's `attachments`).",
    examples: ["rcvdatt_01k7c8m4r0c2b8w9y3d5f6g7h8"],
  }),
});

const unavailable = errorDoc("This deployment does not receive email (`receiving_unavailable`).");
const notFoundDoc = errorDoc(`${NOT_FOUND_MESSAGE} (\`not_found\`)`);

function binary(description: string, contentType: string) {
  return {
    description,
    headers: { "X-Request-Id": requestIdHeader },
    content: { [contentType]: { schema: z.string().meta({ format: "binary" }) } },
  };
}

export const listReceivedEmailsRoute = createRoute({
  method: "get",
  path: "/received_emails",
  operationId: "listReceivedEmails",
  tags: [TAG],
  summary: "List received emails",
  description:
    "Emails received by the API key's environment, newest first, without their bodies and " +
    "headers (retrieve one for those). Pass the last `id` as `after` to get the next page while " +
    "`has_more` is true. An `email.received` webhook announces each one as it arrives.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ email: ["read"] }), rateLimit("api.read")],
  request: { query: ListReceivedEmailsQuery },
  responses: {
    200: jsonDoc("A page of received emails.", ReceivedEmailList),
    ...commonErrors,
    422: errorDoc("A query parameter failed validation (`validation_error`)."),
  },
});

export const getInboundAddressRoute = createRoute({
  method: "get",
  path: "/received_emails/address",
  operationId: "getInboundAddress",
  tags: [TAG],
  summary: "Retrieve the environment's inbound address",
  description:
    "The environment's own domain under COSS's inbound domain: email sent to any address at it " +
    "(e.g. `support@<domain>`) is received by this environment, with no DNS setup. To receive at " +
    "your own domain, add a receiving domain instead.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ email: ["read"] }), rateLimit("api.read")],
  responses: {
    200: jsonDoc("The environment's inbound address.", InboundAddressObject),
    ...commonErrors,
    422: unavailable,
  },
});

export const getReceivedEmailRoute = createRoute({
  method: "get",
  path: "/received_emails/{id}",
  operationId: "getReceivedEmail",
  tags: [TAG],
  summary: "Retrieve a received email",
  description:
    "The received email with its headers, text and HTML bodies (each cut at 2 MB, see " +
    "`truncated`) and attachment metadata. HTML is the sender's: sanitize it before showing it " +
    "to anyone.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ email: ["read"] }), rateLimit("api.read")],
  request: { params: ReceivedEmailIdParams },
  responses: {
    200: jsonDoc("The received email.", ReceivedEmailObject),
    ...commonErrors,
    404: notFoundDoc,
  },
});

export const getReceivedEmailRawRoute = createRoute({
  method: "get",
  path: "/received_emails/{id}/raw",
  operationId: "getReceivedEmailRaw",
  tags: [TAG],
  summary: "Download a received email's raw message",
  description:
    "The whole message as received (`message/rfc822`), for your own MIME parser or archive.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ email: ["read"] }), rateLimit("api.read")],
  request: { params: ReceivedEmailIdParams },
  responses: {
    200: binary("The raw message.", "message/rfc822"),
    ...commonErrors,
    404: errorDoc(
      `${NOT_FOUND_MESSAGE} Blocked emails (a virus verdict) keep no content (\`not_found\`).`,
    ),
  },
});

export const getReceivedEmailAttachmentRoute = createRoute({
  method: "get",
  path: "/received_emails/{id}/attachments/{attachment_id}",
  operationId: "getReceivedEmailAttachment",
  tags: [TAG],
  summary: "Download an attachment of a received email",
  description:
    "The attachment's bytes, always as `application/octet-stream` (its declared type is the " +
    "attachment's `content_type`): treat them as untrusted.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ email: ["read"] }), rateLimit("api.read")],
  request: { params: AttachmentParams },
  responses: {
    200: binary("The attachment.", "application/octet-stream"),
    ...commonErrors,
    404: errorDoc("No such received email or attachment in this environment (`not_found`)."),
  },
});

export const deleteReceivedEmailRoute = createRoute({
  method: "delete",
  path: "/received_emails/{id}",
  operationId: "deleteReceivedEmail",
  tags: [TAG],
  summary: "Delete a received email",
  description:
    "Deletes the received email with its raw message and attachments right away, instead of at " +
    "the end of its retention period.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ receivedEmail: ["delete"] }), rateLimit("api.write")],
  request: { params: ReceivedEmailIdParams },
  responses: {
    200: jsonDoc("The received email was deleted.", DeletedReceivedEmail),
    ...commonErrors,
    404: notFoundDoc,
  },
});

/** `attachment; filename="…"; filename*=UTF-8''…` (RFC 6266), never breaking out of the header. */
export function attachmentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function contentHeaders(contentType: string, filename: string): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Content-Disposition": attachmentDisposition(filename),
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  };
}

export function createReceivedEmailRoutes(inbound: InboundRuntime | null): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  function requireInbound(): InboundRuntime {
    if (!inbound) {
      throw new ApiError(422, {
        type: "invalid_request_error",
        code: "receiving_unavailable",
        message: "This deployment does not receive email.",
      });
    }
    return inbound;
  }

  router.openapi(listReceivedEmailsRoute, async (c) => {
    const query = c.req.valid("query");
    const { organizationId, environmentId } = c.var.auth;
    const page = await listReceivedEmails({
      organizationId,
      environmentId,
      limit: query.limit ?? DEFAULT_RECEIVED_EMAIL_LIST_LIMIT,
      after: query.after,
    });
    return c.json({ object: "list" as const, data: page.data, has_more: page.hasMore }, 200);
  });

  // Registered before `/received_emails/{id}`, which would otherwise match it.
  router.openapi(getInboundAddressRoute, async (c) => {
    const { managedDomain } = requireInbound();
    const { organizationId, environmentId } = c.var.auth;
    return c.json(await inboundAddressFor({ organizationId, environmentId }, managedDomain), 200);
  });

  router.openapi(getReceivedEmailRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { organizationId, environmentId } = c.var.auth;
    const email = await getReceivedEmail({ organizationId, environmentId, id });
    if (!email) throw notFound(NOT_FOUND_MESSAGE);
    return c.json(email, 200);
  });

  router.openapi(getReceivedEmailRawRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { organizationId, environmentId } = c.var.auth;
    const raw = await getReceivedEmailRaw(
      { organizationId, environmentId, id },
      requireInbound().store,
    );
    if (!raw) throw notFound(NOT_FOUND_MESSAGE);
    return c.body(
      raw.content as Uint8Array<ArrayBuffer>,
      200,
      contentHeaders("message/rfc822", raw.filename),
    );
  });

  router.openapi(getReceivedEmailAttachmentRoute, async (c) => {
    const { id, attachment_id: attachmentId } = c.req.valid("param");
    const { organizationId, environmentId } = c.var.auth;
    const attachment = await getReceivedEmailAttachment(
      { organizationId, environmentId, id, attachmentId },
      requireInbound().store,
    );
    if (!attachment) {
      throw notFound("No such received email or attachment exists in this environment.");
    }
    return c.body(
      attachment.content as Uint8Array<ArrayBuffer>,
      200,
      contentHeaders("application/octet-stream", attachment.filename),
    );
  });

  router.openapi(deleteReceivedEmailRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { organizationId, environmentId } = c.var.auth;
    const deleted = await deleteReceivedEmail(
      { organizationId, environmentId, id },
      requireInbound().store,
    );
    if (!deleted) throw notFound(NOT_FOUND_MESSAGE);
    await recordApiAudit(c, {
      action: "received_email.deleted",
      target: { type: "received_email", id },
    });
    return c.json({ object: "received_email" as const, id, deleted: true as const }, 200);
  });

  return router;
}
