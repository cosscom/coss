/** Webhook endpoints of an environment, and their delivery log. */
import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { versioning } from "@coss/versioning";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { WebhookError } from "./errors.ts";
import {
  DEFAULT_DELIVERY_LIST_LIMIT,
  DEFAULT_PREVIOUS_SECRET_EXPIRES_IN,
  DESCRIPTION_MAX_LENGTH,
  MAX_DELIVERY_LIST_LIMIT,
  MAX_PREVIOUS_SECRET_EXPIRES_IN,
  type WebhookDeliveryObjectOutput,
  type WebhookEndpointObjectOutput,
} from "./schemas.ts";
import { decryptSecret, encryptSecret, type SecretsKeyRing } from "./secrets.ts";
import { validateWebhookUrl, WebhookUrlError } from "./sender.ts";
import { generateSigningSecret } from "./signing.ts";

const { environment, webhookAttempt, webhookDelivery, webhookEndpoint, webhookMessage } = schema;

export type WebhookEndpointRow = typeof webhookEndpoint.$inferSelect;
export type WebhookDeliveryRow = typeof webhookDelivery.$inferSelect;
export type WebhookAttemptRow = typeof webhookAttempt.$inferSelect;

export const MAX_ENDPOINTS_PER_ENVIRONMENT = 10;

/**
 * The organization's plan, as webhook management needs it: structurally `@coss/billing`'s
 * `PlanGate` (webhooks can't depend on billing, which sends its events through them).
 */
export type WebhookPlanLimits = {
  requireFeature(organizationId: string, feature: "logDrains"): Promise<void>;
  limit(organizationId: string, limit: "webhookEndpointsPerEnvironment"): Promise<number | null>;
};

export type WebhookManagementDeps = {
  /** From `WEBHOOK_SECRETS_KEY` (`parseSecretsKeys`). */
  secretsKeys: SecretsKeyRing;
  /** Accept `http:` and private hosts (local development only). */
  allowInsecureUrls: boolean;
  /** The organization's plan (endpoints per environment, log drains); unset: not limited. */
  plans?: WebhookPlanLimits;
};

/** When the endpoint's previous secret stops signing; `null` when none signs any more. */
export function previousSecretExpiresAt(row: WebhookEndpointRow, now = new Date()): Date | null {
  const expiresAt = row.previousSecretExpiresAt;
  return row.previousSecretCiphertext !== null && expiresAt !== null && expiresAt > now
    ? expiresAt
    : null;
}

