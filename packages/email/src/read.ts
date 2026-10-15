/** Read side of the email product. Needs no providers, so the dashboard can use it directly. */
import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, asc, desc, eq, inArray, type SQL, sql } from "drizzle-orm";
import {
  attachmentsByEmail,
  type EmailAttachmentMetadata,
  toAttachmentObject,
} from "./attachments.ts";
import type { EmailEventOutput, EmailLinkOutput, EmailObjectOutput } from "./schemas.ts";

export type EmailRow = typeof schema.email.$inferSelect;
export type EmailRecipientRow = typeof schema.emailRecipient.$inferSelect;

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

/** Every event of one email is returned at once; an email has at most 50 recipients. */
const MAX_EVENTS = 1000;

const { email, emailEvent, emailLink, emailRecipient, environment } = schema;

/** Every tracked link of one email is returned at once. */
const MAX_LINKS = 1000;

type TrackingColumns = Pick<
  EmailRow,
  | "trackOpens"
  | "trackClicks"
  | "openCount"
  | "firstOpenedAt"
  | "lastOpenedAt"
  | "clickCount"
  | "firstClickedAt"
  | "lastClickedAt"
>;

function trackingObject(row: TrackingColumns): EmailObjectOutput["tracking"] {
  return {
    opens: row.trackOpens,
    clicks: row.trackClicks,
    open_count: row.openCount,
    first_opened_at: row.firstOpenedAt?.toISOString() ?? null,
    last_opened_at: row.lastOpenedAt?.toISOString() ?? null,
    click_count: row.clickCount,
    first_clicked_at: row.firstClickedAt?.toISOString() ?? null,
    last_clicked_at: row.lastClickedAt?.toISOString() ?? null,
  };
}

