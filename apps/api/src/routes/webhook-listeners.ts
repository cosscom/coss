import { WEBHOOK_EVENT_TYPES } from "@coss/email/schemas";
import {
  closeWebhookListener,
  createWebhookListener,
  MAX_LISTENERS_PER_ENVIRONMENT,
  pollWebhookListener,
  toWebhookListenerObject,
} from "@coss/webhooks";
import {
  DeletedWebhookListener,
  MAX_LISTENER_WAIT_MS,
  PollWebhookListenerRequest,
  WebhookListenerObject,
  WebhookListenerPoll,
  webhookListenerRequests,
} from "@coss/webhooks/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { recordApiAudit } from "../audit.ts";
import { notFound } from "../errors.ts";
import { requireApiKey } from "../middleware/api-key.ts";
import { upgradeRequestBody } from "../middleware/api-version.ts";
import { rateLimit } from "../middleware/rate-limit.ts";
import type { AppEnv } from "../types.ts";
import { commonErrors, errorDoc, jsonDoc } from "./docs.ts";

// Exported so the SDK contract test can check it against the SDK's hand-written params.
export const { CreateWebhookListenerRequest } = webhookListenerRequests(WEBHOOK_EVENT_TYPES);

const ListenerIdParams = z.object({
  id: z.string().meta({
    description: "The webhook listener's id.",
    examples: ["whlis_01k7c8m4q2f3e9v6t5r1n0p8yz"],
  }),
});

const LISTENER_NOTE =
  "Listeners are how `coss listen` forwards events to a local server: COSS can't reach " +
  "`localhost`, so the CLI pulls them. They belong to the API key's environment, receive events " +
  "created after they open, and don't count toward the plan's webhook endpoints.";

const listenerNotFound = errorDoc(
  "No open webhook listener with this id exists in the API key's environment: it was closed, " +
    "or expired after 10 minutes without a poll (`not_found`).",
);

const bodyErrors = {
  400: errorDoc("The body is not valid JSON (`invalid_json`)."),
  413: errorDoc("The request body is larger than 5 MB (`payload_too_large`)."),
  415: errorDoc("The body is not sent as `application/json` (`unsupported_media_type`)."),
};

export const createWebhookListenerRoute = createRoute({
  method: "post",
  path: "/webhook_listeners",
  operationId: "createWebhookListener",
  tags: ["Webhook endpoints"],
  summary: "Open a webhook listener",
  description:
    `${LISTENER_NOTE} A listener closes when it is deleted or after 10 minutes without a poll; ` +
    `an environment has at most ${MAX_LISTENERS_PER_ENVIRONMENT} open at once. Events reach it ` +
    "unsigned: the CLI signs what it forwards with its own secret.",
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ webhook: ["create"] }),
    rateLimit("api.write"),
    upgradeRequestBody("POST /v1/webhook_listeners"),
  ],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: CreateWebhookListenerRequest } },
    },
  },
  responses: {
    200: jsonDoc("The listener.", WebhookListenerObject),
    ...bodyErrors,
    ...commonErrors,
    422: errorDoc(
      "The body failed validation (`validation_error`, including an unknown `api_version`), or " +
        `the environment already has ${MAX_LISTENERS_PER_ENVIRONMENT} open listeners ` +
        "(`too_many_listeners`).",
    ),
  },
});

export const pollWebhookListenerRoute = createRoute({
  method: "post",
  path: "/webhook_listeners/{id}/poll",
  operationId: "pollWebhookListener",
  tags: ["Webhook endpoints"],
  summary: "Poll a webhook listener",
  description:
    "Acknowledges deliveries handed out earlier, keeps the listener open for another 10 minutes, " +
    `and waits up to \`wait_ms\` (at most ${MAX_LISTENER_WAIT_MS / 1000} s) for events. ` +
    "Deliveries come oldest first; one not acknowledged within two minutes is handed out again " +
    "(with the same `event_id`). The answer may come early, with no deliveries, when the API " +
    "restarts: poll again. Polls are not request-logged; each acknowledgement is logged as a " +
    "`webhook.forward` line.",
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ webhook: ["read"] }),
    rateLimit("api.write"),
    upgradeRequestBody("POST /v1/webhook_listeners/{id}/poll"),
  ],
  request: {
    params: ListenerIdParams,
    body: {
      required: true,
      content: { "application/json": { schema: PollWebhookListenerRequest } },
    },
  },
  responses: {
    200: jsonDoc("Deliveries to forward (possibly none).", WebhookListenerPoll),
    ...bodyErrors,
    ...commonErrors,
    404: listenerNotFound,
    422: errorDoc("The body failed validation (`validation_error`)."),
  },
});

