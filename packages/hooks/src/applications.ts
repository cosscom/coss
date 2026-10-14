/** Applications: one per customer's end user, addressed by id or the customer's own `uid`. */
import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { HookError } from "./errors.ts";
import { DEFAULT_LIST_LIMIT, type HookApplicationObjectOutput, MAX_LIST_LIMIT } from "./schemas.ts";
import { environmentOf, isUniqueViolation } from "./shared.ts";

const { hookApplication } = schema;

export type HookApplicationRow = typeof hookApplication.$inferSelect;

/** Applications per environment. */
export const MAX_APPLICATIONS = { live: 100_000, sandbox: 100 } as const;

const UID_TAKEN = "hook_application_environment_uid_unique";

export function toHookApplicationObject(row: HookApplicationRow): HookApplicationObjectOutput {
  return {
    object: "hook_application",
    id: row.id,
    uid: row.uid,
    name: row.name,
    metadata: row.metadata,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function uidTaken(uid: string): HookError {
  return new HookError("uid_taken", `Another application already has the uid "${uid}".`, "uid");
}

export async function createHookApplication(input: {
  organizationId: string;
  environmentId: string;
  name: string;
  uid?: string | null;
  metadata?: Record<string, string>;
}): Promise<HookApplicationRow> {
  const env = await environmentOf(input.organizationId, input.environmentId);
  const [existing] = await db
    .select({ value: count() })
    .from(hookApplication)
    .where(
      and(
        eq(hookApplication.organizationId, input.organizationId),
        eq(hookApplication.environmentId, input.environmentId),
      ),
    );
  const max = MAX_APPLICATIONS[env.mode];
  if ((existing?.value ?? 0) >= max) {
    throw new HookError(
      "too_many_applications",
      `A ${env.mode} environment can have at most ${max.toLocaleString("en-US")} applications.`,
    );
  }
  try {
    const [row] = await db
      .insert(hookApplication)
      .values({
        organizationId: input.organizationId,
        projectId: env.projectId,
        environmentId: input.environmentId,
        name: input.name.trim(),
        uid: input.uid ?? null,
        metadata: input.metadata ?? {},
      })
      .returning();
    if (!row) throw new Error("Hook application insert returned no row.");
    return row;
  } catch (error) {
    if (input.uid && isUniqueViolation(error, UID_TAKEN)) throw uidTaken(input.uid);
    throw error;
  }
}

/** The application `ref` (an id, else a uid) names in the environment; `null` when there is none. */
export async function findHookApplication(input: {
  organizationId: string;
  environmentId: string;
  ref: string;
}): Promise<HookApplicationRow | null> {
  const [row] = await db
    .select()
    .from(hookApplication)
    .where(
      and(
        eq(hookApplication.organizationId, input.organizationId),
        eq(hookApplication.environmentId, input.environmentId),
        isId("happ", input.ref)
          ? eq(hookApplication.id, input.ref)
          : eq(hookApplication.uid, input.ref),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Like `findHookApplication`, but a missing application is an `application_not_found` error. */
export async function requireHookApplication(input: {
  organizationId: string;
  environmentId: string;
  ref: string;
}): Promise<HookApplicationRow> {
  const row = await findHookApplication(input);
  if (!row) throw new HookError("application_not_found", "Application not found.");
  return row;
}

/** One page of the environment's applications, newest first. */
export async function pageHookApplications(input: {
  organizationId: string;
  environmentId: string;
  limit?: number;
  after?: string;
}): Promise<{ applications: HookApplicationRow[]; hasMore: boolean }> {
  const limit = Math.min(input.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);
  if (input.after !== undefined && !isId("happ", input.after)) {
    return { applications: [], hasMore: false };
  }
  const scope = and(
    eq(hookApplication.organizationId, input.organizationId),
    eq(hookApplication.environmentId, input.environmentId),
  );
  // Keyset on (created_at, id), compared in SQL: a JS Date would drop the microseconds.
  const afterCursor =
    input.after === undefined
      ? undefined
      : sql`(${hookApplication.createdAt}, ${hookApplication.id}) < (select created_at, id from hook_application where id = ${input.after} and organization_id = ${input.organizationId})`;
  const rows = await db
    .select()
    .from(hookApplication)
    .where(and(scope, afterCursor))
    .orderBy(desc(hookApplication.createdAt), desc(hookApplication.id))
    .limit(limit + 1);
  return { applications: rows.slice(0, limit), hasMore: rows.length > limit };
}

/** Searches the environment's applications by uid or name prefix (the dashboard), newest first. */
export async function searchHookApplications(input: {
  organizationId: string;
  environmentId: string;
  query: string;
  limit?: number;
}): Promise<HookApplicationRow[]> {
  const pattern = `${input.query.replaceAll(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return db
    .select()
    .from(hookApplication)
    .where(
      and(
        eq(hookApplication.organizationId, input.organizationId),
        eq(hookApplication.environmentId, input.environmentId),
        sql`(${hookApplication.uid} ilike ${pattern} or ${hookApplication.name} ilike ${pattern} or ${hookApplication.id} = ${input.query})`,
      ),
    )
    .orderBy(desc(hookApplication.createdAt))
    .limit(Math.min(input.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT));
}

export async function updateHookApplication(input: {
  organizationId: string;
  id: string;
  name?: string;
  uid?: string | null;
  metadata?: Record<string, string>;
}): Promise<HookApplicationRow> {
  const changes = {
    ...(input.name !== undefined && { name: input.name.trim() }),
    ...(input.uid !== undefined && { uid: input.uid }),
    ...(input.metadata !== undefined && { metadata: input.metadata }),
  };
  const where = and(
    eq(hookApplication.organizationId, input.organizationId),
    eq(hookApplication.id, input.id),
  );
  if (Object.keys(changes).length === 0) {
    const [row] = await db.select().from(hookApplication).where(where);
    if (!row) throw new HookError("application_not_found", "Application not found.");
    return row;
  }
  try {
    const [row] = await db.update(hookApplication).set(changes).where(where).returning();
    if (!row) throw new HookError("application_not_found", "Application not found.");
    return row;
  } catch (error) {
    if (input.uid && isUniqueViolation(error, UID_TAKEN)) throw uidTaken(input.uid);
    throw error;
  }
}

/**
 * Deletes the application with its endpoints and portal sessions. Its messages are no longer
 * reachable and leave with their day's partition (`RETENTION_DAYS.hookMessages`).
 */
export async function deleteHookApplication(input: {
  organizationId: string;
  id: string;
}): Promise<boolean> {
  const deleted = await db
    .delete(hookApplication)
    .where(
      and(
        eq(hookApplication.organizationId, input.organizationId),
        eq(hookApplication.id, input.id),
      ),
    )
    .returning({ id: hookApplication.id });
  return deleted.length > 0;
}
