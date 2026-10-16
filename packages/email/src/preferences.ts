/**
 * The preference center behind marketing email's links (`/t/u/*`): what a recipient sees and
 * changes about the email an environment sends them. System-level: the environment comes from
 * the decrypted link, and every read and write is scoped by that environment's organization.
 *
 * A recipient with no contact row (a send to a non-contact) who changes anything becomes a
 * contact, so the choice is remembered; that never counts against the plan's limit (an opt-out
 * is never refused). Nothing here runs on a GET: mail scanners fetch every link.
 */
import { db, type Executor, schema } from "@coss/db";
import { and, eq, sql } from "drizzle-orm";
import {
  announceContact,
  applyTopicChoices,
  type ContactRow,
  lockContactCounter,
  reserveContacts,
  topicReaches,
} from "./contacts.ts";
import { COSS_EVENT_SOURCE, recordProviderEvent } from "./events.ts";
import type { LinkPayload } from "./link-tokens.ts";
import { type TopicRow, topicsByKey } from "./topics.ts";

const { contact, contactTopic, environment, marketingSettings, organization } = schema;

export type PreferenceTopic = {
  key: string;
  name: string;
  description: string | null;
  /** Whether its emails reach the recipient now. */
  subscribed: boolean;
};

export type PreferenceContext = {
  environmentId: string;
  organizationId: string;
  /** Whose emails these are: the marketing settings' sender name, else the organization's. */
  displayName: string;
  address: string;
  /** `null`: not a contact (yet). */
  status: ContactRow["status"] | null;
  /** Public topics, plus the link's own topic even if private. */
  topics: PreferenceTopic[];
  /** The topic the email was about, if it still exists. */
  linkTopic: { key: string; name: string } | null;
};

type Scope = { organizationId: string; environmentId: string; projectId: string };

async function scopeOf(
  link: LinkPayload,
  executor: Executor = db,
): Promise<(Scope & { displayName: string }) | null> {
  const [row] = await executor
    .select({
      organizationId: environment.organizationId,
      projectId: environment.projectId,
      environmentId: environment.id,
      organizationName: organization.name,
      displayName: marketingSettings.displayName,
    })
    .from(environment)
    .innerJoin(organization, eq(organization.id, environment.organizationId))
    .leftJoin(
      marketingSettings,
      and(
        eq(marketingSettings.environmentId, environment.id),
        eq(marketingSettings.organizationId, environment.organizationId),
      ),
    )
    .where(eq(environment.id, link.environmentId))
    .limit(1);
  if (!row) return null;
  return {
    organizationId: row.organizationId,
    projectId: row.projectId,
    environmentId: row.environmentId,
    displayName: row.displayName ?? row.organizationName,
  };
}

async function contactOf(
  scope: Scope,
  address: string,
  executor: Executor,
  lock = false,
): Promise<ContactRow | null> {
  const query = executor
    .select()
    .from(contact)
    .where(
      and(
        eq(contact.organizationId, scope.organizationId),
        eq(contact.environmentId, scope.environmentId),
        eq(contact.address, address),
      ),
    )
    .limit(1);
  const [row] = lock ? await query.for("update") : await query;
  return row ?? null;
}

async function choicesOf(
  row: ContactRow | null,
  executor: Executor,
): Promise<Map<string, "opted_in" | "opted_out">> {
  if (!row) return new Map();
  const rows = await executor
    .select({ topicId: contactTopic.topicId, status: contactTopic.status })
    .from(contactTopic)
    .where(
      and(eq(contactTopic.contactId, row.id), eq(contactTopic.organizationId, row.organizationId)),
    );
  return new Map(rows.map((choice) => [choice.topicId, choice.status]));
}

function visibleTopics(topics: Map<string, TopicRow>, linkTopic: string | null): TopicRow[] {
  return [...topics.values()].filter(
    (topic) => topic.visibility === "public" || topic.key === linkTopic,
  );
}

