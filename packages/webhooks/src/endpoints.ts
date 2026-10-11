/** Webhook endpoints of an environment, and their delivery log. */
import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { WebhookError } from "./errors.ts";
import {
  DEFAULT_DELIVERY_LIST_LIMIT,
  DESCRIPTION_MAX_LENGTH,
  MAX_DELIVERY_LIST_LIMIT,
  type WebhookDeliveryObjectOutput,
  type WebhookEndpointObjectOutput,
} from "./schemas.ts";
import { decryptSecret, encryptSecret } from "./secrets.ts";
import { validateWebhookUrl, WebhookUrlError } from "./sender.ts";
import { generateSigningSecret } from "./signing.ts";

const { environment, webhookAttempt, webhookDelivery, webhookEndpoint, webhookMessage } = schema;

export type WebhookEndpointRow = typeof webhookEndpoint.$inferSelect;
export type WebhookDeliveryRow = typeof webhookDelivery.$inferSelect;
export type WebhookAttemptRow = typeof webhookAttempt.$inferSelect;

export const MAX_ENDPOINTS_PER_ENVIRONMENT = 10;

export type WebhookManagementDeps = {
  /** From `WEBHOOK_SECRETS_KEY` (`parseSecretsKey`). */
  secretsKey: Buffer;
  /** Accept `http:` and private hosts (local development only). */
  allowInsecureUrls: boolean;
};

