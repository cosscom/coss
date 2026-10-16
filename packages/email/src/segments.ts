/**
 * Segments: filters over an environment's contacts (`SegmentFilter`), stored as JSON and compiled
 * to SQL whenever a segment is used, so membership is always current. Every value is a bound
 * parameter; property keys come only from the environment's definitions; `contains` uses
 * `position()`, never `LIKE`. A filter is validated against the environment when saved (and
 * again when compiled); deleting what a segment references is refused.
 */
import { db, type Executor, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, desc, eq, inArray, lt, not, or, type SQL, sql } from "drizzle-orm";
import {
  type ContactEnvironment,
  type ContactPropertyRow,
  coercePropertyValue,
  environmentProject,
  inContactEnvironment,
  lockSegmentReferences,
  propertyDefinitions,
} from "./contact-properties.ts";
import {
  type ContactListOutput,
  DEFAULT_CONTACT_LIST_LIMIT,
  type ListQueryOutput,
  type PropertyOperator,
  type SegmentConditionOutput,
  SegmentFilter,
  type SegmentFilterOutput,
  type SegmentOutput,
} from "./contact-schemas.ts";
import { toContactObject } from "./contacts.ts";
import { ContactError } from "./errors.ts";
import { type TopicRow, topicsByKey } from "./topics.ts";

const { audience, audienceMember, contact, contactTopic, segment } = schema;

export type SegmentRow = typeof segment.$inferSelect;

/** Which operators suit each property type. */
const OPERATORS: Record<ContactPropertyRow["type"], ReadonlySet<PropertyOperator>> = {
  string: new Set(["eq", "neq", "in", "not_in", "contains", "starts_with", "exists", "not_exists"]),
  number: new Set(["eq", "neq", "in", "not_in", "gt", "gte", "lt", "lte", "exists", "not_exists"]),
  boolean: new Set(["eq", "neq", "exists", "not_exists"]),
  date: new Set(["gt", "gte", "lt", "lte", "exists", "not_exists"]),
};

/** What a filter refers to, loaded once per compilation. */
type FilterContext = {
  env: ContactEnvironment;
  properties: Map<string, ContactPropertyRow>;
  topics: Map<string, TopicRow>;
  audiences: Set<string>;
};

async function filterContext(
  env: ContactEnvironment,
  filter: SegmentFilterOutput,
  executor: Executor,
): Promise<FilterContext> {
  const audienceIds = conditionsOf(filter)
    .flatMap(({ condition }) => (condition.field === "audience" ? [condition.audience_id] : []))
    .filter((id) => isId("aud", id));
  const [properties, topics, audiences] = await Promise.all([
    propertyDefinitions(env, executor),
    topicsByKey(env, undefined, executor),
    audienceIds.length
      ? executor
          .select({ id: audience.id })
          .from(audience)
          .where(and(inContactEnvironment(audience, env), inArray(audience.id, audienceIds)))
      : Promise.resolve([]),
  ]);
  return { env, properties, topics, audiences: new Set(audiences.map((row) => row.id)) };
}

/** Every condition with its path in the request (`filter.conditions.1.conditions.0`). */
function conditionsOf(
  filter: SegmentFilterOutput,
): { condition: SegmentConditionOutput; path: string }[] {
  return filter.conditions.flatMap((item, index) =>
    "conditions" in item
      ? item.conditions.map((condition, inner) => ({
          condition,
          path: `filter.conditions.${index}.conditions.${inner}`,
        }))
      : [{ condition: item, path: `filter.conditions.${index}` }],
  );
}

function invalid(path: string, message: string): ContactError {
  return new ContactError("invalid_filter", message, { param: path });
}

/** `p->'key'`, a property's raw JSON value. */
function raw(key: string): SQL {
  return sql`(${contact.properties} -> ${key}::text)`;
}

