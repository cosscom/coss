/** Webhook endpoints of an environment, and their delivery log. */
import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { WebhookError } from "./errors.ts";
import { decryptSecret, encryptSecret } from "./secrets.ts";
import { validateWebhookUrl, WebhookUrlError } from "./sender.ts";
import { generateSigningSecret } from "./signing.ts";

const { environment, webhookAttempt, webhookDelivery, webhookEndpoint, webhookMessage } = schema;

export type WebhookEndpointRow = typeof webhookEndpoint.$inferSelect;
export type WebhookDeliveryRow = typeof webhookDelivery.$inferSelect;
export type WebhookAttemptRow = typeof webhookAttempt.$inferSelect;

export const MAX_ENDPOINTS_PER_ENVIRONMENT = 10;
export const DESCRIPTION_MAX_LENGTH = 256;

export type WebhookManagementDeps = {
  /** From `WEBHOOK_SECRETS_KEY` (`parseSecretsKey`). */
  secretsKey: Buffer;
  /** Accept `http:` and private hosts (local development only). */
  allowInsecureUrls: boolean;
};

function checkedUrl(value: string, deps: WebhookManagementDeps): string {
  try {
    return validateWebhookUrl(value.trim(), { allowInsecure: deps.allowInsecureUrls }).href;
  } catch (error) {
    if (error instanceof WebhookUrlError) throw new WebhookError("invalid_url", error.message);
    throw error;
  }
}

/** Creates an endpoint with a new signing secret, which is returned in plain text. */
export async function createWebhookEndpoint(
  input: {
    organizationId: string;
    environmentId: string;
    url: string;
    description?: string | null;
    eventTypes: string[];
    userId: string | null;
  },
  deps: WebhookManagementDeps,
): Promise<{ endpoint: WebhookEndpointRow; secret: string }> {
  const url = checkedUrl(input.url, deps);
  const [env] = await db
    .select({ projectId: environment.projectId })
    .from(environment)
    .where(
      and(
        eq(environment.organizationId, input.organizationId),
        eq(environment.id, input.environmentId),
      ),
    )
    .limit(1);
  if (!env) throw new WebhookError("not_found", "Environment not found.");
  const [existing] = await db
    .select({ value: count() })
    .from(webhookEndpoint)
    .where(
      and(
        eq(webhookEndpoint.organizationId, input.organizationId),
        eq(webhookEndpoint.environmentId, input.environmentId),
      ),
    );
  if ((existing?.value ?? 0) >= MAX_ENDPOINTS_PER_ENVIRONMENT) {
    throw new WebhookError(
      "too_many_endpoints",
      `An environment can have at most ${MAX_ENDPOINTS_PER_ENVIRONMENT} webhook endpoints.`,
    );
  }
  const secret = generateSigningSecret();
  const [endpoint] = await db
    .insert(webhookEndpoint)
    .values({
      organizationId: input.organizationId,
      projectId: env.projectId,
      environmentId: input.environmentId,
      url,
      description: input.description?.trim().slice(0, DESCRIPTION_MAX_LENGTH) || null,
      eventTypes: [...new Set(input.eventTypes)].sort(),
      secretCiphertext: encryptSecret(secret, deps.secretsKey),
      createdByUserId: input.userId,
    })
    .returning();
  if (!endpoint) throw new Error("Webhook endpoint insert returned no row.");
  return { endpoint, secret };
}

export async function listWebhookEndpoints(input: {
  organizationId: string;
  environmentId: string;
}): Promise<WebhookEndpointRow[]> {
  return db
    .select()
    .from(webhookEndpoint)
    .where(
      and(
        eq(webhookEndpoint.organizationId, input.organizationId),
        eq(webhookEndpoint.environmentId, input.environmentId),
      ),
    )
    .orderBy(asc(webhookEndpoint.createdAt));
}

export async function getWebhookEndpoint(input: {
  organizationId: string;
  id: string;
}): Promise<WebhookEndpointRow | null> {
  if (!isId("whep", input.id)) return null;
  const [row] = await db
    .select()
    .from(webhookEndpoint)
    .where(
      and(
        eq(webhookEndpoint.organizationId, input.organizationId),
        eq(webhookEndpoint.id, input.id),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function setWebhookEndpointEnabled(input: {
  organizationId: string;
  id: string;
  enabled: boolean;
}): Promise<void> {
  await db
    .update(webhookEndpoint)
    .set({ enabled: input.enabled })
    .where(
      and(
        eq(webhookEndpoint.organizationId, input.organizationId),
        eq(webhookEndpoint.id, input.id),
      ),
    );
}

export async function deleteWebhookEndpoint(input: {
  organizationId: string;
  id: string;
}): Promise<void> {
  await db
    .delete(webhookEndpoint)
    .where(
      and(
        eq(webhookEndpoint.organizationId, input.organizationId),
        eq(webhookEndpoint.id, input.id),
      ),
    );
}

/** The endpoint's plain-text signing secret. */
export function revealWebhookSecret(endpoint: WebhookEndpointRow, secretsKey: Buffer): string {
  return decryptSecret(endpoint.secretCiphertext, secretsKey);
}

export type WebhookDeliveryLogEntry = WebhookDeliveryRow & {
  eventType: string;
  attempts: WebhookAttemptRow[];
};

/** The endpoint's most recent deliveries, newest first, each with its attempts. */
export async function listWebhookDeliveries(input: {
  organizationId: string;
  endpointId: string;
  limit?: number;
}): Promise<WebhookDeliveryLogEntry[]> {
  const rows = await db
    .select({ delivery: webhookDelivery, eventType: webhookMessage.type })
    .from(webhookDelivery)
    .innerJoin(
      webhookMessage,
      and(
        eq(webhookMessage.id, webhookDelivery.messageId),
        eq(webhookMessage.organizationId, webhookDelivery.organizationId),
      ),
    )
    .where(
      and(
        eq(webhookDelivery.organizationId, input.organizationId),
        eq(webhookDelivery.endpointId, input.endpointId),
      ),
    )
    .orderBy(desc(webhookDelivery.createdAt), desc(webhookDelivery.id))
    .limit(Math.min(input.limit ?? 50, 100));
  if (rows.length === 0) return [];
  const attempts = await db
    .select()
    .from(webhookAttempt)
    .where(
      and(
        eq(webhookAttempt.organizationId, input.organizationId),
        inArray(
          webhookAttempt.deliveryId,
          rows.map((row) => row.delivery.id),
        ),
      ),
    )
    .orderBy(asc(webhookAttempt.attemptedAt));
  return rows.map((row) => ({
    ...row.delivery,
    eventType: row.eventType,
    attempts: attempts.filter((attempt) => attempt.deliveryId === row.delivery.id),
  }));
}

/** The delivery's message payload, as sent. */
export async function getWebhookMessagePayload(input: {
  organizationId: string;
  messageId: string;
}): Promise<Record<string, unknown> | null> {
  const [row] = await db
    .select({ payload: webhookMessage.payload })
    .from(webhookMessage)
    .where(
      and(
        eq(webhookMessage.organizationId, input.organizationId),
        eq(webhookMessage.id, input.messageId),
      ),
    )
    .limit(1);
  return row?.payload ?? null;
}
