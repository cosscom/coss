/**
 * Audiences: static lists of contacts. Members are added and removed explicitly; segments
 * (`segments.ts`) are the dynamic counterpart, and can filter on audience membership.
 */
import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { assertNoBroadcastUses } from "./broadcast-references.ts";
import {
  type ContactEnvironment,
  environmentProject,
  inContactEnvironment,
  lockSegmentReferences,
} from "./contact-properties.ts";
import {
  type AudienceOutput,
  type ContactListOutput,
  DEFAULT_CONTACT_LIST_LIMIT,
  type ListQueryOutput,
} from "./contact-schemas.ts";
import { toContactObject } from "./contacts.ts";
import { ContactError } from "./errors.ts";
import { addressKey } from "./schemas.ts";

const { audience, audienceMember, contact, segment } = schema;

export type AudienceRow = typeof audience.$inferSelect;

function memberCount() {
  return sql<number>`(
    select count(*)::int from ${audienceMember}
    where ${audienceMember.audienceId} = ${audience.id}
      and ${audienceMember.organizationId} = ${audience.organizationId}
  )`;
}

function toAudienceObject(row: AudienceRow & { contactCount: number }): AudienceOutput {
  return {
    object: "audience",
    id: row.id,
    name: row.name,
    contact_count: row.contactCount,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

const withCount = {
  id: audience.id,
  organizationId: audience.organizationId,
  projectId: audience.projectId,
  environmentId: audience.environmentId,
  name: audience.name,
  createdAt: audience.createdAt,
  updatedAt: audience.updatedAt,
  contactCount: memberCount(),
};

/** A page of the environment's audiences, newest first (ids are time-ordered). */
export async function listAudiences(
  env: ContactEnvironment,
  query: ListQueryOutput,
): Promise<{ object: "list"; data: AudienceOutput[]; has_more: boolean }> {
  const limit = query.limit ?? DEFAULT_CONTACT_LIST_LIMIT;
  const rows = await db
    .select(withCount)
    .from(audience)
    .where(
      and(
        inContactEnvironment(audience, env),
        query.after ? lt(audience.id, query.after) : undefined,
      ),
    )
    .orderBy(desc(audience.id))
    .limit(limit + 1);
  return {
    object: "list",
    data: rows.slice(0, limit).map(toAudienceObject),
    has_more: rows.length > limit,
  };
}

export async function getAudience(
  env: ContactEnvironment,
  id: string,
): Promise<AudienceOutput | null> {
  if (!isId("aud", id)) return null;
  const [row] = await db
    .select(withCount)
    .from(audience)
    .where(and(inContactEnvironment(audience, env), eq(audience.id, id)))
    .limit(1);
  return row ? toAudienceObject(row) : null;
}

function nameTaken(name: string): ContactError {
  return new ContactError("name_taken", `An audience named "${name}" already exists.`, {
    param: "name",
  });
}

export async function createAudience(
  env: ContactEnvironment,
  params: { name: string },
): Promise<AudienceOutput> {
  const projectId = await environmentProject(env);
  if (!projectId) throw new ContactError("not_found", "Environment not found.");
  const [row] = await db
    .insert(audience)
    .values({ ...env, projectId, name: params.name })
    .onConflictDoNothing({ target: [audience.environmentId, audience.name] })
    .returning();
  if (!row) throw nameTaken(params.name);
  return toAudienceObject({ ...row, contactCount: 0 });
}

export async function updateAudience(
  env: ContactEnvironment,
  id: string,
  params: { name: string },
): Promise<AudienceOutput | null> {
  if (!isId("aud", id)) return null;
  try {
    const [row] = await db
      .update(audience)
      .set({ name: params.name })
      .where(and(inContactEnvironment(audience, env), eq(audience.id, id)))
      .returning({ id: audience.id });
    if (!row) return null;
  } catch (error) {
    const cause = (error as { cause?: { code?: string }; code?: string }) ?? {};
    if (cause.code === "23505" || cause.cause?.code === "23505") throw nameTaken(params.name);
    throw error;
  }
  return getAudience(env, id);
}

/**
 * Deletes the audience (its contacts stay). Refused while a segment filters on it. Returns
 * whether it existed.
 */
export async function deleteAudience(env: ContactEnvironment, id: string): Promise<boolean> {
  if (!isId("aud", id)) return false;
  return db.transaction(async (tx) => {
    await lockSegmentReferences(tx, env);
    const [used] = await tx
      .select({ name: segment.name })
      .from(segment)
      .where(
        and(
          inContactEnvironment(segment, env),
          sql`jsonb_path_exists(${segment.filter}, '$.** ? (@.audience_id == $id)', jsonb_build_object('id', ${id}::text))`,
        ),
      )
      .limit(1);
    if (used) {
      throw new ContactError(
        "audience_in_use",
        `The segment "${used.name}" filters on this audience: change it first.`,
      );
    }
    await assertNoBroadcastUses(env, { audienceId: id }, tx);
    const deleted = await tx
      .delete(audience)
      .where(and(inContactEnvironment(audience, env), eq(audience.id, id)))
      .returning({ id: audience.id });
    return deleted.length > 0;
  });
}

/**
 * Adds existing contacts (by id or address) to the audience; `null` without the audience.
 * Unknown ones are listed in `missing`.
 */
export async function addAudienceContacts(
  env: ContactEnvironment,
  audienceId: string,
  contacts: string[],
): Promise<{
  object: "audience_contacts";
  added: number;
  existing: number;
  missing: string[];
} | null> {
  if (!isId("aud", audienceId)) return null;
  const [row] = await db
    .select({ id: audience.id })
    .from(audience)
    .where(and(inContactEnvironment(audience, env), eq(audience.id, audienceId)))
    .limit(1);
  if (!row) return null;
  const ids = contacts.filter((value) => isId("contact", value));
  const addresses = contacts.filter((value) => !isId("contact", value)).map(addressKey);
  const found = await db
    .select({ id: contact.id, address: contact.address })
    .from(contact)
    .where(
      and(
        inContactEnvironment(contact, env),
        sql`(${ids.length ? inArray(contact.id, ids) : sql`false`} or ${addresses.length ? inArray(contact.address, addresses) : sql`false`})`,
      ),
    );
  const known = new Set(found.flatMap((match) => [match.id, match.address]));
  const missing = contacts.filter(
    (value) => !known.has(isId("contact", value) ? value : addressKey(value)),
  );
  const unique = [...new Map(found.map((match) => [match.id, match])).values()];
  const inserted = unique.length
    ? await db
        .insert(audienceMember)
        .values(
          unique.map((match) => ({
            audienceId,
            contactId: match.id,
            organizationId: env.organizationId,
          })),
        )
        .onConflictDoNothing()
        .returning({ contactId: audienceMember.contactId })
    : [];
  return {
    object: "audience_contacts",
    added: inserted.length,
    existing: unique.length - inserted.length,
    missing,
  };
}

/** Removes a contact (by id or address) from the audience. Whether it was a member. */
export async function removeAudienceContact(
  env: ContactEnvironment,
  audienceId: string,
  idOrEmail: string,
): Promise<boolean> {
  if (!isId("aud", audienceId)) return false;
  const deleted = await db.execute(sql`
    delete from ${audienceMember}
    using ${contact}, ${audience}
    where ${audienceMember.audienceId} = ${audienceId}
      and ${audience.id} = ${audienceMember.audienceId}
      and ${audience.organizationId} = ${env.organizationId}
      and ${audience.environmentId} = ${env.environmentId}
      and ${contact.id} = ${audienceMember.contactId}
      and ${contact.organizationId} = ${audienceMember.organizationId}
      and ${
        isId("contact", idOrEmail)
          ? sql`${contact.id} = ${idOrEmail}`
          : sql`${contact.address} = ${addressKey(idOrEmail)}`
      }
  `);
  return (deleted.rowCount ?? 0) > 0;
}

/** A page of the audience's members, newest member first; `null` without the audience. */
export async function listAudienceContacts(
  env: ContactEnvironment,
  audienceId: string,
  query: ListQueryOutput,
): Promise<ContactListOutput | null> {
  if (!(await getAudience(env, audienceId))) return null;
  const limit = query.limit ?? DEFAULT_CONTACT_LIST_LIMIT;
  const rows = await db
    .select({ contact })
    .from(audienceMember)
    .innerJoin(
      contact,
      and(
        eq(contact.id, audienceMember.contactId),
        eq(contact.organizationId, audienceMember.organizationId),
      ),
    )
    .where(
      and(
        eq(audienceMember.audienceId, audienceId),
        eq(audienceMember.organizationId, env.organizationId),
        query.after ? lt(contact.id, query.after) : undefined,
      ),
    )
    .orderBy(desc(contact.id))
    .limit(limit + 1);
  return {
    object: "list",
    data: rows.slice(0, limit).map((row) => toContactObject(row.contact)),
    has_more: rows.length > limit,
  };
}

/** The ids of the audiences the contact belongs to. */
export async function contactAudienceIds(
  env: ContactEnvironment,
  contactId: string,
): Promise<Set<string>> {
  const rows = await db
    .select({ audienceId: audienceMember.audienceId })
    .from(audienceMember)
    .innerJoin(
      audience,
      and(
        eq(audience.id, audienceMember.audienceId),
        eq(audience.organizationId, audienceMember.organizationId),
      ),
    )
    .where(
      and(
        eq(audienceMember.contactId, contactId),
        eq(audienceMember.organizationId, env.organizationId),
        eq(audience.environmentId, env.environmentId),
      ),
    );
  return new Set(rows.map((row) => row.audienceId));
}
