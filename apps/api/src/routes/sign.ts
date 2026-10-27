import {
  cancelSignRequest,
  getSignDocument,
  getSignRequest,
  listSignDocuments,
  listSignRequestEvents,
  listSignRequests,
  type SignActor,
  type SignService,
  sendSignRequest,
} from "@coss/sign";
import {
  CreateSignRequestRequest,
  DeletedSignDocument,
  ListSignDocumentsQuery,
  ListSignRequestsQuery,
  SignDocumentList,
  SignDocumentObject,
  SignEventList,
  SignRequestList,
  SignRequestObject,
  UploadSignDocumentRequest,
} from "@coss/sign/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { z } from "zod";
import { recordApiAudit } from "../audit.ts";
import { limitBody, SEND_BODY_LIMIT_BYTES } from "../body-limit.ts";
import { ApiError } from "../errors.ts";
import { requireApiKey } from "../middleware/api-key.ts";
import { upgradeRequestBody } from "../middleware/api-version.ts";
import { rateLimit } from "../middleware/rate-limit.ts";
import type { AppEnv } from "../types.ts";
import { commonErrors, errorDoc, jsonDoc, requestIdHeader } from "./docs.ts";
import { idempotencyHeaders, idempotencyHook, idempotentReplayedHeader } from "./idempotency.ts";

const TAG_DOCUMENTS = "Sign documents";
const TAG_REQUESTS = "Signature requests";

const DocumentIdParams = z.object({
  id: z.string().meta({
    description: "The document's id.",
    examples: ["sdoc_01k7c8m4q2f3e9v6t5r1n0p8yz"],
  }),
});

const RequestIdParams = z.object({
  id: z.string().meta({
    description: "The signature request's id.",
    examples: ["sreq_01k7c8m4q2f3e9v6t5r1n0p8yz"],
  }),
});

const CreateSignRequestHeaders = idempotencyHeaders(
  "Makes retries safe: a repeated request with the same key and body returns the original " +
    "request (in its current state) instead of creating another, for 24 hours.",
);

const queryError = errorDoc(
  "A query parameter failed validation (`validation_error`, see `issues`).",
);
const uploadBodyErrors = {
  400: errorDoc("The body is not valid JSON (`invalid_json`)."),
  413: errorDoc("The request body is larger than 40 MB (`payload_too_large`)."),
  415: errorDoc("The body is not sent as `application/json` (`unsupported_media_type`)."),
};
const documentNotFound = errorDoc(
  "No document with this id exists in the API key's environment (`not_found`).",
);
const requestNotFound = errorDoc(
  "No signature request with this id exists in the API key's environment (`not_found`).",
);
const unavailable = errorDoc("Sign isn't available in this deployment yet (`sign_unavailable`).");

export const uploadSignDocumentRoute = createRoute({
  method: "post",
  path: "/sign/documents",
  operationId: "uploadSignDocument",
  tags: [TAG_DOCUMENTS],
  summary: "Upload a document",
  description:
    "Uploads a PDF (base64, at most 25 MB and 500 pages, not password-protected) for signature " +
    "requests to use. The response lists each page's size and the text anchors found in it " +
    "(`{{signature:signer_1}}`), which fields can be placed by. Requests can also take PDFs inline.",
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ sign: ["create"] }),
    limitBody(SEND_BODY_LIMIT_BYTES),
    rateLimit("api.write"),
    upgradeRequestBody("POST /v1/sign/documents"),
  ] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: UploadSignDocumentRequest } },
    },
  },
  responses: {
    201: jsonDoc("The uploaded document.", SignDocumentObject),
    ...commonErrors,
    ...uploadBodyErrors,
    422: errorDoc(
      "The body failed validation (`validation_error`, see `issues`), or the file isn't a PDF " +
        "coss.com can read (`invalid_document`: damaged, encrypted or too many pages).",
    ),
    503: unavailable,
  },
});

export const listSignDocumentsRoute = createRoute({
  method: "get",
  path: "/sign/documents",
  operationId: "listSignDocuments",
  tags: [TAG_DOCUMENTS],
  summary: "List documents",
  description:
    "Documents uploaded to the API key's environment, newest first. Pass the last `id` as " +
    "`after` to get the next page while `has_more` is true.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ sign: ["read"] }), rateLimit("api.read")],
  request: { query: ListSignDocumentsQuery },
  responses: {
    200: jsonDoc("A page of documents.", SignDocumentList),
    ...commonErrors,
    422: queryError,
  },
});

export const getSignDocumentRoute = createRoute({
  method: "get",
  path: "/sign/documents/{id}",
  operationId: "getSignDocument",
  tags: [TAG_DOCUMENTS],
  summary: "Retrieve a document",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ sign: ["read"] }), rateLimit("api.read")],
  request: { params: DocumentIdParams },
  responses: {
    200: jsonDoc("The document.", SignDocumentObject),
    ...commonErrors,
    404: documentNotFound,
  },
});

