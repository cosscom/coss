/**
 * Topics: what contacts subscribe to, built on categories (a topic's `key` is the `category` of
 * the emails about it). Consent per topic lives in `contact_topic`; no row means the topic's
 * default (`opt_in`: subscribed, `opt_out`: not).
 */
import { db, type Executor, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import { assertNoBroadcastUses } from "./broadcast-references.ts";
import {
  type ContactEnvironment,
  environmentProject,
  inContactEnvironment,
  lockSegmentReferences,
} from "./contact-properties.ts";
import {
  DEFAULT_CONTACT_LIST_LIMIT,
  type ListQueryOutput,
  MAX_TOPICS,
  type TopicOutput,
} from "./contact-schemas.ts";
import { ContactError } from "./errors.ts";

const { segment, topic } = schema;

export type TopicRow = typeof topic.$inferSelect;

export function toTopicObject(row: TopicRow): TopicOutput {
  return {
    object: "topic",
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    default_subscription: row.defaultSubscription,
    visibility: row.visibility,
    position: row.position,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

/** Every topic of the environment, in preference-center order. */
export async function listTopicRows(
  env: ContactEnvironment,
  executor: Executor = db,
): Promise<TopicRow[]> {
  return executor
    .select()
    .from(topic)
    .where(inContactEnvironment(topic, env))
    .orderBy(asc(topic.position), asc(topic.name), asc(topic.id));
}

/** A page of topics (by id; there are rarely more than a page). */
export async function listTopics(
  env: ContactEnvironment,
  query: ListQueryOutput,
): Promise<{ object: "list"; data: TopicOutput[]; has_more: boolean }> {
  const limit = query.limit ?? DEFAULT_CONTACT_LIST_LIMIT;
  const rows = await db
    .select()
    .from(topic)
    .where(
      and(inContactEnvironment(topic, env), query.after ? gt(topic.id, query.after) : undefined),
    )
    .orderBy(asc(topic.id))
    .limit(limit + 1);
  return {
    object: "list",
    data: rows.slice(0, limit).map(toTopicObject),
    has_more: rows.length > limit,
  };
}

async function topicRow(env: ContactEnvironment, id: string): Promise<TopicRow | null> {
  if (!isId("topic", id)) return null;
  const [row] = await db
    .select()
    .from(topic)
    .where(and(inContactEnvironment(topic, env), eq(topic.id, id)))
    .limit(1);
  return row ?? null;
}

export async function getTopic(env: ContactEnvironment, id: string): Promise<TopicOutput | null> {
  const row = await topicRow(env, id);
  return row ? toTopicObject(row) : null;
}

/** The environment's topics by key (`keys` filters; unknown keys are missing from the map). */
export async function topicsByKey(
  env: ContactEnvironment,
  keys?: string[],
  executor: Executor = db,
): Promise<Map<string, TopicRow>> {
  if (keys && keys.length === 0) return new Map();
  const rows = await listTopicRows(env, executor);
  const wanted = keys ? new Set(keys) : null;
  return new Map(rows.filter((row) => !wanted || wanted.has(row.key)).map((row) => [row.key, row]));
}

export async function createTopic(
  env: ContactEnvironment,
  params: {
    key: string;
    name: string;
    description?: string | null;
    default_subscription: TopicRow["defaultSubscription"];
    visibility?: TopicRow["visibility"];
    position?: number;
  },
): Promise<TopicOutput> {
  return db.transaction(async (tx) => {
    const projectId = await environmentProject(env, tx);
    if (!projectId) throw new ContactError("not_found", "Environment not found.");
    // Serializes creations per environment, so the cap can't be raced past.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`topic:${env.environmentId}`}))`);
    const [count] = await tx
      .select({ value: sql<number>`count(*)::int` })
      .from(topic)
      .where(inContactEnvironment(topic, env));
    if ((count?.value ?? 0) >= MAX_TOPICS) {
      throw new ContactError(
        "too_many_topics",
        `An environment can have at most ${MAX_TOPICS} topics.`,
      );
    }
    const [row] = await tx
      .insert(topic)
      .values({
        ...env,
        projectId,
        key: params.key,
        name: params.name,
        description: params.description ?? null,
        defaultSubscription: params.default_subscription,
        visibility: params.visibility ?? "public",
        position: params.position ?? 0,
      })
      .onConflictDoNothing({ target: [topic.environmentId, topic.key] })
      .returning();
    if (!row) {
      throw new ContactError(
        "topic_exists",
        `A topic with the key "${params.key}" already exists.`,
        { param: "key" },
      );
    }
    return toTopicObject(row);
  });
}

/** The key is fixed: emails already sent with that category point at it. */
export async function updateTopic(
  env: ContactEnvironment,
  id: string,
  params: {
    name?: string;
    description?: string | null;
    default_subscription?: TopicRow["defaultSubscription"];
    visibility?: TopicRow["visibility"];
    position?: number;
  },
): Promise<TopicOutput | null> {
  if (!isId("topic", id)) return null;
  const changes = {
    ...(params.name === undefined ? {} : { name: params.name }),
    ...(params.description === undefined ? {} : { description: params.description }),
    ...(params.default_subscription === undefined
      ? {}
      : { defaultSubscription: params.default_subscription }),
    ...(params.visibility === undefined ? {} : { visibility: params.visibility }),
    ...(params.position === undefined ? {} : { position: params.position }),
  };
  if (Object.keys(changes).length === 0) return getTopic(env, id);
  const [row] = await db
    .update(topic)
    .set(changes)
    .where(and(inContactEnvironment(topic, env), eq(topic.id, id)))
    .returning();
  return row ? toTopicObject(row) : null;
}

/**
 * Deletes the topic and every contact's choice for it. Refused while a segment filters on it.
 * Returns whether it existed.
 */
export async function deleteTopic(env: ContactEnvironment, id: string): Promise<boolean> {
  const row = await topicRow(env, id);
  if (!row) return false;
  return db.transaction(async (tx) => {
    await lockSegmentReferences(tx, env);
    const [used] = await tx
      .select({ name: segment.name })
      .from(segment)
      .where(
        and(
          inContactEnvironment(segment, env),
          sql`jsonb_path_exists(${segment.filter}, '$.** ? (@.field == "topic" && @.topic == $key)', jsonb_build_object('key', ${row.key}::text))`,
        ),
      )
      .limit(1);
    if (used) {
      throw new ContactError(
        "topic_in_use",
        `The segment "${used.name}" filters on this topic: change it first.`,
      );
    }
    await assertNoBroadcastUses(env, { topic: row.key }, tx);
    const deleted = await tx
      .delete(topic)
      .where(and(inContactEnvironment(topic, env), eq(topic.id, id)))
      .returning({ id: topic.id });
    return deleted.length > 0;
  });
}