/** What the recipient of `link` sees; `null` when its environment no longer exists. */
export async function loadPreferences(link: LinkPayload): Promise<PreferenceContext | null> {
  const scope = await scopeOf(link);
  if (!scope) return null;
  const env = { organizationId: scope.organizationId, environmentId: scope.environmentId };
  const [row, topics] = await Promise.all([contactOf(scope, link.address, db), topicsByKey(env)]);
  const choices = await choicesOf(row, db);
  // A non-contact gets what an opt-in topic gives everyone.
  const subscribed = row ? row.status === "subscribed" : true;
  const own = link.topic ? topics.get(link.topic) : undefined;
  return {
    environmentId: scope.environmentId,
    organizationId: scope.organizationId,
    displayName: scope.displayName,
    address: link.address,
    status: row?.status ?? null,
    topics: visibleTopics(topics, link.topic).map((topic) => ({
      key: topic.key,
      name: topic.name,
      description: topic.description,
      subscribed: subscribed && topicReaches(topic, choices.get(topic.id) ?? null),
    })),
    linkTopic: own ? { key: own.key, name: own.name } : null,
  };
}

export type PreferenceChange =
  /** One-click (RFC 8058) and the body's unsubscribe link: the link's topic, else everything. */
  | { kind: "unsubscribe" }
  | { kind: "unsubscribe_all" }
  /** The preference form: overall consent and each shown topic. */
  | { kind: "save"; subscribed: boolean; topics: Record<string, boolean> };

/** The contact of `address`, created (unsubscribed) if there is none; whether it was created. */
async function contactFor(
  tx: Executor,
  scope: Scope,
  address: string,
  now: Date,
): Promise<{ row: ContactRow; created: boolean }> {
  const existing = await contactOf(scope, address, tx, true);
  if (existing) return { row: existing, created: false };
  const env = { organizationId: scope.organizationId, environmentId: scope.environmentId };
  await lockContactCounter(tx, env);
  const [inserted] = await tx
    .insert(contact)
    .values({
      organizationId: scope.organizationId,
      projectId: scope.projectId,
      environmentId: scope.environmentId,
      address,
      status: "unsubscribed",
      source: "preference_center",
      unsubscribedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: [contact.environmentId, contact.address] })
    .returning();
  if (inserted) {
    // An opt-out is never refused: counted, but not against the plan's limit.
    await reserveContacts(
      tx,
      { organizationId: scope.organizationId, environmentId: scope.environmentId },
      1,
      {},
      { bypassLimit: true },
    );
    return { row: inserted, created: true };
  }
  const raced = await contactOf(scope, address, tx, true);
  if (!raced) throw new Error("The contact disappeared; retry.");
  return { row: raced, created: false };
}

async function setStatus(
  tx: Executor,
  row: ContactRow,
  status: "subscribed" | "unsubscribed",
  now: Date,
): Promise<ContactRow> {
  if (row.status === status) return row;
  const [updated] = await tx
    .update(contact)
    .set(
      status === "subscribed"
        ? { status, subscribedAt: now, unsubscribedAt: null, pendingSince: null, updatedAt: now }
        : { status, unsubscribedAt: now, pendingSince: null, updatedAt: now },
    )
    .where(and(eq(contact.id, row.id), eq(contact.organizationId, row.organizationId)))
    .returning();
  return updated ?? row;
}

/**
 * Applies the recipient's change. Returns `false` when the environment no longer exists. Sends
 * `contact.unsubscribed` (with the topic, for a topic) or `contact.updated` webhooks.
 */
/**
 * An unsubscribe through an email's own link is also that email's `email.unsubscribed` event (once
 * per email, like one-click unsubscribe's), while the email still exists.
 */
async function recordEmailUnsubscribe(tx: Executor, link: LinkPayload, now: Date): Promise<void> {
  if (!link.emailId) return;
  const [found] = await tx
    .select({ id: schema.email.id })
    .from(schema.email)
    .where(
      and(eq(schema.email.id, link.emailId), eq(schema.email.environmentId, link.environmentId)),
    )
    .limit(1);
  if (!found) return;
  await recordProviderEvent(tx, {
    provider: COSS_EVENT_SOURCE,
    providerEventType: "Unsubscribe",
    emailId: found.id,
    providerMessageId: null,
    type: "email.unsubscribed",
    recipients: [link.address],
    occurredAt: now,
    sourceId: "unsubscribe",
    data: {},
  });
}

