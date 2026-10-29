/** Read side of the email product. Needs no providers, so the dashboard can use it directly. */
import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, asc, desc, eq, exists, gte, inArray, lt, type SQL, sql } from "drizzle-orm";
import {
  attachmentsByEmail,
  type EmailAttachmentMetadata,
  toAttachmentObject,
} from "./attachments.ts";
import { broadcastContents, withRenderedBody } from "./broadcast-content.ts";
import type {
  EmailBatchObjectOutput,
  EmailEventOutput,
  EmailLinkOutput,
  EmailObjectOutput,
  EmailRecipientStatus,
  EmailSummaryOutput,
} from "./schemas.ts";

export type EmailRow = typeof schema.email.$inferSelect;
export type EmailRecipientRow = typeof schema.emailRecipient.$inferSelect;

/** The public message of `provider_error` (also the `email.failed` event's). */
export const PROVIDER_ERROR_MESSAGE = "The email provider did not accept the email.";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

/** Every event of one email is returned at once; an email has at most 50 recipients. */
const MAX_EVENTS = 1000;

const { email, emailBatch, emailEvent, emailLink, emailRecipient, environment } = schema;

/** Every tracked link of one email is returned at once. */
const MAX_LINKS = 1000;

type TrackingColumns = Pick<
  EmailRow,
  | "trackOpens"
  | "trackClicks"
  | "unsubscribe"
  | "openCount"
  | "firstOpenedAt"
  | "lastOpenedAt"
  | "clickCount"
  | "firstClickedAt"
  | "lastClickedAt"
>;

function contentStorageObject(
  row: Pick<EmailRow, "storeContent" | "contentDiscardedAt">,
): EmailObjectOutput["content_storage"] {
  return {
    mode: row.storeContent ? "store" : "discard",
    discarded_at: row.contentDiscardedAt?.toISOString() ?? null,
  };
}

function trackingObject(row: TrackingColumns): EmailObjectOutput["tracking"] {
  return {
    opens: row.trackOpens,
    clicks: row.trackClicks,
    unsubscribe: row.unsubscribe,
    open_count: row.openCount,
    first_opened_at: row.firstOpenedAt?.toISOString() ?? null,
    last_opened_at: row.lastOpenedAt?.toISOString() ?? null,
    click_count: row.clickCount,
    first_clicked_at: row.firstClickedAt?.toISOString() ?? null,
    last_clicked_at: row.lastClickedAt?.toISOString() ?? null,
  };
}

/**
 * Why a failed email failed, as its `email.failed` event tells it. A provider's own error text is
 * internal (it can name accounts or infrastructure), so `provider_error` gets the event's message;
 * every other stored message is written by coss.com for the customer. Emails that haven't failed
 * have none: an error code on a queued email only marks a screening hold.
 */
export function emailFailure(
  row: Pick<EmailRow, "status" | "errorCode" | "errorMessage">,
): EmailObjectOutput["failure"] {
  if (row.status !== "failed" || row.errorCode === null) return null;
  if (row.errorCode === "provider_error") {
    return { code: row.errorCode, message: PROVIDER_ERROR_MESSAGE };
  }
  return { code: row.errorCode, message: row.errorMessage ?? "The email could not be sent." };
}

function toRecipientObject(recipient: EmailRecipientRow): EmailObjectOutput["recipients"][number] {
  return {
    address: recipient.address,
    type: recipient.kind,
    status: recipient.status,
    last_event_at: recipient.lastEventAt?.toISOString() ?? null,
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
    stream: row.stream,
    status: row.status,
    failure: emailFailure(row),
    recipients: opts.recipients.map(toRecipientObject),
    attachments: opts.attachments.map(toAttachmentObject),
    sandbox: opts.sandbox,
    tracking: trackingObject(row),
    created_at: row.createdAt.toISOString(),
    sent_at: row.sentAt?.toISOString() ?? null,
    scheduled_at: row.scheduledAt?.toISOString() ?? null,
    batch_id: row.batchId,
    template: templateReference(row),
    broadcast_id: row.broadcastId,
    subaccount_id: row.subaccountId,
    content_storage: contentStorageObject(row),
  };
}

/** The template an email was rendered from, if any. */
function templateReference(row: {
  templateId: string | null;
  templateVersion: number | null;
  templateLocale: string | null;
}): EmailObjectOutput["template"] {
  return row.templateId
    ? { id: row.templateId, version: row.templateVersion, locale: row.templateLocale ?? "" }
    : null;
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
  const [recipients, attachments, contents] = await Promise.all([
    recipientsByEmail(organizationId, ids),
    attachmentsByEmail(organizationId, ids),
    broadcastContents(
      organizationId,
      rows.flatMap((row) => (row.email.broadcastId ? [row.email.broadcastId] : [])),
    ),
  ]);
  return rows.map((row) =>
    toEmailObject(withRenderedBody(row.email, contents), {
      sandbox: row.sandbox,
      recipients: recipients.get(row.email.id) ?? [],
      attachments: attachments.get(row.email.id) ?? [],
    }),
  );
}