/** The endpoint's public wire representation. Never includes the signing secret. */
export function toWebhookEndpointObject(row: WebhookEndpointRow): WebhookEndpointObjectOutput {
  return {
    object: "webhook_endpoint",
    id: row.id,
    url: row.url,
    description: row.description,
    event_types: row.eventTypes,
    enabled: row.enabled,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function normalizeDescription(value: string | null | undefined): string | null {
  return value?.trim().slice(0, DESCRIPTION_MAX_LENGTH) || null;
}

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
      description: normalizeDescription(input.description),
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

/**
 * Changes an endpoint's URL, description, subscribed event types or enabled flag. Fields left
 * `undefined` keep their current value; `description: null` clears it. The signing secret never
 * changes, so existing receivers keep verifying deliveries.
 */
export async function updateWebhookEndpoint(
  input: {
    organizationId: string;
    id: string;
    url?: string;
    description?: string | null;
    eventTypes?: string[];
    enabled?: boolean;
  },
  deps: WebhookManagementDeps,
): Promise<WebhookEndpointRow> {
  const changes = {
    ...(input.url !== undefined && { url: checkedUrl(input.url, deps) }),
    ...(input.description !== undefined && {
      description: normalizeDescription(input.description),
    }),
    ...(input.eventTypes !== undefined && { eventTypes: [...new Set(input.eventTypes)].sort() }),
    ...(input.enabled !== undefined && { enabled: input.enabled }),
  };
  const scope = and(
    eq(webhookEndpoint.organizationId, input.organizationId),
    eq(webhookEndpoint.id, input.id),
  );
  // An update with nothing to change still has to report a missing endpoint (Drizzle refuses an
  // empty SET), so read the row instead of writing.
  if (Object.keys(changes).length === 0) {
    const existing = await getWebhookEndpoint(input);
    if (!existing) throw new WebhookError("not_found", "Webhook endpoint not found.");
    return existing;
  }
  const [updated] = await db.update(webhookEndpoint).set(changes).where(scope).returning();
  if (!updated) throw new WebhookError("not_found", "Webhook endpoint not found.");
  return updated;
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

export type WebhookDeliveryWithPayload = WebhookDeliveryLogEntry & {
  payload: Record<string, unknown>;
};

/** The delivery's public wire representation. */
export function toWebhookDeliveryObject(
  entry: WebhookDeliveryWithPayload,
): WebhookDeliveryObjectOutput {
  return {
    object: "webhook_delivery",
    id: entry.id,
    endpoint_id: entry.endpointId,
    event_id: entry.messageId,
    event_type: entry.eventType,
    status: entry.status,
    attempt_count: entry.attemptCount,
    next_attempt_at: entry.nextAttemptAt?.toISOString() ?? null,
    last_status_code: entry.lastStatusCode,
    last_error: entry.lastError,
    payload: entry.payload,
    attempts: entry.attempts.map((attempt) => ({
      object: "webhook_attempt",
      id: attempt.id,
      attempted_at: attempt.attemptedAt.toISOString(),
      status_code: attempt.statusCode,
      duration_ms: attempt.durationMs,
      error: attempt.error,
      response_excerpt: attempt.responseExcerpt,
    })),
    created_at: entry.createdAt.toISOString(),
    updated_at: entry.updatedAt.toISOString(),
  };
}

const cursor = alias(webhookDelivery, "cursor");

/**
 * A page of the endpoint's deliveries, newest first, each with its attempts and payload. `after`
 * is the id of the last delivery of the previous page; an unknown or foreign one yields nothing.
 */
export async function pageWebhookDeliveries(input: {
  organizationId: string;
  endpointId: string;
  status?: WebhookDeliveryRow["status"];
  eventId?: string;
  limit?: number;
  after?: string;
}): Promise<{ deliveries: WebhookDeliveryWithPayload[]; hasMore: boolean }> {
  const limit = Math.min(input.limit ?? DEFAULT_DELIVERY_LIST_LIMIT, MAX_DELIVERY_LIST_LIMIT);
  if (input.after !== undefined && !isId("whdel", input.after)) {
    return { deliveries: [], hasMore: false };
  }
  const scope = and(
    eq(webhookDelivery.organizationId, input.organizationId),
    eq(webhookDelivery.endpointId, input.endpointId),
  );
  // Keyset on (created_at, id), compared in SQL: a JS Date would drop the microseconds.
  const afterCursor =
    input.after === undefined
      ? undefined
      : sql`(${webhookDelivery.createdAt}, ${webhookDelivery.id}) < (${db
          .select({ createdAt: cursor.createdAt, id: cursor.id })
          .from(cursor)
          .where(
            and(
              eq(cursor.organizationId, input.organizationId),
              eq(cursor.endpointId, input.endpointId),
              eq(cursor.id, input.after),
            ),
          )})`;
  const rows = await db
    .select({
      delivery: webhookDelivery,
      eventType: webhookMessage.type,
      payload: webhookMessage.payload,
    })
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
        scope,
        input.status === undefined ? undefined : eq(webhookDelivery.status, input.status),
        input.eventId === undefined ? undefined : eq(webhookDelivery.messageId, input.eventId),
        afterCursor,
      ),
    )
    .orderBy(desc(webhookDelivery.createdAt), desc(webhookDelivery.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  if (page.length === 0) return { deliveries: [], hasMore: false };
  const attempts = await db
    .select()
    .from(webhookAttempt)
    .where(
      and(
        eq(webhookAttempt.organizationId, input.organizationId),
        inArray(
          webhookAttempt.deliveryId,
          page.map((row) => row.delivery.id),
        ),
      ),
    )
    .orderBy(asc(webhookAttempt.attemptedAt), asc(webhookAttempt.id));
  return {
    deliveries: page.map((row) => ({
      ...row.delivery,
      eventType: row.eventType,
      payload: row.payload,
      attempts: attempts.filter((attempt) => attempt.deliveryId === row.delivery.id),
    })),
    hasMore: rows.length > limit,
  };
}

/** The endpoint's most recent deliveries, newest first, each with its attempts. */
export async function listWebhookDeliveries(input: {
  organizationId: string;
  endpointId: string;
  limit?: number;
}): Promise<WebhookDeliveryWithPayload[]> {
  return (await pageWebhookDeliveries(input)).deliveries;
}

/** One delivery of an endpoint. Malformed, unknown and foreign ids are all `null`. */
export async function getWebhookDelivery(input: {
  organizationId: string;
  endpointId: string;
  id: string;
}): Promise<WebhookDeliveryWithPayload | null> {
  if (!isId("whdel", input.id)) return null;
  const [row] = await db
    .select({
      delivery: webhookDelivery,
      eventType: webhookMessage.type,
      payload: webhookMessage.payload,
    })
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
        eq(webhookDelivery.id, input.id),
      ),
    )
    .limit(1);
  if (!row) return null;
  const attempts = await db
    .select()
    .from(webhookAttempt)
    .where(
      and(
        eq(webhookAttempt.organizationId, input.organizationId),
        eq(webhookAttempt.deliveryId, row.delivery.id),
      ),
    )
    .orderBy(asc(webhookAttempt.attemptedAt), asc(webhookAttempt.id));
  return { ...row.delivery, eventType: row.eventType, payload: row.payload, attempts };
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