function scalar(
  definition: ContactPropertyRow,
  value: unknown,
  path: string,
): string | number | boolean {
  if (value === undefined || value === null || Array.isArray(value)) {
    throw invalid(`${path}.value`, "This operator needs a single value.");
  }
  const coerced = coercePropertyValue(definition.type, value as string | number | boolean);
  if ("problem" in coerced) throw invalid(`${path}.value`, `${definition.key}: ${coerced.problem}`);
  return coerced.value;
}

function contains(key: string, value: string | number | boolean): SQL {
  return sql`${contact.properties} @> jsonb_build_object(${key}::text, ${JSON.stringify(value)}::jsonb)`;
}

function propertySql(
  condition: Extract<SegmentConditionOutput, { field: "property" }>,
  path: string,
  context: FilterContext,
): SQL {
  const definition = context.properties.get(condition.key);
  if (!definition) {
    throw invalid(
      `${path}.key`,
      `"${condition.key}" is not a contact property of this environment.`,
    );
  }
  const { op } = condition;
  if (!OPERATORS[definition.type].has(op)) {
    throw invalid(`${path}.op`, `"${op}" can't be used with a ${definition.type} property.`);
  }
  const key = definition.key;
  switch (op) {
    case "exists":
      return sql`${contact.properties} ? ${key}::text`;
    case "not_exists":
      return sql`not (${contact.properties} ? ${key}::text)`;
    case "in":
    case "not_in": {
      const values = Array.isArray(condition.value) ? condition.value : undefined;
      if (!values) throw invalid(`${path}.value`, `"${op}" needs a list of values.`);
      const any = or(
        ...values.map((value, index) =>
          contains(key, scalar(definition, value, `${path}.value.${index}`)),
        ),
      ) as SQL;
      return op === "in" ? any : not(any);
    }
    case "eq":
    case "neq": {
      const match = contains(key, scalar(definition, condition.value, path));
      // `neq`: a different value, or none.
      return op === "eq" ? match : not(match);
    }
    case "contains":
    case "starts_with": {
      const value = String(scalar(definition, condition.value, path)).toLowerCase();
      const text = sql`lower(${contact.properties} ->> ${key}::text)`;
      return op === "contains"
        ? sql`position(${value}::text in ${text}) > 0`
        : sql`left(${text}, char_length(${value}::text)) = ${value}::text`;
    }
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const value = scalar(definition, condition.value, path);
      const compare = { gt: sql`>`, gte: sql`>=`, lt: sql`<`, lte: sql`<=` }[op];
      if (definition.type === "number") {
        return sql`(case when jsonb_typeof(${raw(key)}) = 'number' then (${contact.properties} ->> ${key}::text)::numeric end) ${compare} ${value}::numeric`;
      }
      // Dates are stored as canonical ISO 8601 strings.
      return sql`(case when jsonb_typeof(${raw(key)}) = 'string' then (${contact.properties} ->> ${key}::text)::timestamptz end) ${compare} ${value}::timestamptz`;
    }
  }
}

/**
 * Whether emails about `topic` reach the contact: an explicit opt-out excludes it from an
 * `opt_in` topic; an `opt_out` topic needs an explicit opt-in. (`status` is checked separately.)
 */
export function topicReachesSql(topic: Pick<TopicRow, "id" | "defaultSubscription">): SQL {
  const choice = (status: "opted_in" | "opted_out") => sql`exists (
    select 1 from ${contactTopic}
    where ${contactTopic.contactId} = ${contact.id}
      and ${contactTopic.organizationId} = ${contact.organizationId}
      and ${contactTopic.topicId} = ${topic.id}
      and ${contactTopic.status} = ${status}
  )`;
  return topic.defaultSubscription === "opt_in" ? not(choice("opted_out")) : choice("opted_in");
}