export const deleteWebhookListenerRoute = createRoute({
  method: "delete",
  path: "/webhook_listeners/{id}",
  operationId: "deleteWebhookListener",
  tags: ["Webhook endpoints"],
  summary: "Close a webhook listener",
  description:
    "Closes the listener: it receives nothing more, and deliveries it was still holding are " +
    "dropped. `coss listen` closes its listener when it exits.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ webhook: ["delete"] }), rateLimit("api.write")],
  request: { params: ListenerIdParams },
  responses: {
    200: jsonDoc("The listener was closed.", DeletedWebhookListener),
    ...commonErrors,
    404: listenerNotFound,
  },
});

export function createWebhookListenerRoutes(deps: {
  /** Aborted when the server shuts down: waiting polls answer at once. */
  shutdownSignal: AbortSignal;
  pollIntervalMs?: number;
}): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(createWebhookListenerRoute, async (c) => {
    const body = c.req.valid("json");
    const { organizationId, environmentId, apiKeyId } = c.var.auth;
    const listener = await createWebhookListener({
      organizationId,
      environmentId,
      // Omitted means every event type, including ones added later.
      eventTypes: body.event_types ?? [],
      // By default, events arrive in the version this request was made in.
      apiVersion: body.api_version ?? c.var.apiVersion,
      description: body.description,
      apiKeyId,
      versioning: c.var.versioning,
    });
    // A listener reads every event of the environment: worth a trace in the audit log.
    await recordApiAudit(c, {
      action: "webhook_listener.created",
      target: {
        type: "webhook_listener",
        id: listener.id,
        label: listener.description ?? listener.id,
      },
      metadata: { event_types: listener.eventTypes },
    });
    return c.json(toWebhookListenerObject(listener), 200);
  });

  router.openapi(pollWebhookListenerRoute, async (c) => {
    const body = c.req.valid("json");
    const { organizationId, environmentId } = c.var.auth;
    const result = await pollWebhookListener({
      organizationId,
      environmentId,
      id: c.req.valid("param").id,
      acks: (body.acks ?? []).map((ack) => ({
        deliveryId: ack.delivery_id,
        ackToken: ack.ack_token,
        statusCode: ack.status_code,
        durationMs: ack.duration_ms,
        error: ack.error,
      })),
      waitMs: body.wait_ms,
      limit: body.limit,
      // The client hanging up, or the server draining, ends the wait.
      signal: AbortSignal.any([c.req.raw.signal, deps.shutdownSignal]),
      intervalMs: deps.pollIntervalMs,
      versioning: c.var.versioning,
    });
    if (!result) {
      throw notFound("No open webhook listener with this id exists in this API key's environment.");
    }
    return c.json(
      {
        object: "webhook_listener_poll" as const,
        listener: toWebhookListenerObject(result.listener),
        deliveries: result.deliveries,
        acknowledged: result.acknowledged,
      },
      200,
    );
  });

  router.openapi(deleteWebhookListenerRoute, async (c) => {
    const { organizationId, environmentId } = c.var.auth;
    const id = c.req.valid("param").id;
    if (!(await closeWebhookListener({ organizationId, environmentId, id }))) {
      throw notFound("No open webhook listener with this id exists in this API key's environment.");
    }
    return c.json({ object: "webhook_listener" as const, id, deleted: true as const }, 200);
  });

  return router;
}
