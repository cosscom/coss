/**
 * Custom contact properties: typed definitions per environment that contacts' `properties` are
 * validated against, with a `fallback` templates use for contacts without a value.
 */
import { db, type Executor, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, asc, type Column, eq, type SQL, sql } from "drizzle-orm";
import {
  type ContactPropertyObjectOutput,
  type ContactPropertyType,
  type ContactPropertyValueOutput,
  type CreateContactPropertyRequestOutput,
  MAX_CONTACT_PROPERTIES,
  MAX_CONTACT_PROPERTIES_BYTES,
} from "./contact-schemas.ts";
import { ContactError } from "./errors.ts";

const { contact, contactProperty, environment, segment } = schema;

/** What every contact function is scoped by: the API key's (or dashboard page's) environment. */
export type ContactEnvironment = { organizationId: string; environmentId: string };

export type ContactPropertyRow = typeof contactProperty.$inferSelect;

/** `table` rows of `env` (its organization and environment). */
export function inContactEnvironment(
  table: { organizationId: Column; environmentId: Column },
  env: ContactEnvironment,
): SQL {
  return and(
    eq(table.organizationId, env.organizationId),
    eq(table.environmentId, env.environmentId),
  ) as SQL;
}

/** The environment's project (rows store it; it is never taken from the caller). */
export async function environmentProject(
  env: ContactEnvironment,
  executor: Executor = db,
): Promise<string | null> {
  const [row] = await executor
    .select({ projectId: environment.projectId })
    .from(environment)
    .where(
      and(
        eq(environment.id, env.environmentId),
        eq(environment.organizationId, env.organizationId),
      ),
    )
    .limit(1);
  return row?.projectId ?? null;
}

