/** Event types: the catalog of what a customer sends, which end users subscribe from. */
import { db, schema } from "@coss/db";
import { and, asc, count, eq, gt, inArray, isNull } from "drizzle-orm";
import { HookError } from "./errors.ts";
import {
  DEFAULT_LIST_LIMIT,
  EVENT_TYPE_NAME,
  type HookEventTypeObjectOutput,
  MAX_EVENT_TYPE_DOCS_BYTES,
  MAX_LIST_LIMIT,
} from "./schemas.ts";
import { environmentOf, isUniqueViolation, normalizeDescription } from "./shared.ts";

const { hookEventType } = schema;

export type HookEventTypeRow = typeof hookEventType.$inferSelect;

/** Event types per environment. */
export const MAX_EVENT_TYPES = 1000;

export function toHookEventTypeObject(row: HookEventTypeRow): HookEventTypeObjectOutput {
  return {
    object: "hook_event_type",
    name: row.name,
    description: row.description,
    schema: row.schema ?? null,
    examples: row.examples as Record<string, unknown>[],
    archived: row.archivedAt !== null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function checkedDocs(input: { schema?: unknown; examples?: unknown[] }) {
  const size = Buffer.byteLength(JSON.stringify([input.schema ?? null, input.examples ?? []]));
  if (size > MAX_EVENT_TYPE_DOCS_BYTES) {
    throw new HookError(
      "payload_too_large",
      `An event type's schema and examples can be at most ${MAX_EVENT_TYPE_DOCS_BYTES / 1024} KB together.`,
    );
  }
}

export async function createHookEventType(input: {
  organizationId: string;
  environmentId: string;
  name: string;
  description?: string | null;
  schema?: Record<string, unknown> | null;
  examples?: Record<string, unknown>[];
}): Promise<HookEventTypeRow> {
  if (!EVENT_TYPE_NAME.test(input.name)) {
    throw new HookError("invalid_event_type", "Use 1-64 letters, digits and . _ -", "name");
  }
  checkedDocs(input);
  const env = await environmentOf(input.organizationId, input.environmentId);
  const [existing] = await db
    .select({ value: count() })
    .from(hookEventType)
    .where(
      and(
        eq(hookEventType.organizationId, input.organizationId),
        eq(hookEventType.environmentId, input.environmentId),
      ),
    );
  if ((existing?.value ?? 0) >= MAX_EVENT_TYPES) {
    throw new HookError(
      "too_many_event_types",
      `An environment can have at most ${MAX_EVENT_TYPES} event types.`,
    );
  }
  try {
    const [row] = await db
      .insert(hookEventType)
      .values({
        organizationId: input.organizationId,
        projectId: env.projectId,
        environmentId: input.environmentId,
        name: input.name,
        description: normalizeDescription(input.description),
        schema: input.schema ?? null,
        examples: input.examples ?? [],
      })
      .returning();
    if (!row) throw new Error("Hook event type insert returned no row.");
    return row;
  } catch (error) {
    if (isUniqueViolation(error, "hook_event_type_environment_name_unique")) {
      throw new HookError(
        "event_type_exists",
        `The event type ${input.name} already exists.`,
        "name",
      );
    }
    throw error;
  }
}

export async function getHookEventType(input: {
  organizationId: string;
  environmentId: string;
  name: string;
}): Promise<HookEventTypeRow | null> {
  const [row] = await db
    .select()
    .from(hookEventType)
    .where(
      and(
        eq(hookEventType.organizationId, input.organizationId),
        eq(hookEventType.environmentId, input.environmentId),
        eq(hookEventType.name, input.name),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** The environment's event types by name, unarchived ones only unless asked. */
export async function pageHookEventTypes(input: {
  organizationId: string;
  environmentId: string;
  includeArchived?: boolean;
  limit?: number;
  after?: string;
}): Promise<{ eventTypes: HookEventTypeRow[]; hasMore: boolean }> {
  const limit = Math.min(input.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);
  const rows = await db
    .select()
    .from(hookEventType)
    .where(
      and(
        eq(hookEventType.organizationId, input.organizationId),
        eq(hookEventType.environmentId, input.environmentId),
        input.includeArchived ? undefined : isNull(hookEventType.archivedAt),
        input.after === undefined ? undefined : gt(hookEventType.name, input.after),
      ),
    )
    .orderBy(asc(hookEventType.name))
    .limit(limit + 1);
  return { eventTypes: rows.slice(0, limit), hasMore: rows.length > limit };
}

/** Every unarchived event type of the environment, by name (the portal's catalog). */
export async function listHookEventTypes(input: {
  organizationId: string;
  environmentId: string;
}): Promise<HookEventTypeRow[]> {
  return db
    .select()
    .from(hookEventType)
    .where(
      and(
        eq(hookEventType.organizationId, input.organizationId),
        eq(hookEventType.environmentId, input.environmentId),
        isNull(hookEventType.archivedAt),
      ),
    )
    .orderBy(asc(hookEventType.name));
}

export async function updateHookEventType(input: {
  organizationId: string;
  environmentId: string;
  name: string;
  description?: string | null;
  schema?: Record<string, unknown> | null;
  examples?: Record<string, unknown>[];
  archived?: boolean;
  now?: Date;
}): Promise<HookEventTypeRow> {
  const existing = await getHookEventType(input);
  if (!existing) throw new HookError("not_found", `Event type ${input.name} not found.`);
  checkedDocs({
    schema: input.schema === undefined ? existing.schema : input.schema,
    examples: input.examples ?? existing.examples,
  });
  const changes = {
    ...(input.description !== undefined && {
      description: normalizeDescription(input.description),
    }),
    ...(input.schema !== undefined && { schema: input.schema }),
    ...(input.examples !== undefined && { examples: input.examples }),
    ...(input.archived !== undefined && {
      archivedAt: input.archived ? (existing.archivedAt ?? input.now ?? new Date()) : null,
    }),
  };
  if (Object.keys(changes).length === 0) return existing;
  const [row] = await db
    .update(hookEventType)
    .set(changes)
    .where(
      and(
        eq(hookEventType.organizationId, input.organizationId),
        eq(hookEventType.id, existing.id),
      ),
    )
    .returning();
  if (!row) throw new HookError("not_found", `Event type ${input.name} not found.`);
  return row;
}

/**
 * Checks endpoint filter types: every name must be an unarchived event type of the environment.
 * Returns them deduplicated and sorted.
 */
export async function checkedFilterTypes(input: {
  organizationId: string;
  environmentId: string;
  names: readonly string[];
}): Promise<string[]> {
  const names = [...new Set(input.names)].sort();
  if (names.length === 0) return names;
  const found = await db
    .select({ name: hookEventType.name })
    .from(hookEventType)
    .where(
      and(
        eq(hookEventType.organizationId, input.organizationId),
        eq(hookEventType.environmentId, input.environmentId),
        inArray(hookEventType.name, names),
        isNull(hookEventType.archivedAt),
      ),
    );
  const known = new Set(found.map((row) => row.name));
  const unknown = names.filter((name) => !known.has(name));
  if (unknown.length > 0) {
    throw new HookError(
      "unknown_event_type",
      `Unknown or archived event type${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}.`,
      "filter_types",
    );
  }
  return names;
}
