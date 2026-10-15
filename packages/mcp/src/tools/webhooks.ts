import type { WebhookDelivery } from "coss";
import { z } from "zod";
import { ok, respond, run, truncate, unwrap } from "../result.ts";
import {
  compact,
  cursorSchema,
  limitSchema,
  nextCursor,
  READ_ONLY,
  type ToolContext,
  WRITE,
} from "./shared.ts";

/** A delivery without its payload and with only its latest attempt. */
function deliverySummary(delivery: WebhookDelivery): object {
  const last = delivery.attempts.at(-1);
  return compact({
    id: delivery.id,
    event_type: delivery.event_type,
    event_id: delivery.event_id,
    status: delivery.status,
    attempt_count: delivery.attempt_count,
    last_status_code: delivery.last_status_code,
    last_error: delivery.last_error,
    last_response_excerpt: last ? truncate(last.response_excerpt, 300) : null,
    next_attempt_at: delivery.next_attempt_at,
    created_at: delivery.created_at,
  });
}

const endpointId = z.string().describe("The webhook endpoint id.");

export function registerWebhookTools(ctx: ToolContext): void {
  const { server, coss } = ctx;

  server.registerTool(
    "list_webhook_endpoints",
    {
      title: "List webhook endpoints",
      description:
        "The environment's webhook endpoints: URL, subscribed event types, whether each is enabled " +
        "(and why not), and since when it has been failing. Secrets are never returned.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    () => respond(coss.webhookEndpoints.list(), (list) => ({ endpoints: list.data })),
  );

  server.registerTool(
    "list_webhook_deliveries",
    {
      title: "List webhook deliveries",
      description:
        "An endpoint's deliveries, newest first, with each one's status, HTTP status code, error " +
        "and response excerpt. Use it when a webhook handler doesn't receive or rejects events.",
      inputSchema: z.object({
        endpoint_id: endpointId,
        status: z.enum(["pending", "succeeded", "failed"]).optional(),
        event_id: z.string().optional().describe("Only deliveries of this event."),
        limit: limitSchema(10),
        cursor: cursorSchema,
      }),
      annotations: READ_ONLY,
    },
    ({ endpoint_id, cursor, ...params }) =>
      respond(
        coss.webhookEndpoints.deliveries.list(endpoint_id, { ...params, after: cursor }),
        (list) => ({ deliveries: list.data.map(deliverySummary), next_cursor: nextCursor(list) }),
      ),
  );

  server.registerTool(
    "get_webhook_delivery",
    {
      title: "Get a webhook delivery",
      description:
        "One delivery with its payload and every attempt (status code, duration, error, the " +
        "start of the response body): why a handler failed.",
      inputSchema: z.object({ endpoint_id: endpointId, delivery_id: z.string() }),
      annotations: READ_ONLY,
    },
    ({ endpoint_id, delivery_id }) =>
      respond(coss.webhookEndpoints.deliveries.get(endpoint_id, delivery_id)),
  );

  server.registerTool(
    "retry_webhook_delivery",
    {
      title: "Retry a webhook delivery",
      description:
        "Sends a finished delivery to the endpoint once more, within seconds (for example after " +
        "fixing the handler). A pending delivery is already scheduled and is returned as is.",
      inputSchema: z.object({ endpoint_id: endpointId, delivery_id: z.string() }),
      annotations: { ...WRITE, openWorldHint: true },
    },
    ({ endpoint_id, delivery_id }) =>
      run(async () =>
        ok({
          delivery: deliverySummary(
            unwrap(await coss.webhookEndpoints.deliveries.retry(endpoint_id, delivery_id)),
          ),
        }),
      ),
  );
}
