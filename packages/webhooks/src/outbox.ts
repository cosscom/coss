/** The webhook outbox: messages are recorded in the same transaction as the event they announce. */
import { type Executor, schema } from "@coss/db";
import { and, eq, gt } from "drizzle-orm";

const {
  webhookDelivery,
  webhookEndpoint,
  webhookListener,
  webhookListenerDelivery,
  webhookMessage,
} = schema;

/**
 * Queues `payload` for every enabled endpoint of the environment subscribed to `type`, and for its
 * open `coss listen` listeners. Runs inside the caller's transaction; idempotent per message id.
 * Returns the number of endpoint deliveries queued.
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
  // Open at this instant, not at `message.now` (which may be backdated). KEY SHARE keeps the
  // listener row from being deleted under the insert; closing one only moves `expires_at`.
  const listeners = await tx
    .select({ id: webhookListener.id, eventTypes: webhookListener.eventTypes })
    .from(webhookListener)
    .where(
      and(
        eq(webhookListener.organizationId, message.organizationId),
        eq(webhookListener.environmentId, message.environmentId),
        gt(webhookListener.expiresAt, new Date()),
      ),
    )
    .for("key share");
  const subscribes = (target: { eventTypes: string[] }) =>
    target.eventTypes.length === 0 || target.eventTypes.includes(message.type);
  const subscribed = endpoints.filter(subscribes);
  const listening = listeners.filter(subscribes);
  if (subscribed.length === 0 && listening.length === 0) return 0;

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
  if (listening.length > 0) {
    await tx
      .insert(webhookListenerDelivery)
      .values(
        listening.map((listener) => ({
          organizationId: message.organizationId,
          listenerId: listener.id,
          messageId: message.id,
        })),
      )
      .onConflictDoNothing({
        target: [webhookListenerDelivery.messageId, webhookListenerDelivery.listenerId],
      });
  }
  if (subscribed.length === 0) return 0;
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
