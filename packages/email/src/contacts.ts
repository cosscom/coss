/**
 * Contacts: an environment's list of people marketing email goes to, one per address, with
 * custom properties, audience memberships and consent (overall `status`, and per topic in
 * `contact_topic`). Every function is scoped by the environment (`ContactEnvironment`); writes
 * derive the project from the environment row.
 *
 * The plan's `contactsPerEnvironment` limit is enforced against `contact_counter`, kept in the
 * same transaction as every insert and delete (a conditional update, never a count under lock).
 */
import type { PlanGate } from "@coss/billing/gate";
import { db, type Executor, schema } from "@coss/db";
import { ID_PREFIXES, isId, newId } from "@coss/db/id";
import { enqueueWebhookMessage } from "@coss/webhooks";
import { and, asc, desc, eq, gt, inArray, lt, or, sql } from "drizzle-orm";
import { contactCsvHeader, contactCsvRow } from "./contact-csv.ts";
import {
  type ContactEnvironment,
  environmentProject,
  inContactEnvironment,
  mergeProperties,
  propertyDefinitions,
} from "./contact-properties.ts";
import {
  type ContactEventType,
  type ContactImportEntryInput,
  type ContactImportOutput,
  type ContactListOutput,
  type ContactOutput,
  type ContactSource,
  type ContactTopicStatus,
  type ContactTopicsOutput,
  DEFAULT_CONTACT_LIST_LIMIT,
  type ExportContactsQueryOutput,
  type ListContactsQueryOutput,
  type StoredContactWebhookEvent,
  type UpdateContactRequestOutput,
  UpsertContactRequest,
  type UpsertContactRequestOutput,
} from "./contact-schemas.ts";
import { ContactError } from "./errors.ts";
import { addressKey } from "./schemas.ts";
import { type TopicRow, topicsByKey } from "./topics.ts";

const { audience, audienceMember, contact, contactCounter, contactTopic } = schema;

export type ContactRow = typeof contact.$inferSelect;
export type { ContactEnvironment };

export type ContactDeps = {
  /** Enforces `contactsPerEnvironment` (absent: unlimited, e.g. tests and scripts). */
  plans?: PlanGate;
};