export const deleteSignDocumentRoute = createRoute({
  method: "delete",
  path: "/sign/documents/{id}",
  operationId: "deleteSignDocument",
  tags: [TAG_DOCUMENTS],
  summary: "Delete a document",
  description:
    "Deletes an uploaded document and its file. Documents a request uses can't be deleted.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ sign: ["delete"] }), rateLimit("api.write")],
  request: { params: DocumentIdParams },
  responses: {
    200: jsonDoc("The document was deleted.", DeletedSignDocument),
    ...commonErrors,
    404: documentNotFound,
    422: errorDoc("A signature request uses the document (`document_in_use`)."),
    503: unavailable,
  },
});

export const createSignRequestRoute = createRoute({
  method: "post",
  path: "/sign/requests",
  operationId: "createSignRequest",
  tags: [TAG_REQUESTS],
  summary: "Create a signature request",
  description:
    "Asks one or more signers to sign one or more PDFs. Give documents by id (uploaded) or " +
    "inline, and each signer's fields by position (`page`, `x`, `y`, `width`, `height` in PDF " +
    "points from the page's top left) or by text anchor (`{{signature:signer_1}}`). Every signer " +
    "needs a `signature` field. Sent at once unless `send` is `false` (a `draft`). Each signer " +
    'signs by email (`delivery: "email"`, the default) or in your app (`"embedded"`).',
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ sign: ["create"] }),
    limitBody(SEND_BODY_LIMIT_BYTES),
    rateLimit("api.write"),
    upgradeRequestBody("POST /v1/sign/requests"),
  ] as const,
  request: {
    headers: CreateSignRequestHeaders,
    body: {
      required: true,
      content: { "application/json": { schema: CreateSignRequestRequest } },
    },
  },
  responses: {
    201: {
      description:
        "The signature request (`sent`, or `draft`). A replay returns the original request in its current state.",
      headers: { "X-Request-Id": requestIdHeader, "Idempotent-Replayed": idempotentReplayedHeader },
      content: { "application/json": { schema: SignRequestObject } },
    },
    ...commonErrors,
    ...uploadBodyErrors,
    400: errorDoc(
      "The body is not valid JSON (`invalid_json`) or the `Idempotency-Key` header is invalid " +
        "(`invalid_idempotency_key`).",
    ),
    409: errorDoc(
      "Requests with this `Idempotency-Key` are racing for an expired key (`request_in_progress`).",
    ),
    422: errorDoc(
      "The body failed validation (`validation_error`, see `issues`), a document isn't a PDF " +
        "coss.com can read (`invalid_document`) or isn't in the environment (`not_found`), a field " +
        "doesn't fit on its page or names an anchor no document has (`invalid_fields`), a signer " +
        "is listed twice (`invalid_signers`), `expires_at` is out of range (`invalid_expiry`), or " +
        "the `Idempotency-Key` was already used with a different body (`idempotency_key_reused`).",
    ),
    503: unavailable,
  },
});

export const listSignRequestsRoute = createRoute({
  method: "get",
  path: "/sign/requests",
  operationId: "listSignRequests",
  tags: [TAG_REQUESTS],
  summary: "List signature requests",
  description:
    "Signature requests of the API key's environment, newest first. Pass the last `id` as " +
    "`after` to get the next page while `has_more` is true.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ sign: ["read"] }), rateLimit("api.read")],
  request: { query: ListSignRequestsQuery },
  responses: {
    200: jsonDoc("A page of signature requests.", SignRequestList),
    ...commonErrors,
    422: queryError,
  },
});

export const getSignRequestRoute = createRoute({
  method: "get",
  path: "/sign/requests/{id}",
  operationId: "getSignRequest",
  tags: [TAG_REQUESTS],
  summary: "Retrieve a signature request",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ sign: ["read"] }), rateLimit("api.read")],
  request: { params: RequestIdParams },
  responses: {
    200: jsonDoc("The signature request.", SignRequestObject),
    ...commonErrors,
    404: requestNotFound,
  },
});

export const sendSignRequestRoute = createRoute({
  method: "post",
  path: "/sign/requests/{id}/send",
  operationId: "sendSignRequest",
  tags: [TAG_REQUESTS],
  summary: "Send a draft signature request",
  description: "Sends a `draft`. An already sent request is returned as is.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ sign: ["send"] }), rateLimit("api.write")],
  request: { params: RequestIdParams },
  responses: {
    200: jsonDoc("The sent request.", SignRequestObject),
    ...commonErrors,
    404: requestNotFound,
    422: errorDoc("The request isn't a draft (`request_not_draft`)."),
  },
});

export const cancelSignRequestRoute = createRoute({
  method: "post",
  path: "/sign/requests/{id}/cancel",
  operationId: "cancelSignRequest",
  tags: [TAG_REQUESTS],
  summary: "Cancel a signature request",
  description:
    "Cancels a `draft` or `sent` request: its signers can no longer sign. An already canceled " +
    "request is returned as is.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ sign: ["update"] }), rateLimit("api.write")],
  request: { params: RequestIdParams },
  responses: {
    200: jsonDoc("The canceled request.", SignRequestObject),
    ...commonErrors,
    404: requestNotFound,
    422: errorDoc(
      "The request is already completed, declined or expired (`request_not_cancelable`).",
    ),
  },
});

