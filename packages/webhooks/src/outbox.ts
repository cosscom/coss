/** The webhook outbox: messages are recorded in the same transaction as the event they announce. */
import { type Executor, schema } from "@coss/db";
import { and, eq } from "drizzle-orm";

const { webhookDelivery, webhookEndpoint, webhookMessage } = schema;

/**
 * Queues `payload` for every enabled endpoint of the environment subscribed to `type`. Runs inside
 * the caller's transaction; idempotent per message id. Returns the number of deliveries queued.
 */
export async function enqueueWebhookMessage(
  tx: Executor,
  message: {
    id: string;
    organizationId: string;
    environmentId: string;
    type: string;
    payload: Record<string, unknown>;
    now?: Date;
  },
): Promise<number> {
  const endpoints = await tx
    .select({ id: webhookEndpoint.id, eventTypes: webhookEndpoint.eventTypes })
    .from(webhookEndpoint)
    .where(
      and(
        eq(webhookEndpoint.organizationId, message.organizationId),
        eq(webhookEndpoint.environmentId, message.environmentId),
        eq(webhookEndpoint.enabled, true),
      ),
    );
  const subscribed = endpoints.filter(
    (endpoint) => endpoint.eventTypes.length === 0 || endpoint.eventTypes.includes(message.type),
  );
  if (subscribed.length === 0) return 0;

  await tx
    .insert(webhookMessage)
    .values({
      id: message.id,
      organizationId: message.organizationId,
      environmentId: message.environmentId,
      type: message.type,
      payload: message.payload,
    })
    .onConflictDoNothing();
  const queued = await tx
    .insert(webhookDelivery)
    .values(
      subscribed.map((endpoint) => ({
        organizationId: message.organizationId,
        messageId: message.id,
        endpointId: endpoint.id,
        nextAttemptAt: message.now ?? new Date(),
      })),
    )
    .onConflictDoNothing({ target: [webhookDelivery.messageId, webhookDelivery.endpointId] })
    .returning({ id: webhookDelivery.id });
  return queued.length;
}