export async function applyPreferences(
  link: LinkPayload,
  change: PreferenceChange,
  now: Date = new Date(),
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const scope = await scopeOf(link, tx);
    if (!scope) return false;
    const env = { organizationId: scope.organizationId, environmentId: scope.environmentId };
    const topics = await topicsByKey(env);
    const { row: found, created } = await contactFor(tx, scope, link.address, now);
    let row = found;
    if (created) await announceContact(tx, row, "contact.created", "preference_center", now);

    if (change.kind === "unsubscribe") {
      const topic = link.topic ? topics.get(link.topic) : undefined;
      if (topic) {
        await applyTopicChoices(
          tx,
          row,
          topics,
          [{ topic: topic.key, status: "opted_out" }],
          "preference_center",
        );
        await announceContact(tx, row, "contact.unsubscribed", "preference_center", now, topic.key);
        await recordEmailUnsubscribe(tx, link, now);
        return true;
      }
      row = await setStatus(tx, row, "unsubscribed", now);
      await announceContact(tx, row, "contact.unsubscribed", "preference_center", now);
      await recordEmailUnsubscribe(tx, link, now);
      return true;
    }

    if (change.kind === "unsubscribe_all") {
      row = await setStatus(tx, row, "unsubscribed", now);
      await applyTopicChoices(
        tx,
        row,
        topics,
        [...topics.keys()].map((key) => ({ topic: key, status: "opted_out" as const })),
        "preference_center",
      );
      await announceContact(tx, row, "contact.unsubscribed", "preference_center", now);
      await recordEmailUnsubscribe(tx, link, now);
      return true;
    }

    // Only the topics the page showed can be changed through it.
    const shown = new Set(visibleTopics(topics, link.topic).map((topic) => topic.key));
    const choices = Object.entries(change.topics)
      .filter(([key]) => shown.has(key))
      .map(([key, on]) => ({
        topic: key,
        status: on ? ("opted_in" as const) : ("opted_out" as const),
      }));
    const wasSubscribed = row.status === "subscribed";
    row = await setStatus(tx, row, change.subscribed ? "subscribed" : "unsubscribed", now);
    await applyTopicChoices(tx, row, topics, choices, "preference_center");
    await tx
      .update(contact)
      .set({ updatedAt: now })
      .where(and(eq(contact.id, row.id), eq(contact.organizationId, row.organizationId)));
    await announceContact(
      tx,
      row,
      wasSubscribed && !change.subscribed ? "contact.unsubscribed" : "contact.updated",
      "preference_center",
      now,
    );
    return true;
  });
}

/** How a confirmation link fared. */
export type ConfirmationOutcome = "confirmed" | "already_confirmed" | "invalid";

/**
 * Confirms a pending contact (double opt-in): only while it is still pending since before the
 * link was issued, so a link from an earlier subscription, or used after an unsubscribe, does
 * nothing. Sends `contact.confirmed`.
 */
export async function confirmContact(
  link: LinkPayload,
  now: Date = new Date(),
): Promise<ConfirmationOutcome> {
  return db.transaction(async (tx) => {
    const scope = await scopeOf(link, tx);
    if (!scope) return "invalid";
    // Tokens carry whole seconds.
    const issuedBefore = new Date(link.issuedAt.getTime() + 1000);
    const [confirmed] = await tx
      .update(contact)
      .set({
        status: "subscribed",
        subscribedAt: now,
        confirmedAt: now,
        pendingSince: null,
        unsubscribedAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(contact.organizationId, scope.organizationId),
          eq(contact.environmentId, scope.environmentId),
          eq(contact.address, link.address),
          eq(contact.status, "pending"),
          sql`${contact.pendingSince} < ${issuedBefore.toISOString()}::timestamptz`,
        ),
      )
      .returning();
    if (confirmed) {
      await announceContact(tx, confirmed, "contact.confirmed", "preference_center", now);
      return "confirmed";
    }
    const current = await contactOf(scope, link.address, tx);
    return current?.status === "subscribed" && current.confirmedAt
      ? "already_confirmed"
      : "invalid";
  });
}

/** `j•••@example.com`: enough to recognise the address, not to harvest it. */
export function maskAddress(address: string): string {
  const at = address.lastIndexOf("@");
  if (at <= 0) return "•••";
  return `${address[0]}•••${address.slice(at)}`;
}