export const listSignRequestEventsRoute = createRoute({
  method: "get",
  path: "/sign/requests/{id}/audit_trail",
  operationId: "listSignRequestEvents",
  tags: [TAG_REQUESTS],
  summary: "List a signature request's audit trail",
  description:
    "Everything that happened to the request, oldest first: who did it, from which address, the " +
    "documents' SHA-256 when it mattered, and a hash chain (`previous_hash`, `hash`) that shows " +
    "the trail is complete and unchanged.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ sign: ["read"] }), rateLimit("api.read")],
  request: { params: RequestIdParams },
  responses: {
    200: jsonDoc("The audit trail.", SignEventList),
    ...commonErrors,
    404: requestNotFound,
  },
});

/** The API caller, as the audit trail records it. */
function apiActor(c: Context<AppEnv>): SignActor {
  return {
    kind: "api_key",
    ipAddress: c.var.clientIp,
    userAgent: c.req.header("user-agent")?.slice(0, 512) ?? null,
  };
}

/** `signService` is `null` when Sign isn't available in this deployment: writes answer 503. */
export function createSignRoutes(signService: SignService | null): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  function available(): SignService {
    if (signService === null) {
      throw new ApiError(503, {
        type: "api_error",
        code: "sign_unavailable",
        message: "Sign isn't available in this deployment yet.",
      });
    }
    return signService;
  }

  router.openapi(uploadSignDocumentRoute, async (c) => {
    const service = available();
    const { filename, content } = c.req.valid("json");
    const { apiKeyId, organizationId, projectId, environmentId, mode } = c.var.auth;
    const document = await service.uploadDocument({
      environment: { organizationId, projectId, environmentId, mode },
      apiKeyId,
      filename,
      content,
    });
    return c.json(document, 201);
  });

  router.openapi(listSignDocumentsRoute, async (c) => {
    const query = c.req.valid("query");
    const { organizationId, environmentId } = c.var.auth;
    const page = await listSignDocuments({ organizationId, environmentId, ...query });
    return c.json({ object: "list" as const, data: page.data, has_more: page.hasMore }, 200);
  });

  router.openapi(getSignDocumentRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { organizationId, environmentId } = c.var.auth;
    return c.json(await getSignDocument({ organizationId, environmentId, documentId: id }), 200);
  });

  router.openapi(deleteSignDocumentRoute, async (c) => {
    const service = available();
    const { id } = c.req.valid("param");
    const { organizationId, environmentId } = c.var.auth;
    await service.deleteDocument({ organizationId, environmentId, documentId: id });
    await recordApiAudit(c, {
      action: "sign_document.deleted",
      target: { type: "sign_document", id },
    });
    return c.json({ object: "sign_document" as const, id, deleted: true as const }, 200);
  });

  router.openapi(
    createSignRequestRoute,
    async (c) => {
      const service = available();
      const params = c.req.valid("json");
      const idempotencyKey = c.req.valid("header")["Idempotency-Key"];
      const { apiKeyId, organizationId, projectId, environmentId, mode } = c.var.auth;
      const result = await service.create({
        environment: { organizationId, projectId, environmentId, mode },
        apiKeyId,
        actor: apiActor(c),
        params,
        idempotencyKey,
      });
      if (result.replayed) c.header("Idempotent-Replayed", "true");
      return c.json(result.request, 201);
    },
    // A bad Idempotency-Key is a 400, not a 422.
    (result) => {
      idempotencyHook(result);
    },
  );

  router.openapi(listSignRequestsRoute, async (c) => {
    const query = c.req.valid("query");
    const { organizationId, environmentId } = c.var.auth;
    const page = await listSignRequests({ organizationId, environmentId, ...query });
    return c.json({ object: "list" as const, data: page.data, has_more: page.hasMore }, 200);
  });

  router.openapi(getSignRequestRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { organizationId, environmentId } = c.var.auth;
    return c.json(await getSignRequest({ organizationId, environmentId, requestId: id }), 200);
  });

  router.openapi(sendSignRequestRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { organizationId, environmentId } = c.var.auth;
    const request = await sendSignRequest({
      organizationId,
      environmentId,
      requestId: id,
      actor: apiActor(c),
    });
    return c.json(request, 200);
  });

  router.openapi(cancelSignRequestRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { organizationId, environmentId } = c.var.auth;
    const request = await cancelSignRequest({
      organizationId,
      environmentId,
      requestId: id,
      actor: apiActor(c),
    });
    await recordApiAudit(c, {
      action: "sign_request.canceled",
      target: { type: "sign_request", id, label: request.title },
    });
    return c.json(request, 200);
  });

  router.openapi(listSignRequestEventsRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { organizationId, environmentId } = c.var.auth;
    const data = await listSignRequestEvents({ organizationId, environmentId, requestId: id });
    return c.json({ object: "list" as const, data, has_more: false }, 200);
  });

  return router;
}
