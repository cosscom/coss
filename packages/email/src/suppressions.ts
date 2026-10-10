/**
 * Suppression lists: one per environment. A send skips every recipient with an entry whose scope
 * is `*` or the email's category; permanent bounces and complaints add `*` entries automatically.
 * COSS is the only suppression list: SES tenants are created with suppression turned off.
 */
import { db, type Executor, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { SIMULATOR_DOMAIN } from "./providers/fake.ts";
import {
  ALL_CATEGORIES,
  type CheckSuppressionQueryOutput,
  type CreateSuppressionRequestOutput,
  DEFAULT_SUPPRESSION_LIST_LIMIT,
  type ListSuppressionsQueryOutput,
  MAX_SUPPRESSION_LIST_LIMIT,
  type SuppressionCheckOutput,
  type SuppressionListOutput,
  type SuppressionOutput,
  type SuppressionReason,
} from "./schemas.ts";

const { emailSuppression } = schema;

export type SuppressionRow = typeof emailSuppression.$inferSelect;

/** The environment a suppression list belongs to. */
export type SuppressionEnvironment = { organizationId: string; environmentId: string };

function inEnvironment(env: SuppressionEnvironment) {
  return and(
    eq(emailSuppression.organizationId, env.organizationId),
    eq(emailSuppression.environmentId, env.environmentId),
  );
}

/** Scopes that suppress an email with `category` (`*` alone when it has none). */
function matchingScopes(category: string | null | undefined): string[] {
  return category ? [ALL_CATEGORIES, category] : [ALL_CATEGORIES];
}

export function toSuppressionObject(row: SuppressionRow): SuppressionOutput {
  return {
    object: "suppression",
    id: row.id,
    address: row.address,
    scope: row.scope,
    reason: row.reason,
    email_id: row.emailId,
    created_at: row.createdAt.toISOString(),
  };
}

/**
 * Adds an entry, or returns the existing one for the same address and scope unchanged (adding is
 * idempotent). The project is derived from the environment row, never from the caller.
 */
export async function addSuppression(
  env: SuppressionEnvironment,
  params: CreateSuppressionRequestOutput,
): Promise<{ suppression: SuppressionOutput; created: boolean } | null> {
  const [environment] = await db
    .select({ projectId: schema.environment.projectId })
    .from(schema.environment)
    .where(
      and(
        eq(schema.environment.id, env.environmentId),
        eq(schema.environment.organizationId, env.organizationId),
      ),
    )
    .limit(1);
  if (!environment) return null;
  const [inserted] = await db
    .insert(emailSuppression)
    .values({
      organizationId: env.organizationId,
      projectId: environment.projectId,
      environmentId: env.environmentId,
      address: params.address,
      scope: params.scope,
      reason: "manual",
    })
    .onConflictDoNothing({
      target: [emailSuppression.environmentId, emailSuppression.address, emailSuppression.scope],
    })
    .returning();
  if (inserted) return { suppression: toSuppressionObject(inserted), created: true };
  const [existing] = await db
    .select()
    .from(emailSuppression)
    .where(
      and(
        inEnvironment(env),
        eq(emailSuppression.address, params.address),
        eq(emailSuppression.scope, params.scope),
      ),
    )
    .limit(1);
  // Removed again between the insert and the select: report it as created by this request.
  if (!existing) return addSuppression(env, params);
  return { suppression: toSuppressionObject(existing), created: false };
}

/** Newest first, paginated by the `after` cursor (the last id of the previous page). */
export async function listSuppressions(
  env: SuppressionEnvironment,
  query: ListSuppressionsQueryOutput = {},
): Promise<SuppressionListOutput> {
  const limit = Math.min(query.limit ?? DEFAULT_SUPPRESSION_LIST_LIMIT, MAX_SUPPRESSION_LIST_LIMIT);
  if (query.after !== undefined && !isId("sup", query.after)) {
    return { object: "list", data: [], has_more: false };
  }
  const rows = await db
    .select()
    .from(emailSuppression)
    .where(
      and(
        inEnvironment(env),
        query.address === undefined ? undefined : eq(emailSuppression.address, query.address),
        query.scope === undefined ? undefined : eq(emailSuppression.scope, query.scope),
        // TypeIDs are UUIDv7: id order is creation order.
        query.after === undefined ? undefined : lt(emailSuppression.id, query.after),
      ),
    )
    .orderBy(desc(emailSuppression.id))
    .limit(limit + 1);
  return {
    object: "list",
    data: rows.slice(0, limit).map(toSuppressionObject),
    has_more: rows.length > limit,
  };
}

/** One entry of an environment. Malformed, unknown and foreign ids are all `null`. */
export async function getSuppression(
  env: SuppressionEnvironment,
  id: string,
): Promise<SuppressionOutput | null> {
  if (!isId("sup", id)) return null;
  const [row] = await db
    .select()
    .from(emailSuppression)
    .where(and(inEnvironment(env), eq(emailSuppression.id, id)))
    .limit(1);
  return row ? toSuppressionObject(row) : null;
}

/** Removes an entry; `false` when the environment has no entry with this id. */
export async function removeSuppression(env: SuppressionEnvironment, id: string): Promise<boolean> {
  if (!isId("sup", id)) return false;
  const deleted = await db
    .delete(emailSuppression)
    .where(and(inEnvironment(env), eq(emailSuppression.id, id)))
    .returning({ id: emailSuppression.id });
  return deleted.length > 0;
}

/** Whether a send with `category` would skip `address`, and the entries that match. */
export async function checkSuppression(
  env: SuppressionEnvironment,
  query: CheckSuppressionQueryOutput,
): Promise<SuppressionCheckOutput> {
  const rows = await db
    .select()
    .from(emailSuppression)
    .where(
      and(
        inEnvironment(env),
        eq(emailSuppression.address, query.address),
        inArray(emailSuppression.scope, matchingScopes(query.category)),
      ),
    )
    .orderBy(desc(emailSuppression.id));
  return {
    object: "suppression_check",
    address: query.address,
    suppressed: rows.length > 0,
    suppressions: rows.map(toSuppressionObject),
  };
}

/**
 * The matching entry of each suppressed address among `addresses` (bare, lower-cased) for an email
 * with `category`. A `*` entry wins over a category entry.
 */
export async function suppressedRecipients(
  tx: Executor,
  env: SuppressionEnvironment,
  addresses: string[],
  category: string | null,
): Promise<Map<string, SuppressionRow>> {
  const matches = new Map<string, SuppressionRow>();
  if (addresses.length === 0) return matches;
  const rows = await tx
    .select()
    .from(emailSuppression)
    .where(
      and(
        inEnvironment(env),
        inArray(emailSuppression.address, addresses),
        inArray(emailSuppression.scope, matchingScopes(category)),
      ),
    );
  for (const row of rows) {
    const current = matches.get(row.address);
    if (!current || row.scope === ALL_CATEGORIES) matches.set(row.address, row);
  }
  return matches;
}

/**
 * Adds a `*` entry after a permanent bounce or a complaint (no-op if one exists). Mailbox
 * simulator addresses are never suppressed, like SES, so they keep working for tests.
 */
export async function autoSuppress(
  tx: Executor,
  input: {
    organizationId: string;
    projectId: string;
    environmentId: string;
    address: string;
    reason: Exclude<SuppressionReason, "manual">;
    emailId: string;
  },
): Promise<void> {
  const address = input.address.toLowerCase();
  if (address.endsWith(`@${SIMULATOR_DOMAIN}`)) return;
  await tx
    .insert(emailSuppression)
    .values({
      organizationId: input.organizationId,
      projectId: input.projectId,
      environmentId: input.environmentId,
      address,
      scope: ALL_CATEGORIES,
      reason: input.reason,
      emailId: input.emailId,
    })
    .onConflictDoNothing({
      target: [emailSuppression.environmentId, emailSuppression.address, emailSuppression.scope],
    });
}