function conditionSql(
  condition: SegmentConditionOutput,
  path: string,
  context: FilterContext,
): SQL {
  switch (condition.field) {
    case "property":
      return propertySql(condition, path, context);
    case "email": {
      const value = condition.value.toLowerCase();
      if (condition.op === "eq") return eq(contact.address, value);
      if (condition.op === "ends_with") {
        return sql`right(${contact.address}, ${value.length}::int) = ${value}::text`;
      }
      return sql`position(${value}::text in ${contact.address}) > 0`;
    }
    case "audience": {
      if (!context.audiences.has(condition.audience_id)) {
        throw invalid(`${path}.audience_id`, `No audience ${condition.audience_id} exists.`);
      }
      const member = sql`exists (
        select 1 from ${audienceMember}
        where ${audienceMember.audienceId} = ${condition.audience_id}
          and ${audienceMember.contactId} = ${contact.id}
          and ${audienceMember.organizationId} = ${contact.organizationId}
      )`;
      return condition.op === "in" ? member : not(member);
    }
    case "topic": {
      const topic = context.topics.get(condition.topic);
      if (!topic)
        throw invalid(`${path}.topic`, `No topic with the key "${condition.topic}" exists.`);
      const reaches = topicReachesSql(topic);
      return condition.op === "subscribed" ? reaches : not(reaches);
    }
    case "created_at": {
      if (condition.op === "within_days") {
        if (typeof condition.value !== "number") {
          throw invalid(`${path}.value`, '"within_days" needs a number of days.');
        }
        return sql`${contact.createdAt} >= now() - make_interval(days => ${condition.value}::int)`;
      }
      if (typeof condition.value !== "string") {
        throw invalid(`${path}.value`, `"${condition.op}" needs a timestamp.`);
      }
      return condition.op === "before"
        ? sql`${contact.createdAt} < ${condition.value}::timestamptz`
        : sql`${contact.createdAt} > ${condition.value}::timestamptz`;
    }
  }
}

function combine(match: "all" | "any", parts: SQL[]): SQL {
  return (match === "all" ? and(...parts) : or(...parts)) as SQL;
}

/**
 * The filter as a condition on `contact` (throws `invalid_filter` naming the condition at fault).
 * The environment scope is not part of it.
 */
export async function compileSegmentFilter(
  env: ContactEnvironment,
  filter: SegmentFilterOutput,
  executor: Executor = db,
): Promise<SQL> {
  const context = await filterContext(env, filter, executor);
  return combine(
    filter.match,
    filter.conditions.map((item, index) =>
      "conditions" in item
        ? combine(
            item.match,
            item.conditions.map((condition, inner) =>
              conditionSql(condition, `filter.conditions.${index}.conditions.${inner}`, context),
            ),
          )
        : conditionSql(item, `filter.conditions.${index}`, context),
    ),
  );
}

function toSegmentObject(row: SegmentRow): SegmentOutput {
  return {
    object: "segment",
    id: row.id,
    name: row.name,
    filter: row.filter as SegmentFilterOutput,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function getSegmentRow(
  env: ContactEnvironment,
  id: string,
): Promise<SegmentRow | null> {
  if (!isId("seg", id)) return null;
  const [row] = await db
    .select()
    .from(segment)
    .where(and(inContactEnvironment(segment, env), eq(segment.id, id)))
    .limit(1);
  return row ?? null;
}

export async function getSegment(
  env: ContactEnvironment,
  id: string,
): Promise<SegmentOutput | null> {
  const row = await getSegmentRow(env, id);
  return row ? toSegmentObject(row) : null;
}

/** A page of the environment's segments, newest first. */
export async function listSegments(
  env: ContactEnvironment,
  query: ListQueryOutput,
): Promise<{ object: "list"; data: SegmentOutput[]; has_more: boolean }> {
  const limit = query.limit ?? DEFAULT_CONTACT_LIST_LIMIT;
  const rows = await db
    .select()
    .from(segment)
    .where(
      and(
        inContactEnvironment(segment, env),
        query.after ? lt(segment.id, query.after) : undefined,
      ),
    )
    .orderBy(desc(segment.id))
    .limit(limit + 1);
  return {
    object: "list",
    data: rows.slice(0, limit).map(toSegmentObject),
    has_more: rows.length > limit,
  };
}

function nameTaken(name: string): ContactError {
  return new ContactError("name_taken", `A segment named "${name}" already exists.`, {
    param: "name",
  });
}

function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string }; code?: string }) ?? {};
  return cause.code === "23505" || cause.cause?.code === "23505";
}

