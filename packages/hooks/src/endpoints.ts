/** Endpoints: an end user's URLs that receive an application's messages, each with its own secret. */
import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { decryptSecret, encryptSecret, generateSigningSecret } from "@coss/webhooks";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { HookError } from "./errors.ts";
import { checkedFilterTypes } from "./event-types.ts";
import {
  DEFAULT_PREVIOUS_SECRET_EXPIRES_IN,
  type HookEndpointDisabledReason,
  type HookEndpointObjectOutput,
  MAX_PREVIOUS_SECRET_EXPIRES_IN,
  MAX_RATE_LIMIT_PER_SECOND,
} from "./schemas.ts";
import {
  checkedUrl,
  environmentOf,
  type HookManagementDeps,
  normalizeDescription,
} from "./shared.ts";

const { hookEndpoint } = schema;

export type HookEndpointRow = typeof hookEndpoint.$inferSelect;

/** Endpoints per application. */
export const MAX_ENDPOINTS = { live: 50, sandbox: 5 } as const;

const SECRET = /^whsec_([A-Za-z0-9+/]+={0,2})$/;

/** When the previous secret stops signing; `null` when none signs any more. */
export function previousSecretExpiresAt(row: HookEndpointRow, now = new Date()): Date | null {
  const expiresAt = row.previousSecretExpiresAt;
  return row.previousSecretCiphertext !== null && expiresAt !== null && expiresAt > now
    ? expiresAt
    : null;
}

