/**
 * Who a marketing email to an audience or segment goes to, evaluated page by page as it is read:
 * contacts that are `subscribed`, that the topic (if any) reaches, and that no suppression stops
 * (`*`, `stream:marketing`, or the topic's category). Keyset-paged by contact id so a long
 * fan-out can resume where it stopped, and bounded by `before` (an id: contacts created after the
 * fan-out began are left out).
 */
import { db, schema } from "@coss/db";
import { and, asc, eq, gt, lt, type SQL, sql } from "drizzle-orm";
import {
  type ContactEnvironment,
  type ContactPropertyRow,
  inContactEnvironment,
  propertyDefinitions,
} from "./contact-properties.ts";
import type { SegmentFilterOutput } from "./contact-schemas.ts";
import { type ContactRow, getContactRow } from "./contacts.ts";
import { ContactError } from "./errors.ts";
import { ALL_CATEGORIES, MARKETING_STREAM_SCOPE } from "./schemas.ts";
import { compileSegmentFilter, getSegmentRow, topicReachesSql } from "./segments.ts";
import { topicsByKey } from "./topics.ts";

const { audience, audienceMember, contact, emailSuppression } = schema;

export type RecipientTarget = { audienceId: string } | { segmentId: string };

export type ContactRecipient = Pick<
  ContactRow,
  "id" | "address" | "firstName" | "lastName" | "properties"
>;

export type RecipientOptions = {
  /** The topic (its key) the email is about; `null`: marketing in general. */
  topic?: string | null;
  /** Only contacts with a smaller id (created before the fan-out started). */
  before?: string;
};

async function targetSql(env: ContactEnvironment, target: RecipientTarget): Promise<SQL> {
  if ("audienceId" in target) {
    const [row] = await db
      .select({ id: audience.id })
      .from(audience)
      .where(and(inContactEnvironment(audience, env), eq(audience.id, target.audienceId)))
      .limit(1);
    if (!row) throw new ContactError("not_found", "Audience not found.");
    return sql`exists (
      select 1 from ${audienceMember}
      where ${audienceMember.audienceId} = ${row.id}
        and ${audienceMember.contactId} = ${contact.id}
        and ${audienceMember.organizationId} = ${contact.organizationId}
    )`;
  }
  const row = await getSegmentRow(env, target.segmentId);
  if (!row) throw new ContactError("not_found", "Segment not found.");
  return compileSegmentFilter(env, row.filter as SegmentFilterOutput);
}

/** The consent and deliverability conditions of a marketing email (about `topic`). */
async function eligibleSql(
  env: ContactEnvironment,
  topic: string | null | undefined,
): Promise<SQL> {
  const scopes = [ALL_CATEGORIES, MARKETING_STREAM_SCOPE, ...(topic ? [topic] : [])];
  // The environment's own list: a sub-account's suppressions are about its mail only.
  const unsuppressed = sql`not exists (
    select 1 from ${emailSuppression}
    where ${emailSuppression.environmentId} = ${contact.environmentId}
      and ${emailSuppression.organizationId} = ${contact.organizationId}
      and ${emailSuppression.address} = ${contact.address}
      and ${emailSuppression.subaccountId} is null
      and ${emailSuppression.scope} in (${sql.join(
        scopes.map((scope) => sql`${scope}`),
        sql`, `,
      )})
  )`;
  const parts: SQL[] = [eq(contact.status, "subscribed"), unsuppressed];
  if (topic) {
    const row = (await topicsByKey(env, [topic])).get(topic);
    if (!row) throw new ContactError("topic_not_found", `No topic with the key "${topic}" exists.`);
    parts.push(topicReachesSql(row));
  }
  return and(...parts) as SQL;
}

async function recipientsWhere(
  env: ContactEnvironment,
  target: RecipientTarget,
  opts: RecipientOptions,
): Promise<SQL> {
  return and(
    inContactEnvironment(contact, env),
    await targetSql(env, target),
    await eligibleSql(env, opts.topic),
    opts.before ? lt(contact.id, opts.before) : undefined,
  ) as SQL;
}

/**
 * The next page of recipients after `after` (a contact id), ascending; `next` is the cursor of
 * the following page (`null`: done).
 */
export async function resolveRecipients(
  env: ContactEnvironment,
  target: RecipientTarget,
  opts: RecipientOptions & { after?: string; limit?: number } = {},
): Promise<{ recipients: ContactRecipient[]; next: string | null }> {
  const limit = opts.limit ?? 500;
  const rows = await db
    .select({
      id: contact.id,
      address: contact.address,
      firstName: contact.firstName,
      lastName: contact.lastName,
      properties: contact.properties,
    })
    .from(contact)
    .where(
      and(
        await recipientsWhere(env, target, opts),
        opts.after ? gt(contact.id, opts.after) : undefined,
      ),
    )
    .orderBy(asc(contact.id))
    .limit(limit);
  return {
    recipients: rows,
    next: rows.length === limit ? (rows.at(-1)?.id ?? null) : null,
  };
}

/** How many contacts a send to `target` would reach now. */
export async function countRecipients(
  env: ContactEnvironment,
  target: RecipientTarget,
  opts: RecipientOptions = {},
): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(contact)
    .where(await recipientsWhere(env, target, opts));
  return row?.value ?? 0;
}

/**
 * The template variables of a contact: built-in fields plus every custom property, with the
 * property's fallback for contacts without a value (empty when there is none).
 */
export function contactVariables(
  recipient: Pick<ContactRecipient, "address" | "firstName" | "lastName" | "properties">,
  definitions: ReadonlyMap<string, Pick<ContactPropertyRow, "key" | "fallback">>,
): Record<string, string> {
  const variables: Record<string, string> = {
    email: recipient.address,
    first_name: recipient.firstName ?? "",
    last_name: recipient.lastName ?? "",
  };
  for (const [key, definition] of definitions) {
    const properties = recipient.properties as Record<string, unknown>;
    const value = (Object.hasOwn(properties, key) ? properties[key] : null) ?? definition.fallback;
    variables[key] = value === null || value === undefined ? "" : String(value);
  }
  return variables;
}

/** The variables of the contact named by id or address (test sends and previews). */
export async function variablesFor(
  env: ContactEnvironment,
  idOrEmail: string,
): Promise<Record<string, string> | null> {
  const row = await getContactRow(env, idOrEmail);
  return row ? contactVariables(row, await propertyDefinitions(env)) : null;
}