export function toContactPropertyObject(row: ContactPropertyRow): ContactPropertyObjectOutput {
  return {
    object: "contact_property",
    id: row.id,
    key: row.key,
    type: row.type,
    fallback: row.fallback ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function listContactPropertyRows(
  env: ContactEnvironment,
  executor: Executor = db,
): Promise<ContactPropertyRow[]> {
  return executor
    .select()
    .from(contactProperty)
    .where(inContactEnvironment(contactProperty, env))
    .orderBy(asc(contactProperty.key));
}

export async function listContactProperties(
  env: ContactEnvironment,
): Promise<ContactPropertyObjectOutput[]> {
  return (await listContactPropertyRows(env)).map(toContactPropertyObject);
}

async function propertyRow(env: ContactEnvironment, id: string) {
  if (!isId("cprop", id)) return null;
  const [row] = await db
    .select()
    .from(contactProperty)
    .where(and(inContactEnvironment(contactProperty, env), eq(contactProperty.id, id)))
    .limit(1);
  return row ?? null;
}

export async function getContactProperty(
  env: ContactEnvironment,
  id: string,
): Promise<ContactPropertyObjectOutput | null> {
  const row = await propertyRow(env, id);
  return row ? toContactPropertyObject(row) : null;
}

/**
 * The stored form of `value` for a property of `type`, or a message saying why it doesn't fit.
 * Dates are stored as canonical ISO 8601 strings, so they sort and compare as text.
 */
export function coercePropertyValue(
  type: ContactPropertyType,
  value: Exclude<ContactPropertyValueOutput, null>,
): { value: string | number | boolean } | { problem: string } {
  switch (type) {
    case "string":
      return typeof value === "string" ? { value } : { problem: "Must be a string." };
    case "number":
      return typeof value === "number" && Number.isFinite(value)
        ? { value }
        : { problem: "Must be a number." };
    case "boolean":
      return typeof value === "boolean" ? { value } : { problem: "Must be true or false." };
    case "date": {
      if (typeof value !== "string") return { problem: "Must be an ISO 8601 date." };
      const time = Date.parse(value);
      return Number.isNaN(time)
        ? { problem: "Must be an ISO 8601 date, e.g. 2026-10-10 or 2026-10-10T12:00:00Z." }
        : { value: new Date(time).toISOString() };
    }
  }
}

/**
 * `current` with `changes` applied (validated against `definitions`; `null` removes a key).
 * Throws a `ContactError` naming `properties.<key>`.
 */
export function mergeProperties(
  current: Record<string, unknown>,
  changes: Record<string, ContactPropertyValueOutput> | undefined,
  definitions: ReadonlyMap<string, ContactPropertyRow>,
): Record<string, string | number | boolean> {
  const merged = { ...current } as Record<string, string | number | boolean>;
  for (const [key, value] of Object.entries(changes ?? {})) {
    const definition = definitions.get(key);
    if (!definition) {
      throw new ContactError(
        "unknown_property",
        `"${key}" is not a contact property of this environment. Create it first.`,
        { param: `properties.${key}` },
      );
    }
    if (value === null) {
      delete merged[key];
      continue;
    }
    const coerced = coercePropertyValue(definition.type, value);
    if ("problem" in coerced) {
      throw new ContactError("invalid_property", `${key}: ${coerced.problem}`, {
        param: `properties.${key}`,
      });
    }
    merged[key] = coerced.value;
  }
  if (Buffer.byteLength(JSON.stringify(merged)) > MAX_CONTACT_PROPERTIES_BYTES) {
    throw new ContactError(
      "invalid_property",
      `A contact's properties can be at most ${MAX_CONTACT_PROPERTIES_BYTES / 1024} KB.`,
      { param: "properties" },
    );
  }
  return merged;
}

/**
 * The environment's property definitions by key. Contact writers pass `{ forWrite: true }` in
 * their transaction: the definitions they validate against are locked (`FOR SHARE`) until they
 * commit, so a deletion waits for them and strips the values they wrote.
 */
export async function propertyDefinitions(
  env: ContactEnvironment,
  executor: Executor = db,
  opts: { forWrite?: boolean } = {},
): Promise<Map<string, ContactPropertyRow>> {
  const query = executor
    .select()
    .from(contactProperty)
    .where(inContactEnvironment(contactProperty, env))
    .orderBy(asc(contactProperty.key));
  const rows = opts.forWrite ? await query.for("share") : await query;
  return new Map(rows.map((row) => [row.key, row]));
}

function storedFallback(
  type: ContactPropertyType,
  fallback: ContactPropertyValueOutput | undefined,
): string | number | boolean | null {
  if (fallback === undefined || fallback === null) return null;
  const coerced = coercePropertyValue(type, fallback);
  if ("problem" in coerced) {
    throw new ContactError("invalid_property", `fallback: ${coerced.problem}`, {
      param: "fallback",
    });
  }
  return coerced.value;
}

export async function createContactProperty(
  env: ContactEnvironment,
  params: CreateContactPropertyRequestOutput,
): Promise<ContactPropertyObjectOutput> {
  const fallback = storedFallback(params.type, params.fallback);
  return db.transaction(async (tx) => {
    const projectId = await environmentProject(env, tx);
    if (!projectId) throw new ContactError("not_found", "Environment not found.");
    // Serializes creations per environment, so the cap can't be raced past.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`cprop:${env.environmentId}`}))`);
    const [count] = await tx
      .select({ value: sql<number>`count(*)::int` })
      .from(contactProperty)
      .where(inContactEnvironment(contactProperty, env));
    if ((count?.value ?? 0) >= MAX_CONTACT_PROPERTIES) {
      throw new ContactError(
        "too_many_properties",
        `An environment can have at most ${MAX_CONTACT_PROPERTIES} contact properties.`,
      );
    }
    const [row] = await tx
      .insert(contactProperty)
      .values({ ...env, projectId, key: params.key, type: params.type, fallback })
      .onConflictDoNothing({ target: [contactProperty.environmentId, contactProperty.key] })
      .returning();
    if (!row) {
      throw new ContactError("property_exists", `The property "${params.key}" already exists.`, {
        param: "key",
      });
    }
    return toContactPropertyObject(row);
  });
}

/** Only the fallback changes: a property's key and type are fixed (contacts hold its values). */
export async function updateContactProperty(
  env: ContactEnvironment,
  id: string,
  params: { fallback: ContactPropertyValueOutput },
): Promise<ContactPropertyObjectOutput | null> {
  const row = await propertyRow(env, id);
  if (!row) return null;
  const [updated] = await db
    .update(contactProperty)
    .set({ fallback: storedFallback(row.type, params.fallback) })
    .where(and(inContactEnvironment(contactProperty, env), eq(contactProperty.id, id)))
    .returning();
  return updated ? toContactPropertyObject(updated) : null;
}

/**
 * Deletes the property and removes its values from every contact, in one transaction: a failure
 * leaves both, and the key can't be created again (the creation lock) until its old values are
 * gone. Contact writers hold the definition until they commit (`propertyDefinitions`), so their
 * values are stripped too, and later ones refuse the key. Refused while a segment filters on it.
 * Returns whether it existed.
 */
export async function deleteContactProperty(env: ContactEnvironment, id: string): Promise<boolean> {
  const row = await propertyRow(env, id);
  if (!row) return false;
  const [used] = await db
    .select({ name: segment.name })
    .from(segment)
    .where(
      and(
        inContactEnvironment(segment, env),
        sql`jsonb_path_exists(${segment.filter}, '$.** ? (@.field == "property" && @.key == $key)', jsonb_build_object('key', ${row.key}::text))`,
      ),
    )
    .limit(1);
  if (used) {
    throw new ContactError(
      "property_in_use",
      `The segment "${used.name}" filters on "${row.key}": change it first.`,
    );
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`cprop:${env.environmentId}`}))`);
    const [deleted] = await tx
      .delete(contactProperty)
      .where(and(inContactEnvironment(contactProperty, env), eq(contactProperty.id, id)))
      .returning({ key: contactProperty.key });
    if (!deleted) return false;
    await tx.execute(sql`
      update ${contact} set properties = properties - ${deleted.key}::text, updated_at = now()
      where ${contact.organizationId} = ${env.organizationId}
        and ${contact.environmentId} = ${env.environmentId}
        and ${contact.properties} ? ${deleted.key}::text
    `);
    return true;
  });
}
