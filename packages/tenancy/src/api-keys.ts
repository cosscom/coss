import { defaultKeyHasher } from "@better-auth/api-key";
import { auth } from "@coss/auth";
import { API_KEY_NAME_MAX_LENGTH, API_KEY_PREFIX } from "@coss/auth/constants";
import { db, schema } from "@coss/db";
import { isAPIError } from "better-auth/api";
import { and, desc, eq } from "drizzle-orm";
import { getEnvironmentById } from "./environments.ts";
import { TenancyError } from "./errors.ts";
import type { EnvironmentMode } from "./types.ts";

const { apikey, environment, environmentApiKey, organizationSuspension } = schema;

export type EnvironmentApiKeySummary = {
  id: string;
  name: string | null;
  start: string | null;
  enabled: boolean;
  lastRequest: Date | null;
  createdAt: Date;
  createdByUserId: string | null;
};

/** Resource -> actions, e.g. `{ email: ["send"] }`. */
export type KeyPermissions = Record<string, string[]>;

export type ApiKeyContext = {
  apiKeyId: string;
  organizationId: string;
  projectId: string;
  environmentId: string;
  mode: EnvironmentMode;
};

export type AuthenticateResult =
  | { ok: true; context: ApiKeyContext }
  /** `suspended`: a valid key of an organization a platform admin has suspended. */
  | { ok: false; reason: "invalid" | "forbidden" | "suspended" };

/** Better Auth generates 64 letters after our prefix (see `defaultKeyGenerator`). */
const API_KEY_FORMAT = /^coss_(live|test)_[A-Za-z]{64}$/;

/**
 * Mints an organization-owned key for one environment and binds it. Better Auth checks that
 * `userId` is a member of the organization with `apiKey:create`. The plaintext key is returned
 * exactly once.
 */
export async function createEnvironmentApiKey(input: {
  organizationId: string;
  environmentId: string;
  name: string;
  userId: string;
}): Promise<{ id: string; key: string; start: string | null; name: string }> {
  const env = await getEnvironmentById({
    organizationId: input.organizationId,
    environmentId: input.environmentId,
  });
  if (!env) throw new TenancyError("not_found", "Environment not found.");
  if (await isSuspended(env.organizationId)) {
    throw new TenancyError("forbidden", "This organization is suspended.");
  }

  const name = input.name.trim();
  if (name.length === 0 || name.length > API_KEY_NAME_MAX_LENGTH) {
    throw new TenancyError("invalid", `Key name must be 1-${API_KEY_NAME_MAX_LENGTH} characters.`);
  }

  let created: Awaited<ReturnType<typeof auth.api.createApiKey>>;
  try {
    // No headers: a server call, so Better Auth trusts `userId` but still enforces membership
    // and the org permission. The org always comes from the environment row.
    created = await auth.api.createApiKey({
      body: {
        organizationId: env.organizationId,
        userId: input.userId,
        name,
        prefix: API_KEY_PREFIX[env.mode],
      },
    });
  } catch (error) {
    if (isAPIError(error) && (error.status === "FORBIDDEN" || error.status === "UNAUTHORIZED")) {
      throw new TenancyError(
        "forbidden",
        error.message || "You are not allowed to create API keys in this organization.",
      );
    }
    throw error;
  }

  try {
    await db.insert(environmentApiKey).values({
      apiKeyId: created.id,
      environmentId: env.id,
      createdByUserId: input.userId,
    });
  } catch (error) {
    // Unbound keys are rejected anyway; deleting keeps them from piling up. Best effort only,
    // so the original error is what surfaces.
    await db
      .delete(apikey)
      .where(eq(apikey.id, created.id))
      .catch(() => undefined);
    throw error;
  }

  return { id: created.id, key: created.key, start: created.start ?? null, name };
}

/** Keys bound to an environment, newest first. Never selects the key hash. */
export async function listEnvironmentApiKeys(input: {
  organizationId: string;
  environmentId: string;
}): Promise<EnvironmentApiKeySummary[]> {
  const rows = await db
    .select({
      id: apikey.id,
      name: apikey.name,
      start: apikey.start,
      enabled: apikey.enabled,
      lastRequest: apikey.lastRequest,
      createdAt: apikey.createdAt,
      createdByUserId: environmentApiKey.createdByUserId,
    })
    .from(environmentApiKey)
    .innerJoin(apikey, eq(apikey.id, environmentApiKey.apiKeyId))
    .innerJoin(environment, eq(environment.id, environmentApiKey.environmentId))
    .where(
      and(
        eq(environment.id, input.environmentId),
        eq(environment.organizationId, input.organizationId),
        eq(apikey.referenceId, input.organizationId),
      ),
    )
    .orderBy(desc(apikey.createdAt), desc(apikey.id));
  // `enabled` is nullable in Better Auth's schema; NULL means the default (enabled).
  return rows.map((row) => ({ ...row, enabled: row.enabled !== false }));
}