export function toEmailObject(
  row: EmailRow,
  opts: {
    sandbox: boolean;
    recipients: EmailRecipientRow[];
    attachments: EmailAttachmentMetadata[];
  },
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
    attachments: opts.attachments.map(toAttachmentObject),
    sandbox: opts.sandbox,
    tracking: trackingObject(row),
    created_at: row.createdAt.toISOString(),
    sent_at: row.sentAt?.toISOString() ?? null,
    scheduled_at: row.scheduledAt?.toISOString() ?? null,
    batch_id: row.batchId,
    template: row.templateId
      ? {
          id: row.templateId,
          version: row.templateVersion,
          locale: row.templateLocale ?? "",
        }
      : null,
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

/** Wire objects for rows of one organization, with their recipients and attachment metadata. */
export async function toEmailObjects(
  organizationId: string,
  rows: { email: EmailRow; sandbox: boolean }[],
): Promise<EmailObjectOutput[]> {
  const ids = rows.map((row) => row.email.id);
  const [recipients, attachments] = await Promise.all([
    recipientsByEmail(organizationId, ids),
    attachmentsByEmail(organizationId, ids),
  ]);
  return rows.map((row) =>
    toEmailObject(row.email, {
      sandbox: row.sandbox,
      recipients: recipients.get(row.email.id) ?? [],
      attachments: attachments.get(row.email.id) ?? [],
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

/**
 * A row of the dashboard's email list: what the table shows, never the content, headers,
 * recipients or attachments (bodies can be megabytes each).
 */
export type EmailListItem = Pick<
  EmailObjectOutput,
  "id" | "to" | "subject" | "status" | "sandbox" | "tracking" | "created_at" | "scheduled_at"
>;

/** Newest first; `limit` defaults to 50 and is capped at 100. One query. */
export type EmailListFilters = {
  /** Only emails in these statuses. */
  status?: EmailObjectOutput["status"][];
  /** A case-insensitive substring of the subject or a `to` address. */
  query?: string;
  /** Only emails older than this one (keyset cursor: an email id of the same environment). */
  before?: string;
};

/** `%`, `_` and `\` match themselves in an ILIKE pattern. */
function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

function clampLimit(value: number | undefined): number {
  const requested = Math.trunc(value ?? DEFAULT_LIST_LIMIT);
  return Number.isFinite(requested)
    ? Math.min(Math.max(requested, 1), MAX_LIST_LIMIT)
    : DEFAULT_LIST_LIMIT;
}

export async function listEmails(
  input: {
    organizationId: string;
    environmentId: string;
    limit?: number;
  } & EmailListFilters,
): Promise<EmailListItem[]> {
  return selectEmailList(input, clampLimit(input.limit));
}

async function selectEmailList(
  input: { organizationId: string; environmentId: string } & EmailListFilters,
  rowLimit: number,
): Promise<EmailListItem[]> {
  const conditions: SQL[] = [
    eq(email.organizationId, input.organizationId),
    eq(email.environmentId, input.environmentId),
  ];
  if (input.status && input.status.length > 0) {
    conditions.push(inArray(email.status, input.status));
  }
  const query = input.query?.trim();
  if (query) {
    const pattern = likePattern(query);
    conditions.push(
      sql`(${email.subject} ilike ${pattern} or array_to_string(${email.to}, ' ') ilike ${pattern})`,
    );
  }
  if (input.before !== undefined) {
    // Keyset on the list's order; a cursor from another environment (or none) matches nothing.
    conditions.push(
      sql`(${email.createdAt}, ${email.id}) < (
        select c.created_at, c.id from ${email} c
        where c.id = ${input.before}
          and c.organization_id = ${input.organizationId}
          and c.environment_id = ${input.environmentId}
      )`,
    );
  }
  const rows = await db
    .select({
      id: email.id,
      to: email.to,
      subject: email.subject,
      status: email.status,
      mode: environment.mode,
      trackOpens: email.trackOpens,
      trackClicks: email.trackClicks,
      openCount: email.openCount,
      firstOpenedAt: email.firstOpenedAt,
      lastOpenedAt: email.lastOpenedAt,
      clickCount: email.clickCount,
      firstClickedAt: email.firstClickedAt,
      lastClickedAt: email.lastClickedAt,
      createdAt: email.createdAt,
      scheduledAt: email.scheduledAt,
    })
    .from(email)
    .innerJoin(
      environment,
      and(
        eq(environment.id, email.environmentId),
        eq(environment.organizationId, email.organizationId),
      ),
    )
    .where(and(...conditions))
    // As in selectEmailsWithMode: the (environment_id, created_at DESC NULLS LAST) index.
    .orderBy(sql`${email.createdAt} desc nulls last`, desc(email.id))
    .limit(rowLimit);
  return rows.map((row) => ({
    id: row.id,
    to: row.to,
    subject: row.subject,
    status: row.status,
    sandbox: row.mode === "sandbox",
    tracking: trackingObject(row),
    created_at: row.createdAt.toISOString(),
    scheduled_at: row.scheduledAt?.toISOString() ?? null,
  }));
}

/**
 * One page of `listEmails` and the cursor of the next (older) page, `null` on the last one: the
 * dashboard's email list.
 */
export async function listEmailsPage(
  input: { organizationId: string; environmentId: string; limit?: number } & EmailListFilters,
): Promise<{ items: EmailListItem[]; nextCursor: string | null }> {
  const limit = clampLimit(input.limit);
  // One row more than the page tells whether another page follows.
  const rows = await selectEmailList(input, limit + 1);
  const items = rows.slice(0, limit);
  return { items, nextCursor: rows.length > limit ? (items.at(-1)?.id ?? null) : null };
}

export type EmailActivityDay = {
  /** The UTC day, `YYYY-MM-DD`. */
  date: string;
} & Record<EmailObjectOutput["status"], number>;

export type EmailActivity = {
  days: EmailActivityDay[];
  totals: Record<EmailObjectOutput["status"], number> & {
    /** Emails sent with open (click) tracking on, and how many of them were opened (clicked). */
    trackedOpens: number;
    opened: number;
    trackedClicks: number;
    clicked: number;
  };
};

const EMAIL_STATUSES = ["queued", "sent", "failed", "scheduled", "canceled"] as const;

/**
 * An environment's emails per UTC day by their current status, from the day of `since` up to
 * `now`, plus engagement totals: the dashboard's overview. Days without emails are zero.
 */
export async function emailActivity(input: {
  organizationId: string;
  environmentId: string;
  since: Date;
  now?: Date;
}): Promise<EmailActivity> {
  const now = input.now ?? new Date();
  const start = new Date(
    Date.UTC(input.since.getUTCFullYear(), input.since.getUTCMonth(), input.since.getUTCDate()),
  );
  const day = sql<string>`to_char(date_trunc('day', ${email.createdAt}, 'UTC'), 'YYYY-MM-DD')`;
  const rows = await db
    .select({
      day,
      status: email.status,
      count: sql<number>`count(*)::int`,
      trackedOpens: sql<number>`(count(*) filter (where ${email.trackOpens}))::int`,
      opened: sql<number>`(count(*) filter (where ${email.openCount} > 0))::int`,
      trackedClicks: sql<number>`(count(*) filter (where ${email.trackClicks}))::int`,
      clicked: sql<number>`(count(*) filter (where ${email.clickCount} > 0))::int`,
    })
    .from(email)
    .where(
      and(
        eq(email.organizationId, input.organizationId),
        eq(email.environmentId, input.environmentId),
        sql`${email.createdAt} >= ${start.toISOString()}`,
        sql`${email.createdAt} < ${now.toISOString()}`,
      ),
    )
    .groupBy(day, email.status);

  const zero = () =>
    Object.fromEntries(EMAIL_STATUSES.map((status) => [status, 0])) as Record<
      EmailObjectOutput["status"],
      number
    >;
  const days: EmailActivityDay[] = [];
  for (let at = start.getTime(); at < now.getTime(); at += 86_400_000) {
    days.push({ date: new Date(at).toISOString().slice(0, 10), ...zero() });
  }
  const byDate = new Map(days.map((entry) => [entry.date, entry]));
  const totals: EmailActivity["totals"] = {
    ...zero(),
    trackedOpens: 0,
    opened: 0,
    trackedClicks: 0,
    clicked: 0,
  };
  for (const row of rows) {
    const entry = byDate.get(row.day);
    if (entry) entry[row.status] += row.count;
    totals[row.status] += row.count;
    totals.trackedOpens += row.trackedOpens;
    totals.opened += row.opened;
    totals.trackedClicks += row.trackedClicks;
    totals.clicked += row.clicked;
  }
  return { days, totals };
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

export function toEmailLinkObject(row: typeof emailLink.$inferSelect): EmailLinkOutput {
  return {
    object: "email_link",
    id: row.id,
    email_id: row.emailId,
    position: row.position,
    url: row.url,
    click_count: row.clickCount,
    first_clicked_at: row.firstClickedAt?.toISOString() ?? null,
    last_clicked_at: row.lastClickedAt?.toISOString() ?? null,
  };
}

/**
 * Tracked links of one email of an environment, in document order; `null` when the email is not
 * found. Empty unless the email was sent with click tracking.
 */
export async function listEmailLinks(input: {
  organizationId: string;
  environmentId: string;
  emailId: string;
}): Promise<{ links: EmailLinkOutput[]; hasMore: boolean } | null> {
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
    .from(emailLink)
    .where(and(eq(emailLink.organizationId, input.organizationId), eq(emailLink.emailId, found.id)))
    .orderBy(asc(emailLink.position))
    .limit(MAX_LINKS + 1);
  return {
    links: rows.slice(0, MAX_LINKS).map(toEmailLinkObject),
    hasMore: rows.length > MAX_LINKS,
  };
}