/** The endpoint's wire representation. Never includes a secret. */
export function toHookEndpointObject(row: HookEndpointRow): HookEndpointObjectOutput {
  return {
    object: "hook_endpoint",
    id: row.id,
    application_id: row.applicationId,
    url: row.url,
    description: row.description,
    filter_types: row.filterTypes,
    rate_limit_per_second: row.rateLimitPerSecond,
    enabled: row.enabled,
    disabled_reason: row.disabledReason as HookEndpointDisabledReason | null,
    disabled_at: row.disabledAt?.toISOString() ?? null,
    failing_since: row.failingSince?.toISOString() ?? null,
    previous_secret_expires_at: previousSecretExpiresAt(row)?.toISOString() ?? null,
    metadata: row.metadata,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

/** A customer-supplied `whsec_` secret of 24-64 bytes (e.g. migrated from another provider). */
function checkedSecret(value: string): string {
  const match = SECRET.exec(value);
  const bytes = match?.[1] ? Buffer.from(match[1], "base64").length : 0;
  if (!match || bytes < 24 || bytes > 64) {
    throw new HookError(
      "invalid_secret",
      "A secret is `whsec_` followed by 24-64 bytes in base64.",
      "secret",
    );
  }
  return value;
}

function checkedRateLimit(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || value < 1 || value > MAX_RATE_LIMIT_PER_SECOND) {
    throw new RangeError(`rate_limit_per_second must be 1-${MAX_RATE_LIMIT_PER_SECOND}.`);
  }
  return value;
}

export async function createHookEndpoint(
  input: {
    organizationId: string;
    environmentId: string;
    applicationId: string;
    url: string;
    description?: string | null;
    filterTypes?: readonly string[];
    secret?: string;
    rateLimitPerSecond?: number | null;
    metadata?: Record<string, string>;
    enabled?: boolean;
    now?: Date;
  },
  deps: HookManagementDeps,
): Promise<{ endpoint: HookEndpointRow; secret: string }> {
  const url = checkedUrl(input.url, deps);
  const secret = input.secret === undefined ? generateSigningSecret() : checkedSecret(input.secret);
  const env = await environmentOf(input.organizationId, input.environmentId);
  const filterTypes = await checkedFilterTypes({
    organizationId: input.organizationId,
    environmentId: input.environmentId,
    names: input.filterTypes ?? [],
  });
  const [existing] = await db
    .select({ value: count() })
    .from(hookEndpoint)
    .where(
      and(
        eq(hookEndpoint.organizationId, input.organizationId),
        eq(hookEndpoint.applicationId, input.applicationId),
      ),
    );
  const max = MAX_ENDPOINTS[env.mode];
  if ((existing?.value ?? 0) >= max) {
    throw new HookError(
      "too_many_endpoints",
      `An application can have at most ${max} endpoints in a ${env.mode} environment.`,
    );
  }
  const enabled = input.enabled ?? true;
  const [endpoint] = await db
    .insert(hookEndpoint)
    .values({
      organizationId: input.organizationId,
      projectId: env.projectId,
      environmentId: input.environmentId,
      applicationId: input.applicationId,
      url,
      description: normalizeDescription(input.description),
      filterTypes,
      secretCiphertext: encryptSecret(secret, deps.secretsKeys),
      rateLimitPerSecond: checkedRateLimit(input.rateLimitPerSecond),
      enabled,
      disabledReason: enabled ? null : "manual",
      disabledAt: enabled ? null : (input.now ?? new Date()),
      metadata: input.metadata ?? {},
    })
    .returning();
  if (!endpoint) throw new Error("Hook endpoint insert returned no row.");
  return { endpoint, secret };
}

/** The application's endpoints, oldest first. */
export async function listHookEndpoints(input: {
  organizationId: string;
  applicationId: string;
}): Promise<HookEndpointRow[]> {
  return db
    .select()
    .from(hookEndpoint)
    .where(
      and(
        eq(hookEndpoint.organizationId, input.organizationId),
        eq(hookEndpoint.applicationId, input.applicationId),
      ),
    )
    .orderBy(asc(hookEndpoint.createdAt), asc(hookEndpoint.id));
}

/** The application's endpoint `id`; `null` when it belongs to another application (or none). */
export async function getHookEndpoint(input: {
  organizationId: string;
  applicationId: string;
  id: string;
}): Promise<HookEndpointRow | null> {
  if (!isId("hep", input.id)) return null;
  const [row] = await db
    .select()
    .from(hookEndpoint)
    .where(
      and(
        eq(hookEndpoint.organizationId, input.organizationId),
        eq(hookEndpoint.applicationId, input.applicationId),
        eq(hookEndpoint.id, input.id),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Switching an endpoint on clears why it was off and its failure streak; switching it off by hand
 * records `manual` (an endpoint already off keeps its reason and time).
 */
function enabledChanges(enabled: boolean) {
  return enabled
    ? {
        enabled: true,
        disabledReason: null,
        disabledAt: null,
        failingSince: sql<Date | null>`case when ${hookEndpoint.enabled} then ${hookEndpoint.failingSince} end`,
      }
    : {
        enabled: false,
        disabledReason: sql<string>`case when ${hookEndpoint.enabled} then 'manual' else ${hookEndpoint.disabledReason} end`,
        disabledAt: sql<Date>`case when ${hookEndpoint.enabled} then now() else ${hookEndpoint.disabledAt} end`,
      };
}

/** Changes the fields given; the secret never changes here (see `rollHookEndpointSecret`). */
export async function updateHookEndpoint(
  input: {
    organizationId: string;
    environmentId: string;
    applicationId: string;
    id: string;
    url?: string;
    description?: string | null;
    filterTypes?: readonly string[];
    rateLimitPerSecond?: number | null;
    metadata?: Record<string, string>;
    enabled?: boolean;
  },
  deps: Pick<HookManagementDeps, "allowInsecureUrls">,
): Promise<HookEndpointRow> {
  const changes = {
    ...(input.url !== undefined && { url: checkedUrl(input.url, deps) }),
    ...(input.description !== undefined && {
      description: normalizeDescription(input.description),
    }),
    ...(input.filterTypes !== undefined && {
      filterTypes: await checkedFilterTypes({
        organizationId: input.organizationId,
        environmentId: input.environmentId,
        names: input.filterTypes,
      }),
    }),
    ...(input.rateLimitPerSecond !== undefined && {
      rateLimitPerSecond: checkedRateLimit(input.rateLimitPerSecond),
    }),
    ...(input.metadata !== undefined && { metadata: input.metadata }),
    ...(input.enabled !== undefined && enabledChanges(input.enabled)),
  };
  if (Object.keys(changes).length === 0) {
    const existing = await getHookEndpoint(input);
    if (!existing) throw new HookError("not_found", "Endpoint not found.");
    return existing;
  }
  const [updated] = await db
    .update(hookEndpoint)
    .set(changes)
    .where(
      and(
        eq(hookEndpoint.organizationId, input.organizationId),
        eq(hookEndpoint.applicationId, input.applicationId),
        eq(hookEndpoint.id, input.id),
      ),
    )
    .returning();
  if (!updated) throw new HookError("not_found", "Endpoint not found.");
  return updated;
}

/** Deletes the endpoint. Its pending deliveries fail at their next attempt; history stays. */
export async function deleteHookEndpoint(input: {
  organizationId: string;
  applicationId: string;
  id: string;
}): Promise<boolean> {
  const deleted = await db
    .delete(hookEndpoint)
    .where(
      and(
        eq(hookEndpoint.organizationId, input.organizationId),
        eq(hookEndpoint.applicationId, input.applicationId),
        eq(hookEndpoint.id, input.id),
      ),
    )
    .returning({ id: hookEndpoint.id });
  return deleted.length > 0;
}

/**
 * Replaces the signing secret with a new one, returned in plain text. The current one keeps
 * signing next to it for `previousSecretExpiresIn` seconds (default a day; 0 drops it now).
 */
export async function rollHookEndpointSecret(
  input: {
    organizationId: string;
    applicationId: string;
    id: string;
    previousSecretExpiresIn?: number;
    now?: Date;
  },
  deps: Pick<HookManagementDeps, "secretsKeys">,
): Promise<{ endpoint: HookEndpointRow; secret: string }> {
  const expiresIn = input.previousSecretExpiresIn ?? DEFAULT_PREVIOUS_SECRET_EXPIRES_IN;
  if (!Number.isInteger(expiresIn) || expiresIn < 0 || expiresIn > MAX_PREVIOUS_SECRET_EXPIRES_IN) {
    throw new RangeError(
      `previousSecretExpiresIn must be an integer from 0 to ${MAX_PREVIOUS_SECRET_EXPIRES_IN}.`,
    );
  }
  const secret = generateSigningSecret();
  const keep = expiresIn > 0;
  const now = input.now ?? new Date();
  // One statement: SET reads the row as it was, so racing rolls never lose the current secret.
  const [endpoint] = await db
    .update(hookEndpoint)
    .set({
      secretCiphertext: encryptSecret(secret, deps.secretsKeys),
      previousSecretCiphertext: keep ? sql`${hookEndpoint.secretCiphertext}` : null,
      previousSecretExpiresAt: keep ? new Date(now.getTime() + expiresIn * 1000) : null,
    })
    .where(
      and(
        eq(hookEndpoint.organizationId, input.organizationId),
        eq(hookEndpoint.applicationId, input.applicationId),
        eq(hookEndpoint.id, input.id),
      ),
    )
    .returning();
  if (!endpoint) throw new HookError("not_found", "Endpoint not found.");
  return { endpoint, secret };
}

/** The endpoint's plain-text signing secret. */
export function revealHookEndpointSecret(
  endpoint: HookEndpointRow,
  deps: Pick<HookManagementDeps, "secretsKeys">,
): string {
  return decryptSecret(endpoint.secretCiphertext, deps.secretsKeys);
}

/** The secrets that sign a request made at `now`: the current one, then an unexpired previous one. */
export function hookSigningSecrets(
  endpoint: HookEndpointRow,
  deps: Pick<HookManagementDeps, "secretsKeys">,
  now: Date,
): [string, ...string[]] {
  const current = decryptSecret(endpoint.secretCiphertext, deps.secretsKeys);
  const previous =
    previousSecretExpiresAt(endpoint, now) && endpoint.previousSecretCiphertext
      ? decryptSecret(endpoint.previousSecretCiphertext, deps.secretsKeys)
      : null;
  return previous === null ? [current] : [current, previous];
}
