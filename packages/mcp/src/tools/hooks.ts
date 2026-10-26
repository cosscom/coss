import type { HookApplication, HookDelivery, HookMessage } from "coss";
import { z } from "zod";
import { ok, respond, run, unwrap } from "../result.ts";
import {
  compact,
  cursorSchema,
  limitSchema,
  nextCursor,
  READ_ONLY,
  type ToolContext,
  WRITE,
} from "./shared.ts";

/** Delivers to the customer's URLs. The SDK sends one Idempotency-Key, so a retry is one message. */
const DELIVERS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

function applicationSummary(application: HookApplication): object {
  return compact({
    id: application.id,
    uid: application.uid,
    name: application.name,
  });
}

function deliverySummary(delivery: HookDelivery): object {
  return compact({
    id: delivery.id,
    message_id: delivery.message_id,
    endpoint_id: delivery.endpoint_id,
    status: delivery.status,
    attempt_count: delivery.attempt_count,
    last_status_code: delivery.last_status_code,
    last_error: delivery.last_error,
    next_attempt_at: delivery.next_attempt_at,
    created_at: delivery.created_at,
  });
}

export function registerHookTools(ctx: ToolContext): void {
  const { server, coss } = ctx;
  const application = z
    .string()
    .describe("The Hook application's id or uid. list_hook_applications finds it.");

  server.registerTool(
    "list_hook_applications",
    {
      title: "List Hook applications",
      description:
        "Applications in this environment. Each one is a customer's end user; messages are sent " +
        "to an application id or uid.",
      inputSchema: z.object({ limit: limitSchema(20), cursor: cursorSchema }),
      annotations: READ_ONLY,
    },
    ({ limit, cursor }) =>
      run(async () => {
        const page = unwrap(
          await coss.hooks.applications.list({ limit, ...(cursor ? { after: cursor } : {}) }),
        );
        return ok({
          applications: page.data.map(applicationSummary),
          next_cursor: nextCursor(page),
        });
      }),
  );

  server.registerTool(
    "send_hook_message",
    {
      title: "Send a Hook message",
      description:
        "Sends one message to an application's endpoints (the event type and a JSON payload). " +
        "Safe to retry: the same Idempotency-Key delivers it once. This calls the customer's " +
        "URLs, so confirm the application before sending.",
      inputSchema: z.object({
        application,
        event_type: z.string().describe("For example invoice.paid."),
        payload: z
          .record(z.string(), z.unknown())
          .describe("The JSON body delivered to endpoints."),
      }),
      annotations: { ...WRITE, ...DELIVERS },
    },
    ({ application: app, event_type, payload }) =>
      respond(
        coss.hooks.messages.send({ application: app, event_type, payload }),
        (message: HookMessage) =>
          compact({
            id: message.id,
            application_id: message.application_id,
            event_type: message.event_type,
            created_at: message.created_at,
          }),
      ),
  );

  server.registerTool(
    "list_hook_deliveries",
    {
      title: "List Hook deliveries",
      description:
        "Deliveries of an application's messages. Pass message_id for one message (every endpoint " +
        "it went to, in one list) or endpoint_id for one endpoint's page. With neither, each " +
        "endpoint's recent deliveries are read, capped by limit.",
      inputSchema: z.object({
        application,
        message_id: z.string().optional().describe("Only this message's deliveries."),
        endpoint_id: z.string().optional().describe("Only this endpoint's deliveries."),
        limit: limitSchema(20),
        cursor: cursorSchema,
      }),
      annotations: READ_ONLY,
    },
    ({ application: app, message_id, endpoint_id, limit, cursor }) =>
      run(async () => {
        if (message_id) {
          // The API returns every endpoint's delivery for the message, with has_more false.
          const page = unwrap(await coss.hooks.messages.listDeliveries(app, message_id));
          return ok({
            deliveries: page.data.map(deliverySummary),
            next_cursor: null,
          });
        }
        if (endpoint_id) {
          const page = unwrap(
            await coss.hooks.endpoints.listDeliveries(app, endpoint_id, {
              limit,
              ...(cursor ? { after: cursor } : {}),
            }),
          );
          return ok({
            deliveries: page.data.map(deliverySummary),
            next_cursor: nextCursor(page),
          });
        }
        const endpoints = unwrap(await coss.hooks.endpoints.list(app));
        const deliveries: object[] = [];
        for (const endpoint of endpoints.data) {
          if (deliveries.length >= limit) break;
          const page = unwrap(
            await coss.hooks.endpoints.listDeliveries(app, endpoint.id, {
              limit: limit - deliveries.length,
            }),
          );
          deliveries.push(...page.data.map(deliverySummary));
        }
        return ok({ deliveries: deliveries.slice(0, limit), next_cursor: null });
      }),
  );
}