export async function createSegment(
  env: ContactEnvironment,
  params: { name: string; filter: SegmentFilterOutput },
): Promise<SegmentOutput> {
  const filter = SegmentFilter.parse(params.filter);
  return db.transaction(async (tx) => {
    // Checked and saved under the lock deletions of what it references take.
    await lockSegmentReferences(tx, env);
    await compileSegmentFilter(env, filter, tx);
    const projectId = await environmentProject(env, tx);
    if (!projectId) throw new ContactError("not_found", "Environment not found.");
    const [row] = await tx
      .insert(segment)
      .values({ ...env, projectId, name: params.name, filter })
      .onConflictDoNothing({ target: [segment.environmentId, segment.name] })
      .returning();
    if (!row) throw nameTaken(params.name);
    return toSegmentObject(row);
  });
}

export async function updateSegment(
  env: ContactEnvironment,
  id: string,
  params: { name?: string; filter?: SegmentFilterOutput },
): Promise<SegmentOutput | null> {
  if (!isId("seg", id)) return null;
  const changes = {
    ...(params.name === undefined ? {} : { name: params.name }),
    ...(params.filter === undefined ? {} : { filter: params.filter }),
  };
  if (Object.keys(changes).length === 0) return getSegment(env, id);
  const { filter } = params;
  try {
    return await db.transaction(async (tx) => {
      if (filter) {
        // Checked and saved under the lock deletions of what it references take.
        await lockSegmentReferences(tx, env);
        await compileSegmentFilter(env, filter, tx);
      }
      const [row] = await tx
        .update(segment)
        .set(changes)
        .where(and(inContactEnvironment(segment, env), eq(segment.id, id)))
        .returning();
      return row ? toSegmentObject(row) : null;
    });
  } catch (error) {
    if (isUniqueViolation(error) && params.name) throw nameTaken(params.name);
    throw error;
  }
}

export async function deleteSegment(env: ContactEnvironment, id: string): Promise<boolean> {
  if (!isId("seg", id)) return false;
  const deleted = await db
    .delete(segment)
    .where(and(inContactEnvironment(segment, env), eq(segment.id, id)))
    .returning({ id: segment.id });
  return deleted.length > 0;
}

/**
 * A page of the contacts the filter matches now, whatever their status (a preview: recipient
 * resolution adds consent, `audience-resolution.ts`), newest first; `count` (all matches) only
 * when asked for (the dashboard's live count).
 */
export async function previewSegmentContacts(
  env: ContactEnvironment,
  filter: SegmentFilterOutput,
  query: ListQueryOutput,
  opts: { count?: boolean } = {},
): Promise<ContactListOutput & { count: number | null }> {
  const limit = query.limit ?? DEFAULT_CONTACT_LIST_LIMIT;
  const matches = and(inContactEnvironment(contact, env), await compileSegmentFilter(env, filter));
  const [rows, total] = await Promise.all([
    db
      .select()
      .from(contact)
      .where(and(matches, query.after ? lt(contact.id, query.after) : undefined))
      .orderBy(desc(contact.id))
      .limit(limit + 1),
    opts.count
      ? db.select({ value: sql<number>`count(*)::int` }).from(contact).where(matches)
      : Promise.resolve(null),
  ]);
  return {
    object: "list",
    data: rows.slice(0, limit).map(toContactObject),
    has_more: rows.length > limit,
    count: total ? (total[0]?.value ?? 0) : null,
  };
}
