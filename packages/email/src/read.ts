/** Read side of the email product. Needs no providers, so the dashboard can use it directly. */
import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, asc, desc, eq, inArray, type SQL, sql } from "drizzle-orm";
import type { EmailEventOutput, EmailObjectOutput } from "./schemas.ts";

export type EmailRow = typeof schema.email.$inferSelect;
export type EmailRecipientRow = typeof schema.emailRecipient.$inferSelect;

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

/** Every event of one email is returned at once; an email has at most 50 recipients. */
const MAX_EVENTS = 1000;

const { email, emailEvent, emailRecipient, environment } = schema;

export function toEmailObject(
  row: EmailRow,
  opts: { sandbox: boolean; recipients: EmailRecipientRow[] },
): EmailObjectOutput {
  return {
    object: "email",
    id: row.id,
    from: row.from,
    to: row.to,
    cc: row.cc,
    bcc: row.bcc,
    reply_to: row.replyTo,
    subject: row.subject,
    html: row.html,
    text: row.text,
    headers: row.headers,
    tags: row.tags,
    category: row.category,
    status: row.status,
    recipients: opts.recipients.map((recipient) => ({
      address: recipient.address,
      type: recipient.kind,
      status: recipient.status,
      last_event_at: recipient.lastEventAt?.toISOString() ?? null,
    })),
    sandbox: opts.sandbox,
    created_at: row.createdAt.toISOString(),
    sent_at: row.sentAt?.toISOString() ?? null,
  };
}

/** Email rows joined with their environment's mode, scoped by organization. */
export async function selectEmailsWithMode(
  organizationId: string,
  where: SQL | undefined,
  limit: number,
): Promise<{ email: EmailRow; sandbox: boolean }[]> {
  const rows = await db
    .select({ email, mode: environment.mode })
    .from(email)
    .innerJoin(
      environment,
      and(
        eq(environment.id, email.environmentId),
        eq(environment.organizationId, email.organizationId),
      ),
    )
    .where(and(eq(email.organizationId, organizationId), where))
    // Matches the (environment_id, created_at DESC NULLS LAST) index; ids break ties in time order.
    .orderBy(sql`${email.createdAt} desc nulls last`, desc(email.id))
    .limit(limit);
  return rows.map((row) => ({ email: row.email, sandbox: row.mode === "sandbox" }));
}

/** Recipients of the given emails (one organization), grouped by email id in send order. */
export async function recipientsByEmail(
  organizationId: string,
  emailIds: string[],
): Promise<Map<string, EmailRecipientRow[]>> {
  const grouped = new Map<string, EmailRecipientRow[]>();
  if (emailIds.length === 0) return grouped;
  const rows = await db
    .select()
    .from(emailRecipient)
    .where(
      and(
        eq(emailRecipient.organizationId, organizationId),
        inArray(emailRecipient.emailId, emailIds),
      ),
    )
    .orderBy(asc(emailRecipient.emailId), asc(emailRecipient.position));
  for (const row of rows) {
    const list = grouped.get(row.emailId);
    if (list) list.push(row);
    else grouped.set(row.emailId, [row]);
  }
  return grouped;
}

/** Wire objects for rows of one organization, with their recipients. */
export async function toEmailObjects(
  organizationId: string,
  rows: { email: EmailRow; sandbox: boolean }[],
): Promise<EmailObjectOutput[]> {
  const recipients = await recipientsByEmail(
    organizationId,
    rows.map((row) => row.email.id),
  );
  return rows.map((row) =>
    toEmailObject(row.email, {
      sandbox: row.sandbox,
      recipients: recipients.get(row.email.id) ?? [],
    }),
  );
}

/** One email of an environment. Malformed, unknown and foreign ids are all `null`. */
export async function getEmail(input: {
  organizationId: string;
  environmentId: string;
  id: string;
}): Promise<EmailObjectOutput | null> {
  if (!isId("email", input.id)) return null;
  const [row] = await selectEmailsWithMode(
    input.organizationId,
    and(eq(email.environmentId, input.environmentId), eq(email.id, input.id)),
    1,
  );
  if (!row) return null;
  const [object] = await toEmailObjects(input.organizationId, [row]);
  return object ?? null;
}

/** Newest first; `limit` defaults to 50 and is capped at 100. */
export async function listEmails(input: {
  organizationId: string;
  environmentId: string;
  limit?: number;
}): Promise<EmailObjectOutput[]> {
  const requested = Math.trunc(input.limit ?? DEFAULT_LIST_LIMIT);
  const limit = Number.isFinite(requested)
    ? Math.min(Math.max(requested, 1), MAX_LIST_LIMIT)
    : DEFAULT_LIST_LIMIT;
  const rows = await selectEmailsWithMode(
    input.organizationId,
    eq(email.environmentId, input.environmentId),
    limit,
  );
  return toEmailObjects(input.organizationId, rows);
}

export function toEmailEventObject(row: typeof emailEvent.$inferSelect): EmailEventOutput {
  return {
    object: "email_event",
    id: row.id,
    email_id: row.emailId,
    type: row.type,
    recipient: row.recipient,
    occurred_at: row.occurredAt.toISOString(),
    data: row.details,
  };
}

/** Events of one email of an environment, oldest first; `null` when the email is not found. */
export async function listEmailEvents(input: {
  organizationId: string;
  environmentId: string;
  emailId: string;
}): Promise<{ events: EmailEventOutput[]; hasMore: boolean } | null> {
  if (!isId("email", input.emailId)) return null;
  const [found] = await db
    .select({ id: email.id })
    .from(email)
    .where(
      and(
        eq(email.organizationId, input.organizationId),
        eq(email.environmentId, input.environmentId),
        eq(email.id, input.emailId),
      ),
    )
    .limit(1);
  if (!found) return null;
  const rows = await db
    .select()
    .from(emailEvent)
    .where(
      and(eq(emailEvent.organizationId, input.organizationId), eq(emailEvent.emailId, found.id)),
    )
    // Ids are time-ordered (UUIDv7), so they order events recorded with the same timestamp.
    .orderBy(asc(emailEvent.occurredAt), asc(emailEvent.id))
    .limit(MAX_EVENTS + 1);
  return {
    events: rows.slice(0, MAX_EVENTS).map(toEmailEventObject),
    hasMore: rows.length > MAX_EVENTS,
  };
}