/**
 * The id of the email an idempotency key made in an environment, if any (an internal sender
 * recovering a send whose answer it lost).
 */
export async function emailIdForIdempotencyKey(input: {
  organizationId: string;
  environmentId: string;
  idempotencyKey: string;
}): Promise<string | null> {
  const [row] = await db
    .select({ id: email.id })
    .from(email)
    .where(
      and(
        eq(email.organizationId, input.organizationId),
        eq(email.environmentId, input.environmentId),
        eq(email.idempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1);
  return row?.id ?? null;
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

/** A batch with its emails in request order (those not yet purged by retention). */
export async function toEmailBatchObject(
  batch: typeof emailBatch.$inferSelect,
  sandbox: boolean,
): Promise<EmailBatchObjectOutput> {
  const rows = await db
    .select()
    .from(email)
    .where(and(eq(email.organizationId, batch.organizationId), eq(email.batchId, batch.id)))
    .orderBy(asc(email.batchIndex));
  return {
    object: "email_batch",
    id: batch.id,
    data: await toEmailObjects(
      batch.organizationId,
      rows.map((row) => ({ email: row, sandbox })),
    ),
    created_at: batch.createdAt.toISOString(),
  };
}

/** One batch of an environment. Malformed, unknown and foreign ids are all `null`. */
export async function getEmailBatch(input: {
  organizationId: string;
  environmentId: string;
  id: string;
}): Promise<EmailBatchObjectOutput | null> {
  if (!isId("batch", input.id)) return null;
  const [row] = await db
    .select({ batch: emailBatch, mode: environment.mode })
    .from(emailBatch)
    .innerJoin(
      environment,
      and(
        eq(environment.id, emailBatch.environmentId),
        eq(environment.organizationId, emailBatch.organizationId),
      ),
    )
    .where(
      and(
        eq(emailBatch.organizationId, input.organizationId),
        eq(emailBatch.environmentId, input.environmentId),
        eq(emailBatch.id, input.id),
      ),
    )
    .limit(1);
  if (!row) return null;
  return toEmailBatchObject(row.batch, row.mode === "sandbox");
}

/**
 * A row of the dashboard's email list: what the table shows, never the content, headers,
 * recipients or attachments (bodies can be megabytes each).
 */
export type EmailListItem = Pick<
  EmailObjectOutput,
  | "id"
  | "to"
  | "subject"
  | "status"
  | "sandbox"
  | "tracking"
  | "created_at"
  | "scheduled_at"
  | "content_storage"
>;

/** Newest first; `limit` defaults to 50 and is capped at 100. One query. */
export type EmailListFilters = {
  /** Only emails in these statuses. */
  status?: EmailObjectOutput["status"][];
  /** A case-insensitive substring of the subject or a `to` address. */
  query?: string;
  /** Only emails with this recipient (to, cc or bcc; a bare address, matched lower-cased). */
  recipient?: string;
  /** Only emails with a recipient in these statuses (with `recipient`: that recipient's). */
  recipientStatus?: EmailRecipientStatus[];
  /** Only emails with a tag of this name, and of this value when one is given. */
  tag?: { name: string; value?: string };
  /** Only emails of this category. */
  category?: string;
  /** Only emails sent from this domain or one of its subdomains; case-insensitive. */
  senderDomain?: string;
  /** Only the emails of this batch. */
  batchId?: string;
  /** Only the emails sent for this sub-account (its id). */
  subaccountId?: string;
  /** Only emails created at or after this time. */
  createdAfter?: Date;
  /** Only emails created before this time. */
  createdBefore?: Date;
  /** Only emails older than this one (keyset cursor: an email id of the same environment). */
  before?: string;
};

/** `%`, `_` and `\` match themselves in a LIKE pattern. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function likePattern(text: string): string {
  return `%${escapeLike(text)}%`;
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

/**
 * The domain of a stored `from` (`hello@acme.com` or `Acme <hello@acme.com>`): what follows the
 * last `@`, without the closing `>`. A display name can hold an `@`, the address always ends it.
 * Whitespace before the `>` is allowed, as `parseEmailAddress` trims the bracketed address.
 */
const senderDomainSql = sql<string>`lower(substring(${email.from} from '@([^@<>[:space:]]+)[[:space:]]*>?[[:space:]]*$'))`;

/** The SQL conditions of an email list (the dashboard's, its CSV export and the API's). */
function listConditions(
  input: { organizationId: string; environmentId: string } & EmailListFilters,
): SQL[] {
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
  const recipient = input.recipient?.trim().toLowerCase();
  const recipientStatus = input.recipientStatus ?? [];
  if (recipient || recipientStatus.length > 0) {
    // Recipient rows are found by (organization_id, address) when an address is given.
    const matches: SQL[] = [
      eq(emailRecipient.emailId, email.id),
      eq(emailRecipient.organizationId, input.organizationId),
    ];
    if (recipient) matches.push(eq(emailRecipient.address, recipient));
    if (recipientStatus.length > 0) matches.push(inArray(emailRecipient.status, recipientStatus));
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(emailRecipient)
          .where(and(...matches)),
      ),
    );
  }
  if (input.tag) {
    // jsonb containment: an object with only `name` matches a tag of that name with any value.
    const tag =
      input.tag.value === undefined
        ? { name: input.tag.name }
        : { name: input.tag.name, value: input.tag.value };
    conditions.push(sql`${email.tags} @> ${JSON.stringify([tag])}::jsonb`);
  }
  if (input.category !== undefined) conditions.push(eq(email.category, input.category));
  const senderDomain = input.senderDomain?.trim().toLowerCase().replace(/^@/, "");
  if (senderDomain) {
    conditions.push(
      sql`(${senderDomainSql} = ${senderDomain} or ${senderDomainSql} like ${`%.${escapeLike(senderDomain)}`})`,
    );
  }
  if (input.batchId !== undefined) conditions.push(eq(email.batchId, input.batchId));
  if (input.subaccountId !== undefined) conditions.push(eq(email.subaccountId, input.subaccountId));
  if (input.createdAfter) conditions.push(gte(email.createdAt, input.createdAfter));
  if (input.createdBefore) conditions.push(lt(email.createdAt, input.createdBefore));
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
  return conditions;
}

async function selectEmailList(
  input: { organizationId: string; environmentId: string } & EmailListFilters,
  rowLimit: number,
): Promise<EmailListItem[]> {
  const conditions = listConditions(input);
  const rows = await db
    .select({
      id: email.id,
      to: email.to,
      subject: email.subject,
      status: email.status,
      mode: environment.mode,
      trackOpens: email.trackOpens,
      trackClicks: email.trackClicks,
      unsubscribe: email.unsubscribe,
      openCount: email.openCount,
      firstOpenedAt: email.firstOpenedAt,
      lastOpenedAt: email.lastOpenedAt,
      clickCount: email.clickCount,
      firstClickedAt: email.firstClickedAt,
      lastClickedAt: email.lastClickedAt,
      createdAt: email.createdAt,
      scheduledAt: email.scheduledAt,
      storeContent: email.storeContent,
      contentDiscardedAt: email.contentDiscardedAt,
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
    content_storage: contentStorageObject(row),
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

/**
 * One page of the API's email list (`GET /v1/emails`): newest first, without content (bodies can be
 * megabytes each), with recipients and the failure. Two queries.
 */
export async function listEmailSummariesPage(
  input: { organizationId: string; environmentId: string; limit?: number } & EmailListFilters,
): Promise<{ data: EmailSummaryOutput[]; hasMore: boolean }> {
  const limit = clampLimit(input.limit);
  const rows = await db
    .select({
      id: email.id,
      from: email.from,
      stream: email.stream,
      to: email.to,
      cc: email.cc,
      bcc: email.bcc,
      replyTo: email.replyTo,
      subject: email.subject,
      tags: email.tags,
      category: email.category,
      status: email.status,
      errorCode: email.errorCode,
      errorMessage: email.errorMessage,
      mode: environment.mode,
      trackOpens: email.trackOpens,
      trackClicks: email.trackClicks,
      unsubscribe: email.unsubscribe,
      openCount: email.openCount,
      firstOpenedAt: email.firstOpenedAt,
      lastOpenedAt: email.lastOpenedAt,
      clickCount: email.clickCount,
      firstClickedAt: email.firstClickedAt,
      lastClickedAt: email.lastClickedAt,
      createdAt: email.createdAt,
      sentAt: email.sentAt,
      scheduledAt: email.scheduledAt,
      batchId: email.batchId,
      broadcastId: email.broadcastId,
      subaccountId: email.subaccountId,
      templateId: email.templateId,
      templateVersion: email.templateVersion,
      templateLocale: email.templateLocale,
      storeContent: email.storeContent,
      contentDiscardedAt: email.contentDiscardedAt,
    })
    .from(email)
    .innerJoin(
      environment,
      and(
        eq(environment.id, email.environmentId),
        eq(environment.organizationId, email.organizationId),
      ),
    )
    .where(and(...listConditions(input)))
    .orderBy(sql`${email.createdAt} desc nulls last`, desc(email.id))
    // One row more than the page tells whether another page follows.
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const recipients = await recipientsByEmail(
    input.organizationId,
    page.map((row) => row.id),
  );
  return {
    data: page.map((row) => ({
      object: "email",
      id: row.id,
      from: row.from,
      to: row.to,
      cc: row.cc,
      bcc: row.bcc,
      reply_to: row.replyTo,
      subject: row.subject,
      tags: row.tags,
      category: row.category,
      stream: row.stream,
      status: row.status,
      failure: emailFailure(row),
      recipients: (recipients.get(row.id) ?? []).map(toRecipientObject),
      sandbox: row.mode === "sandbox",
      tracking: trackingObject(row),
      created_at: row.createdAt.toISOString(),
      sent_at: row.sentAt?.toISOString() ?? null,
      scheduled_at: row.scheduledAt?.toISOString() ?? null,
      batch_id: row.batchId,
      broadcast_id: row.broadcastId,
      subaccount_id: row.subaccountId,
      template: templateReference(row),
      content_storage: contentStorageObject(row),
    })),
    hasMore: rows.length > limit,
  };
}

/** An email as exported to CSV: the wire object without content, headers or attachments. */
export type EmailExportItem = Pick<
  EmailObjectOutput,
  | "id"
  | "created_at"
  | "status"
  | "from"
  | "to"
  | "cc"
  | "bcc"
  | "reply_to"
  | "subject"
  | "category"
  | "tags"
  | "recipients"
  | "tracking"
  | "scheduled_at"
  | "sent_at"
  | "batch_id"
>;

const EXPORT_PAGE_SIZE = 500;

/** Every email `listEmails` matches (ignoring `before`), newest first, a page at a time. */
export async function* exportEmailPages(
  input: { organizationId: string; environmentId: string } & EmailListFilters,
): AsyncGenerator<EmailExportItem[]> {
  let before: string | undefined;
  for (;;) {
    const rows = await db
      .select({
        id: email.id,
        createdAt: email.createdAt,
        status: email.status,
        from: email.from,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        replyTo: email.replyTo,
        subject: email.subject,
        category: email.category,
        tags: email.tags,
        trackOpens: email.trackOpens,
        trackClicks: email.trackClicks,
        unsubscribe: email.unsubscribe,
        openCount: email.openCount,
        firstOpenedAt: email.firstOpenedAt,
        lastOpenedAt: email.lastOpenedAt,
        clickCount: email.clickCount,
        firstClickedAt: email.firstClickedAt,
        lastClickedAt: email.lastClickedAt,
        scheduledAt: email.scheduledAt,
        sentAt: email.sentAt,
        batchId: email.batchId,
      })
      .from(email)
      .where(and(...listConditions({ ...input, before })))
      .orderBy(sql`${email.createdAt} desc nulls last`, desc(email.id))
      .limit(EXPORT_PAGE_SIZE);
    if (rows.length === 0) return;
    const recipients = await recipientsByEmail(
      input.organizationId,
      rows.map((row) => row.id),
    );
    yield rows.map((row) => ({
      id: row.id,
      created_at: row.createdAt.toISOString(),
      status: row.status,
      from: row.from,
      to: row.to,
      cc: row.cc,
      bcc: row.bcc,
      reply_to: row.replyTo,
      subject: row.subject,
      category: row.category,
      tags: row.tags,
      recipients: (recipients.get(row.id) ?? []).map(toRecipientObject),
      tracking: trackingObject(row),
      scheduled_at: row.scheduledAt?.toISOString() ?? null,
      sent_at: row.sentAt?.toISOString() ?? null,
      batch_id: row.batchId,
    }));
    if (rows.length < EXPORT_PAGE_SIZE) return;
    before = rows.at(-1)?.id;
  }
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
 * Which of `environmentIds` (of one organization) have at least one sent email still kept:
 * emails are purged after their retention period, so an environment that went quiet for longer
 * stops counting. One index probe per environment. The dashboard opens a project on its live
 * environment once that has sent something.
 */
export async function environmentsWithSentEmail(input: {
  organizationId: string;
  environmentIds: string[];
}): Promise<Set<string>> {
  if (input.environmentIds.length === 0) return new Set();
  const rows = await db
    .select({ id: environment.id })
    .from(environment)
    .where(
      and(
        eq(environment.organizationId, input.organizationId),
        inArray(environment.id, input.environmentIds),
        sql`exists (select 1 from ${email} where ${email.environmentId} = ${environment.id} and ${email.organizationId} = ${input.organizationId} and ${email.status} = 'sent')`,
      ),
    );
  return new Set(rows.map((row) => row.id));
}

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
  const day = sql<string>`to_char(${email.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;
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