/** The endpoint's public wire representation. Never includes a signing secret. */
export function toWebhookEndpointObject(row: WebhookEndpointRow): WebhookEndpointObjectOutput {
  return {
    object: "webhook_endpoint",
    id: row.id,
    url: row.url,
    description: row.description,
    event_types: row.eventTypes,
    api_version: row.apiVersion,
    enabled: row.enabled,
    previous_secret_expires_at: previousSecretExpiresAt(row)?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function normalizeDescription(value: string | null | undefined): string | null {
  return value?.trim().slice(0, DESCRIPTION_MAX_LENGTH) || null;
}

function checkedApiVersion(value: string): string {
  if (!versioning.isVersion(value)) {
    throw new WebhookError(
      "invalid_api_version",
      `Unknown API version ${value}. Known versions: ${versioning.versions.join(", ")}.`,
    );
  }
  return value;
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
    /** Usually the version of the request creating the endpoint (or the organization's pin). */
    apiVersion: string;
    userId: string | null;
  },
  deps: WebhookManagementDeps,
): Promise<{ endpoint: WebhookEndpointRow; secret: string }> {
  const url = checkedUrl(input.url, deps);
  const apiVersion = checkedApiVersion(input.apiVersion);
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
  // The plan's limit, which a contract may raise above the default.
  const limit = deps.plans
    ? ((await deps.plans.limit(input.organizationId, "webhookEndpointsPerEnvironment")) ??
      Number.POSITIVE_INFINITY)
    : MAX_ENDPOINTS_PER_ENVIRONMENT;
  if ((existing?.value ?? 0) >= limit) {
    throw new WebhookError(
      "too_many_endpoints",
      deps.plans && limit < MAX_ENDPOINTS_PER_ENVIRONMENT
        ? `Your plan allows ${limit} webhook endpoints per environment. Upgrade to add more.`
        : `An environment can have at most ${limit} webhook endpoints.`,
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
      apiVersion,
      secretCiphertext: encryptSecret(secret, deps.secretsKeys),
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
 * Changes an endpoint's URL, description, subscribed event types, API version or enabled flag. Fields left
 * `undefined` keep their current value; `description: null` clears it. The signing secret never
 * changes here (see `rollWebhookEndpointSecret`), so existing receivers keep verifying deliveries.
 */
export async function updateWebhookEndpoint(
  input: {
    organizationId: string;
    id: string;
    url?: string;
    description?: string | null;
    eventTypes?: string[];
    apiVersion?: string;
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
    ...(input.apiVersion !== undefined && { apiVersion: checkedApiVersion(input.apiVersion) }),
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

/**
 * Replaces the endpoint's signing secret with a new one, returned in plain text. The current
 * secret becomes the previous one and keeps signing deliveries, next to the new one, for
 * `previousSecretExpiresIn` seconds (default a day; 0 drops it now), so receivers can switch
 * without rejecting anything. Rolling again during that time drops the older previous secret.
 */
export async function rollWebhookEndpointSecret(
  input: { organizationId: string; id: string; previousSecretExpiresIn?: number },
  deps: Pick<WebhookManagementDeps, "secretsKeys">,
): Promise<{ endpoint: WebhookEndpointRow; secret: string }> {
  const expiresIn = input.previousSecretExpiresIn ?? DEFAULT_PREVIOUS_SECRET_EXPIRES_IN;
  if (!Number.isInteger(expiresIn) || expiresIn < 0 || expiresIn > MAX_PREVIOUS_SECRET_EXPIRES_IN) {
    throw new RangeError(
      `previousSecretExpiresIn must be an integer from 0 to ${MAX_PREVIOUS_SECRET_EXPIRES_IN}.`,
    );
  }
  const secret = generateSigningSecret();
  const keep = expiresIn > 0;
  // One statement: SET reads the row as it was, so the current secret moves to `previous` even
  // when two rolls race.
  const [endpoint] = await db
    .update(webhookEndpoint)
    .set({
      secretCiphertext: encryptSecret(secret, deps.secretsKeys),
      previousSecretCiphertext: keep ? sql`${webhookEndpoint.secretCiphertext}` : null,
      previousSecretExpiresAt: keep ? new Date(Date.now() + expiresIn * 1000) : null,
    })
    .where(
      and(
        eq(webhookEndpoint.organizationId, input.organizationId),
        eq(webhookEndpoint.id, input.id),
      ),
    )
    .returning();
  if (!endpoint) throw new WebhookError("not_found", "Webhook endpoint not found.");
  return { endpoint, secret };
}

/** The endpoint's plain-text signing secret. */
export function revealWebhookSecret(endpoint: WebhookEndpointRow, keys: SecretsKeyRing): string {
  return decryptSecret(endpoint.secretCiphertext, keys);
}

/** The secrets that sign a delivery made at `now`: the current one, then an unexpired previous one. */
export function signingSecrets(
  endpoint: WebhookEndpointRow,
  keys: SecretsKeyRing,
  now: Date,
): [string, ...string[]] {
  const current = decryptSecret(endpoint.secretCiphertext, keys);
  const previous =
    previousSecretExpiresAt(endpoint, now) && endpoint.previousSecretCiphertext
      ? decryptSecret(endpoint.previousSecretCiphertext, keys)
      : null;
  return previous === null ? [current] : [current, previous];
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
    // Matches the (endpoint_id, created_at DESC NULLS LAST) index.
    .orderBy(sql`${webhookDelivery.createdAt} desc nulls last`, desc(webhookDelivery.id))
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

/** The delivery's message payload as stored (the latest API version; see `renderWebhookPayload`). */
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