export function toContactObject(row: ContactRow): ContactOutput {
  return {
    object: "contact",
    id: row.id,
    email: row.address,
    first_name: row.firstName,
    last_name: row.lastName,
    status: row.status,
    properties: row.properties as Record<string, string | number | boolean>,
    source: row.source,
    subscribed_at: row.subscribedAt?.toISOString() ?? null,
    unsubscribed_at: row.unsubscribedAt?.toISOString() ?? null,
    confirmed_at: row.confirmedAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

/** Matches a contact by its id or its address (case-insensitive). */
function byIdOrEmail(idOrEmail: string) {
  if (idOrEmail.includes("@")) return eq(contact.address, addressKey(idOrEmail));
  return isId("contact", idOrEmail) ? eq(contact.id, idOrEmail) : null;
}

export async function getContactRow(
  env: ContactEnvironment,
  idOrEmail: string,
  executor: Executor = db,
  opts: { forUpdate?: boolean } = {},
): Promise<ContactRow | null> {
  const match = byIdOrEmail(idOrEmail);
  if (!match) return null;
  const query = executor
    .select()
    .from(contact)
    .where(and(inContactEnvironment(contact, env), match))
    .limit(1);
  const [row] = opts.forUpdate ? await query.for("update") : await query;
  return row ?? null;
}

export async function getContact(
  env: ContactEnvironment,
  idOrEmail: string,
): Promise<ContactOutput | null> {
  const row = await getContactRow(env, idOrEmail);
  return row ? toContactObject(row) : null;
}

/** The consent columns for a status change made `now`. */
function statusChange(status: "subscribed" | "unsubscribed", now: Date) {
  return status === "subscribed"
    ? { status, subscribedAt: now, unsubscribedAt: null, pendingSince: null }
    : { status, unsubscribedAt: now, pendingSince: null };
}

/**
 * Locks the environment's contact counter, first: every transaction that creates or deletes
 * contacts takes it before touching contact rows (property definitions come before it), so an
 * import's batches, single upserts, deletes and purges never wait on each other in a cycle.
 */
export async function lockContactCounter(tx: Executor, env: ContactEnvironment): Promise<void> {
  await tx
    .insert(contactCounter)
    .values({ environmentId: env.environmentId, organizationId: env.organizationId })
    .onConflictDoNothing();
  await tx
    .select({ count: contactCounter.count })
    .from(contactCounter)
    .where(
      and(
        eq(contactCounter.environmentId, env.environmentId),
        eq(contactCounter.organizationId, env.organizationId),
      ),
    )
    .for("update");
}

/** A reservation `reserveContacts` refused: over the plan's limit (see `contactLimitError`). */
class ContactLimitReached extends Error {
  constructor(
    readonly current: number,
    readonly count: number,
  ) {
    super("The plan's contact limit was reached.");
  }
}

/**
 * The plan's `contactsPerEnvironment` (`null`: unlimited), read before a transaction opens: a
 * lookup inside one would need a second pool connection while holding the first.
 */
export async function contactLimitOf(
  env: ContactEnvironment,
  deps: ContactDeps,
): Promise<number | null> {
  return deps.plans ? deps.plans.limit(env.organizationId, "contactsPerEnvironment") : null;
}

/**
 * Counts `count` more contacts of the environment against `limit` (from `contactLimitOf`), in
 * `tx`: the conditional update is the check. Beyond it, throws a refusal for
 * `contactLimitError` to turn into the plan's `BillingError` once the transaction is over.
 */
export async function reserveContacts(
  tx: Executor,
  env: ContactEnvironment,
  count: number,
  limit: number | null,
): Promise<void> {
  if (count <= 0) return;
  await tx
    .insert(contactCounter)
    .values({ environmentId: env.environmentId, organizationId: env.organizationId })
    .onConflictDoNothing();
  const scope = and(
    eq(contactCounter.environmentId, env.environmentId),
    eq(contactCounter.organizationId, env.organizationId),
  );
  const [updated] = await tx
    .update(contactCounter)
    .set({ count: sql`${contactCounter.count} + ${count}` })
    .where(
      and(scope, limit === null ? undefined : sql`${contactCounter.count} + ${count} <= ${limit}`),
    )
    .returning({ count: contactCounter.count });
  if (updated) return;
  const [current] = await tx
    .select({ count: contactCounter.count })
    .from(contactCounter)
    .where(scope);
  throw new ContactLimitReached(current?.count ?? 0, count);
}

/** `error`, or the plan's `BillingError` for a refused reservation (call outside the transaction). */
export async function contactLimitError(
  error: unknown,
  env: ContactEnvironment,
  deps: ContactDeps,
): Promise<unknown> {
  if (!(error instanceof ContactLimitReached)) return error;
  await deps.plans?.requireCapacity(
    env.organizationId,
    "contactsPerEnvironment",
    error.current,
    error.count,
  );
  return new Error("The contact limit changed during the check; retry.");
}

/** Gives `count` contacts back to the environment's counter (deletes, purges), in `tx`. */
export async function releaseContacts(
  tx: Executor,
  env: ContactEnvironment,
  count: number,
): Promise<void> {
  if (count <= 0) return;
  await tx
    .update(contactCounter)
    .set({ count: sql`greatest(${contactCounter.count} - ${count}, 0)` })
    .where(
      and(
        eq(contactCounter.environmentId, env.environmentId),
        eq(contactCounter.organizationId, env.organizationId),
      ),
    );
}

/** How many contacts the environment has (the plan's limit counts these). */
export async function contactCount(env: ContactEnvironment): Promise<number> {
  const [row] = await db
    .select({ count: contactCounter.count })
    .from(contactCounter)
    .where(
      and(
        eq(contactCounter.environmentId, env.environmentId),
        eq(contactCounter.organizationId, env.organizationId),
      ),
    );
  return row?.count ?? 0;
}

/** Announces a contact change to the environment's webhook endpoints, in `tx`. */
export async function announceContact(
  tx: Executor,
  row: Pick<ContactRow, "id" | "organizationId" | "environmentId" | "address" | "status">,
  type: ContactEventType,
  source: ContactSource,
  now: Date,
): Promise<void> {
  const id = newId(ID_PREFIXES.webhookEvent);
  const payload: StoredContactWebhookEvent = {
    id,
    object: "event",
    type,
    created_at: now.toISOString(),
    data: {
      contact: { id: row.id, email: row.address, status: row.status },
      source,
      occurred_at: now.toISOString(),
    },
  };
  await enqueueWebhookMessage(tx, {
    id,
    organizationId: row.organizationId,
    environmentId: row.environmentId,
    type,
    payload,
    now,
  });
}

/** The audiences named by `ids`, all of which must belong to the environment. */
async function requireAudiences(
  tx: Executor,
  env: ContactEnvironment,
  ids: string[] | undefined,
): Promise<string[]> {
  const unique = [...new Set(ids ?? [])];
  if (unique.length === 0) return [];
  const rows = await tx
    .select({ id: audience.id })
    .from(audience)
    .where(
      and(
        inContactEnvironment(audience, env),
        inArray(
          audience.id,
          unique.filter((id) => isId("aud", id)),
        ),
      ),
    );
  const found = new Set(rows.map((row) => row.id));
  const missing = unique.findIndex((id) => !found.has(id));
  if (missing !== -1) {
    throw new ContactError("audience_not_found", `No audience ${unique[missing]} exists.`, {
      param: `audience_ids.${(ids ?? []).indexOf(unique[missing] as string)}`,
    });
  }
  return unique;
}

/** The topics named by `choices`, all of which must exist in the environment. */
async function requireTopics(
  env: ContactEnvironment,
  choices: { topic: string }[] | undefined,
): Promise<Map<string, TopicRow>> {
  if (!choices?.length) return new Map();
  const topics = await topicsByKey(
    env,
    choices.map((choice) => choice.topic),
  );
  const missing = choices.findIndex((choice) => !topics.has(choice.topic));
  if (missing !== -1) {
    throw new ContactError(
      "topic_not_found",
      `No topic with the key "${choices[missing]?.topic}" exists.`,
      { param: `topics.${missing}.topic` },
    );
  }
  return topics;
}

async function addMemberships(tx: Executor, row: ContactRow, audienceIds: string[]): Promise<void> {
  if (audienceIds.length === 0) return;
  await tx
    .insert(audienceMember)
    .values(
      audienceIds.map((audienceId) => ({
        audienceId,
        contactId: row.id,
        organizationId: row.organizationId,
      })),
    )
    .onConflictDoNothing();
}

/** Records the contact's explicit choices (the last one per topic wins), in `tx`. */
export async function applyTopicChoices(
  tx: Executor,
  row: Pick<ContactRow, "id" | "organizationId">,
  topics: ReadonlyMap<string, Pick<TopicRow, "id">>,
  choices: { topic: string; status: ContactTopicStatus }[] | undefined,
  source: ContactSource,
): Promise<void> {
  const latest = new Map<string, ContactTopicStatus>();
  for (const choice of choices ?? []) latest.set(choice.topic, choice.status);
  if (latest.size === 0) return;
  await tx
    .insert(contactTopic)
    .values(
      [...latest].map(([key, status]) => ({
        contactId: row.id,
        topicId: (topics.get(key) as Pick<TopicRow, "id">).id,
        organizationId: row.organizationId,
        status,
        source,
      })),
    )
    .onConflictDoUpdate({
      target: [contactTopic.contactId, contactTopic.topicId],
      set: { status: sql`excluded.status`, source: sql`excluded.source`, updatedAt: sql`now()` },
    });
}

/**
 * Creates the contact, or updates the one with the same address: names and properties are
 * merged, `status` changes only when passed, `audience_ids` are added and `topics` recorded.
 */
export async function upsertContact(
  env: ContactEnvironment,
  params: UpsertContactRequestOutput,
  opts: ContactDeps & { source: ContactSource; now?: Date },
): Promise<{ contact: ContactOutput; created: boolean }> {
  const now = opts.now ?? new Date();
  const topics = await requireTopics(env, params.topics);
  const limit = await contactLimitOf(env, opts);
  try {
    return await db.transaction(async (tx) => {
      const projectId = await environmentProject(env, tx);
      if (!projectId) throw new ContactError("not_found", "Environment not found.");
      const definitions = await propertyDefinitions(env, tx, { forWrite: true });
      await lockContactCounter(tx, env);
      const audienceIds = await requireAudiences(tx, env, params.audience_ids);
      const status = params.status ?? "subscribed";
      const [inserted] = await tx
        .insert(contact)
        .values({
          ...env,
          projectId,
          address: params.email,
          firstName: params.first_name ?? null,
          lastName: params.last_name ?? null,
          properties: mergeProperties({}, params.properties, definitions),
          source: opts.source,
          ...statusChange(status, now),
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: [contact.environmentId, contact.address] })
        .returning();
      let row: ContactRow;
      if (inserted) {
        await reserveContacts(tx, env, 1, limit);
        row = inserted;
      } else {
        const [existing] = await tx
          .select()
          .from(contact)
          .where(and(inContactEnvironment(contact, env), eq(contact.address, params.email)))
          .for("update");
        if (!existing) throw new Error("The contact disappeared during the upsert; retry.");
        row = await updateRow(tx, existing, params, definitions, now);
      }
      await addMemberships(tx, row, audienceIds);
      await applyTopicChoices(tx, row, topics, params.topics, opts.source);
      await announceContact(
        tx,
        row,
        inserted ? "contact.created" : "contact.updated",
        opts.source,
        now,
      );
      return { contact: toContactObject(row), created: Boolean(inserted) };
    });
  } catch (error) {
    throw await contactLimitError(error, env, opts);
  }
}

async function updateRow(
  tx: Executor,
  existing: ContactRow,
  params: Omit<UpdateContactRequestOutput, "topics">,
  definitions: Awaited<ReturnType<typeof propertyDefinitions>>,
  now: Date,
): Promise<ContactRow> {
  const changes = {
    ...(params.first_name === undefined ? {} : { firstName: params.first_name }),
    ...(params.last_name === undefined ? {} : { lastName: params.last_name }),
    ...(params.properties === undefined
      ? {}
      : { properties: mergeProperties(existing.properties, params.properties, definitions) }),
    ...(params.status === undefined || params.status === existing.status
      ? {}
      : statusChange(params.status, now)),
  };
  const [updated] = await tx
    .update(contact)
    .set({ ...changes, updatedAt: now })
    .where(and(eq(contact.id, existing.id), eq(contact.organizationId, existing.organizationId)))
    .returning();
  if (!updated) throw new Error("The contact disappeared during the update; retry.");
  return updated;
}

/** Updates the contact named by id or address; `null` if there is none. */
export async function updateContact(
  env: ContactEnvironment,
  idOrEmail: string,
  params: UpdateContactRequestOutput,
  opts: { source: ContactSource; now?: Date },
): Promise<ContactOutput | null> {
  const now = opts.now ?? new Date();
  const match = byIdOrEmail(idOrEmail);
  if (!match) return null;
  const topics = await requireTopics(env, params.topics);
  return db.transaction(async (tx) => {
    // Definitions before the contact, in the order every writer (and a deletion) locks them.
    const definitions = await propertyDefinitions(env, tx, { forWrite: true });
    const [existing] = await tx
      .select()
      .from(contact)
      .where(and(inContactEnvironment(contact, env), match))
      .for("update");
    if (!existing) return null;
    const row = await updateRow(tx, existing, params, definitions, now);
    await applyTopicChoices(tx, row, topics, params.topics, opts.source);
    await announceContact(tx, row, "contact.updated", opts.source, now);
    return toContactObject(row);
  });
}

/** Deletes the contact (its memberships and topic choices go with it). Whether it existed. */
export async function deleteContact(
  env: ContactEnvironment,
  idOrEmail: string,
  opts: { source: ContactSource; now?: Date },
): Promise<ContactOutput | null> {
  const now = opts.now ?? new Date();
  const match = byIdOrEmail(idOrEmail);
  if (!match) return null;
  return db.transaction(async (tx) => {
    await lockContactCounter(tx, env);
    const [deleted] = await tx
      .delete(contact)
      .where(and(inContactEnvironment(contact, env), match))
      .returning();
    if (!deleted) return null;
    await releaseContacts(tx, env, 1);
    await announceContact(tx, deleted, "contact.deleted", opts.source, now);
    return toContactObject(deleted);
  });
}

/** `(created_at::text, sequence)` of the contact `after` names, for keyset paging. */
async function cursorOf(env: ContactEnvironment, after: string | undefined) {
  if (after === undefined) return undefined;
  if (!isId("contact", after)) return null;
  const [row] = await db
    .select({ createdAt: sql<string>`${contact.createdAt}::text`, sequence: contact.sequence })
    .from(contact)
    .where(and(inContactEnvironment(contact, env), eq(contact.id, after)))
    .limit(1);
  return row ?? null;
}

function memberOf(audienceId: string) {
  return sql`exists (
    select 1 from ${audienceMember}
    where ${audienceMember.audienceId} = ${audienceId}
      and ${audienceMember.contactId} = ${contact.id}
      and ${audienceMember.organizationId} = ${contact.organizationId}
  )`;
}

/** A page of the environment's contacts, newest first. An unknown cursor is an empty page. */
export async function listContacts(
  env: ContactEnvironment,
  query: ListContactsQueryOutput,
): Promise<ContactListOutput> {
  const limit = query.limit ?? DEFAULT_CONTACT_LIST_LIMIT;
  const cursor = await cursorOf(env, query.after);
  if (cursor === null) return { object: "list", data: [], has_more: false };
  const rows = await db
    .select()
    .from(contact)
    .where(
      and(
        inContactEnvironment(contact, env),
        query.email ? eq(contact.address, query.email) : undefined,
        query.status ? eq(contact.status, query.status) : undefined,
        query.audience_id ? memberOf(query.audience_id) : undefined,
        cursor
          ? or(
              lt(contact.createdAt, sql`${cursor.createdAt}::timestamptz`),
              and(
                eq(contact.createdAt, sql`${cursor.createdAt}::timestamptz`),
                lt(contact.sequence, cursor.sequence),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(contact.createdAt), desc(contact.sequence))
    .limit(limit + 1);
  return {
    object: "list",
    data: rows.slice(0, limit).map(toContactObject),
    has_more: rows.length > limit,
  };
}

const IMPORT_BATCH = 500;

/**
 * Upserts many contacts at once (the API takes 1,000, the dashboard's CSV 10,000). Each entry
 * is validated on its own; invalid ones are reported and skipped. Existing contacts get the new
 * names and properties, but an import never re-subscribes an `unsubscribed` (or `pending`)
 * contact. No webhooks: an import would flood endpoints. All or nothing for the valid entries:
 * over the plan's limit nothing is imported.
 */
export async function importContacts(
  env: ContactEnvironment,
  entries: ContactImportEntryInput[],
  opts: ContactDeps & { audienceId?: string; source?: ContactSource; now?: Date },
): Promise<ContactImportOutput> {
  const now = opts.now ?? new Date();
  const source = opts.source ?? "import";
  const invalid: ContactImportOutput["invalid"] = [];
  const valid = new Map<string, UpsertContactRequestOutput>();
  entries.forEach((entry, index) => {
    const parsed = UpsertContactRequest.safeParse(entry);
    if (!parsed.success) {
      invalid.push({
        index,
        email: typeof entry.email === "string" ? entry.email : "",
        message: parsed.error.issues[0]?.message ?? "Invalid contact.",
      });
      return;
    }
    // A later row for the same address wins.
    valid.set(parsed.data.email, parsed.data);
  });

  let created = 0;
  let updated = 0;
  let keptUnsubscribed = 0;
  const limit = await contactLimitOf(env, opts);
  try {
    await db.transaction(async (tx) => {
      const projectId = await environmentProject(env, tx);
      if (!projectId) throw new ContactError("not_found", "Environment not found.");
      const definitions = await propertyDefinitions(env, tx, { forWrite: true });
      // Before the first batch's inserts: a concurrent upsert of a later batch's address must not
      // hold that row while waiting for the counter this import holds.
      await lockContactCounter(tx, env);
      const audienceIds = await requireAudiences(
        tx,
        env,
        opts.audienceId ? [opts.audienceId] : undefined,
      );
      const rows = [...valid.values()];
      const reject = (params: UpsertContactRequestOutput, error: ContactError) =>
        invalid.push({
          index: entries.findLastIndex(
            (entry) => typeof entry.email === "string" && addressKey(entry.email) === params.email,
          ),
          email: params.email,
          message: error.message,
        });
      // Property errors are per entry too: validate before writing anything.
      const prepared: {
        params: UpsertContactRequestOutput;
        properties: Record<string, unknown>;
      }[] = [];
      for (const params of rows) {
        try {
          prepared.push({
            params,
            properties: mergeProperties({}, params.properties, definitions),
          });
        } catch (error) {
          if (!(error instanceof ContactError)) throw error;
          reject(params, error);
        }
      }
      for (let start = 0; start < prepared.length; start += IMPORT_BATCH) {
        const batch = prepared.slice(start, start + IMPORT_BATCH);
        const inserted = await tx
          .insert(contact)
          .values(
            batch.map(({ params, properties }) => ({
              ...env,
              projectId,
              address: params.email,
              firstName: params.first_name ?? null,
              lastName: params.last_name ?? null,
              properties,
              source,
              ...statusChange(params.status ?? "subscribed", now),
              createdAt: now,
              updatedAt: now,
            })),
          )
          .onConflictDoNothing({ target: [contact.environmentId, contact.address] })
          .returning();
        created += inserted.length;
        await reserveContacts(tx, env, inserted.length, limit);
        const insertedAddresses = new Set(inserted.map((row) => row.address));
        const touched: ContactRow[] = [...inserted];
        const existingRows = await tx
          .select()
          .from(contact)
          .where(
            and(
              inContactEnvironment(contact, env),
              inArray(
                contact.address,
                batch.map(({ params }) => params.email).filter((a) => !insertedAddresses.has(a)),
              ),
            ),
          )
          .for("update");
        const existing = new Map(existingRows.map((row) => [row.address, row]));
        for (const { params } of batch) {
          const row = existing.get(params.email);
          if (!row) continue;
          const resubscribes = params.status === "subscribed" && row.status !== "subscribed";
          let next: ContactRow;
          try {
            // Merged with the stored properties, which can push them over the size limit.
            next = await updateRow(
              tx,
              row,
              { ...params, status: resubscribes ? undefined : params.status },
              definitions,
              now,
            );
          } catch (error) {
            if (!(error instanceof ContactError)) throw error;
            reject(params, error);
            continue;
          }
          if (resubscribes) keptUnsubscribed++;
          touched.push(next);
          updated++;
        }
        if (audienceIds.length > 0 && touched.length > 0) {
          await tx
            .insert(audienceMember)
            .values(
              touched.flatMap((row) =>
                audienceIds.map((audienceId) => ({
                  audienceId,
                  contactId: row.id,
                  organizationId: row.organizationId,
                })),
              ),
            )
            .onConflictDoNothing();
        }
      }
    });
  } catch (error) {
    throw await contactLimitError(error, env, opts);
  }
  invalid.sort((a, b) => a.index - b.index);
  return {
    object: "contact_import",
    created,
    updated,
    kept_unsubscribed: keptUnsubscribed,
    invalid,
  };
}

const EXPORT_PAGE = 1000;

/** Every matching contact, oldest first, a page at a time (by id). */
export async function* exportContactPages(
  env: ContactEnvironment,
  filter: ExportContactsQueryOutput,
): AsyncGenerator<ContactRow[]> {
  let after: string | undefined;
  for (;;) {
    const rows = await db
      .select()
      .from(contact)
      .where(
        and(
          inContactEnvironment(contact, env),
          filter.status ? eq(contact.status, filter.status) : undefined,
          filter.audience_id ? memberOf(filter.audience_id) : undefined,
          after ? gt(contact.id, after) : undefined,
        ),
      )
      .orderBy(asc(contact.id))
      .limit(EXPORT_PAGE);
    if (rows.length > 0) yield rows;
    if (rows.length < EXPORT_PAGE) return;
    after = rows.at(-1)?.id;
  }
}

/**
 * The environment's contacts as CSV (`contact-csv.ts`), streamed a page per pull. `keys` are
 * the custom property columns, in order (the environment's properties at the time).
 */
export function contactsCsvStream(
  env: ContactEnvironment,
  filter: ExportContactsQueryOutput,
  keys: string[],
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const pages = exportContactPages(env, filter);
  let started = false;
  return new ReadableStream({
    async pull(controller) {
      if (!started) {
        started = true;
        controller.enqueue(encoder.encode(contactCsvHeader(keys)));
      }
      const next = await pages.next();
      if (next.done) {
        controller.close();
        return;
      }
      controller.enqueue(
        encoder.encode(next.value.map((row) => contactCsvRow(toContactObject(row), keys)).join("")),
      );
    },
    async cancel() {
      await pages.return(undefined);
    },
  });
}

/**
 * Whether `topic` reaches a contact: their explicit choice, else the topic's default. An
 * unsubscribed contact gets no marketing email whatever its choices say.
 */
export function topicReaches(
  topic: Pick<TopicRow, "defaultSubscription">,
  choice: ContactTopicStatus | null,
): boolean {
  return choice ? choice === "opted_in" : topic.defaultSubscription === "opt_in";
}

/** Every topic of the environment with the contact's choice; `null` without the contact. */
export async function getContactTopics(
  env: ContactEnvironment,
  idOrEmail: string,
): Promise<ContactTopicsOutput | null> {
  const row = await getContactRow(env, idOrEmail);
  if (!row) return null;
  const [topics, choices] = await Promise.all([
    topicsByKey(env),
    db
      .select({ topicId: contactTopic.topicId, status: contactTopic.status })
      .from(contactTopic)
      .where(
        and(
          eq(contactTopic.contactId, row.id),
          eq(contactTopic.organizationId, row.organizationId),
        ),
      ),
  ]);
  const byTopic = new Map(choices.map((choice) => [choice.topicId, choice.status]));
  return {
    object: "contact_topics",
    contact_id: row.id,
    topics: [...topics.values()].map((topic) => {
      const choice = byTopic.get(topic.id) ?? null;
      return {
        topic: topic.key,
        name: topic.name,
        subscribed: row.status === "subscribed" && topicReaches(topic, choice),
        choice,
      };
    }),
  };
}

/** Records the contact's choices for some topics; `null` without the contact. */
export async function setContactTopics(
  env: ContactEnvironment,
  idOrEmail: string,
  choices: { topic: string; status: ContactTopicStatus }[],
  opts: { source: ContactSource; now?: Date },
): Promise<ContactTopicsOutput | null> {
  const now = opts.now ?? new Date();
  const topics = await requireTopics(env, choices);
  const done = await db.transaction(async (tx) => {
    // The contact before its topic choices, in the order every other consent writer locks them.
    const row = await getContactRow(env, idOrEmail, tx, { forUpdate: true });
    if (!row) return false;
    await applyTopicChoices(tx, row, topics, choices, opts.source);
    await tx
      .update(contact)
      .set({ updatedAt: now })
      .where(and(eq(contact.id, row.id), eq(contact.organizationId, row.organizationId)));
    await announceContact(tx, row, "contact.updated", opts.source, now);
    return true;
  });
  return done ? getContactTopics(env, idOrEmail) : null;
}