/** Ownership check before revoking/inspecting a key from the dashboard. */
export async function getKeyBinding(input: {
  organizationId: string;
  keyId: string;
}): Promise<{ apiKeyId: string; environmentId: string; projectId: string } | null> {
  const [row] = await db
    .select({
      apiKeyId: environmentApiKey.apiKeyId,
      environmentId: environment.id,
      projectId: environment.projectId,
    })
    .from(environmentApiKey)
    .innerJoin(apikey, eq(apikey.id, environmentApiKey.apiKeyId))
    .innerJoin(environment, eq(environment.id, environmentApiKey.environmentId))
    .where(
      and(
        eq(environmentApiKey.apiKeyId, input.keyId),
        eq(environment.organizationId, input.organizationId),
        eq(apikey.referenceId, input.organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

function hasPermissions(granted: KeyPermissions | null | undefined, required: KeyPermissions) {
  return Object.entries(required).every(([resource, actions]) => {
    const allowed = granted?.[resource];
    return allowed !== undefined && actions.every((action) => allowed.includes(action));
  });
}

async function isSuspended(organizationId: string): Promise<boolean> {
  const [row] = await db
    .select({ organizationId: organizationSuspension.organizationId })
    .from(organizationSuspension)
    .where(eq(organizationSuspension.organizationId, organizationId))
    .limit(1);
  return row !== undefined;
}

const INVALID: AuthenticateResult = { ok: false, reason: "invalid" };
const FORBIDDEN: AuthenticateResult = { ok: false, reason: "forbidden" };
const SUSPENDED: AuthenticateResult = { ok: false, reason: "suspended" };

/**
 * Authenticates a raw `coss_(live|test)_…` key for the public API. Unknown and unbound keys are
 * rejected with one indexed lookup before Better Auth is involved; Better Auth then enforces
 * enabled/expiry and tracks usage. Keys of a suspended organization are refused. Database errors are thrown (an outage is not a 401).
 */
export async function authenticateApiKey(
  rawKey: string | null | undefined,
  required?: KeyPermissions,
): Promise<AuthenticateResult> {
  if (typeof rawKey !== "string" || !API_KEY_FORMAT.test(rawKey)) return INVALID;

  const hashed = await defaultKeyHasher(rawKey);
  const [row] = await db
    .select({
      apiKeyId: apikey.id,
      enabled: apikey.enabled,
      organizationId: environment.organizationId,
      projectId: environment.projectId,
      environmentId: environment.id,
      mode: environment.mode,
      suspendedAt: organizationSuspension.createdAt,
    })
    .from(apikey)
    .innerJoin(environmentApiKey, eq(environmentApiKey.apiKeyId, apikey.id))
    .innerJoin(environment, eq(environment.id, environmentApiKey.environmentId))
    .leftJoin(
      organizationSuspension,
      eq(organizationSuspension.organizationId, environment.organizationId),
    )
    .where(eq(apikey.key, hashed))
    .limit(1);
  // Better Auth would reject a disabled key too, but logs an error for every attempt.
  if (!row || row.enabled === false) return INVALID;

  const verified = await auth.api.verifyApiKey({ body: { key: rawKey } });
  if (!verified.valid || !verified.key) {
    // Key problems (disabled, expired, exhausted…) have their own codes. Better Auth also reports
    // internal failures inside verify (e.g. a failed UPDATE) as INVALID_API_KEY, so re-read the row:
    // a key that still looks valid hit an internal error, which must surface as a retryable 503.
    if (verified.error?.code !== "INVALID_API_KEY") return INVALID;
    const [current] = await db
      .select({ enabled: apikey.enabled, expiresAt: apikey.expiresAt })
      .from(apikey)
      .where(eq(apikey.id, row.apiKeyId))
      .limit(1);
    if (!current || current.enabled === false) return INVALID;
    if (current.expiresAt && current.expiresAt.getTime() <= Date.now()) return INVALID;
    throw new Error("API key verification failed unexpectedly; see the Better Auth error log.");
  }
  const key = verified.key;

  // Fail closed if the key, its organization and its environment's mode disagree.
  const prefix = API_KEY_PREFIX[row.mode];
  if (
    key.id !== row.apiKeyId ||
    key.referenceId !== row.organizationId ||
    key.prefix !== prefix ||
    !rawKey.startsWith(prefix)
  ) {
    return INVALID;
  }

  // Checked only once the key itself is proven valid, so a guessed key learns nothing.
  if (row.suspendedAt !== null) return SUSPENDED;
  if (required && !hasPermissions(key.permissions, required)) return FORBIDDEN;

  const { apiKeyId, organizationId, projectId, environmentId, mode } = row;
  return { ok: true, context: { apiKeyId, organizationId, projectId, environmentId, mode } };
}
