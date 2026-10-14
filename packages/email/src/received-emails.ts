/**
 * Reading and deleting received emails. Every function is scoped by organization and environment;
 * lists never load bodies or headers. Content (raw message, attachment bytes) comes from the
 * content store.
 */
import { db, schema } from "@coss/db";
import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";
import type { InboundContentStore } from "./inbound-store.ts";
import type {
  ReceivedEmailObjectOutput,
  ReceivedEmailSummaryOutput,
  VERDICT_STATUSES,
} from "./schemas.ts";

const { environment, receivedEmail, receivedEmailAttachment } = schema;

export type ReceivedEmailRow = typeof receivedEmail.$inferSelect;
export type ReceivedEmailAttachmentRow = typeof receivedEmailAttachment.$inferSelect;

type Scope = { organizationId: string; environmentId: string };
type Verdict = (typeof VERDICT_STATUSES)[number];

const summaryColumns = {
  id: receivedEmail.id,
  organizationId: receivedEmail.organizationId,
  environmentId: receivedEmail.environmentId,
  status: receivedEmail.status,
  blockedReason: receivedEmail.blockedReason,
  mailFrom: receivedEmail.mailFrom,
  recipients: receivedEmail.recipients,
  from: receivedEmail.from,
  to: receivedEmail.to,
  cc: receivedEmail.cc,
  subject: receivedEmail.subject,
  messageId: receivedEmail.messageId,
  size: receivedEmail.size,
  spamVerdict: receivedEmail.spamVerdict,
  virusVerdict: receivedEmail.virusVerdict,
  spfVerdict: receivedEmail.spfVerdict,
  dkimVerdict: receivedEmail.dkimVerdict,
  dmarcVerdict: receivedEmail.dmarcVerdict,
  dmarcPolicy: receivedEmail.dmarcPolicy,
  receivedAt: receivedEmail.receivedAt,
};

type SummaryRow = { [K in keyof typeof summaryColumns]: ReceivedEmailRow[K] };

function verdict(value: string | null): Verdict | null {
  return value as Verdict | null;
}

function toAttachmentObject(row: ReceivedEmailAttachmentRow) {
  return {
    id: row.id,
    filename: row.filename,
    content_type: row.contentType,
    content_id: row.contentId,
    disposition: row.disposition === "inline" ? ("inline" as const) : ("attachment" as const),
    size: row.size,
  };
}

export function toReceivedEmailSummary(
  row: SummaryRow,
  attachments: readonly ReceivedEmailAttachmentRow[],
  sandbox: boolean,
): ReceivedEmailSummaryOutput {
  return {
    object: "received_email",
    id: row.id,
    status: row.status,
    blocked_reason: row.blockedReason === "virus" ? "virus" : null,
    mail_from: row.mailFrom,
    recipients: row.recipients,
    from: row.from,
    to: row.to,
    cc: row.cc,
    subject: row.subject,
    message_id: row.messageId,
    attachments: attachments.map(toAttachmentObject),
    size: row.size,
    spam: row.spamVerdict === "fail",
    verdicts: {
      spam: verdict(row.spamVerdict),
      virus: verdict(row.virusVerdict),
      spf: verdict(row.spfVerdict),
      dkim: verdict(row.dkimVerdict),
      dmarc: verdict(row.dmarcVerdict),
      dmarc_policy: row.dmarcPolicy,
    },
    sandbox,
    received_at: row.receivedAt.toISOString(),
  };
}

export function toReceivedEmailObject(
  row: ReceivedEmailRow,
  attachments: readonly ReceivedEmailAttachmentRow[],
  sandbox: boolean,
): ReceivedEmailObjectOutput {
  return {
    ...toReceivedEmailSummary(row, attachments, sandbox),
    reply_to: row.replyTo,
    in_reply_to: row.inReplyTo,
    references: row.references,
    sent_at: row.sentAt?.toISOString() ?? null,
    headers: row.headers,
    text: row.text,
    html: row.html,
    truncated: row.truncated,
  };
}

async function isSandbox(scope: Scope): Promise<boolean> {
  const [row] = await db
    .select({ mode: environment.mode })
    .from(environment)
    .where(
      and(
        eq(environment.id, scope.environmentId),
        eq(environment.organizationId, scope.organizationId),
      ),
    )
    .limit(1);
  return row?.mode === "sandbox";
}

async function attachmentsOf(
  organizationId: string,
  ids: readonly string[],
): Promise<Map<string, ReceivedEmailAttachmentRow[]>> {
  const byEmail = new Map<string, ReceivedEmailAttachmentRow[]>();
  if (ids.length === 0) return byEmail;
  const rows = await db
    .select()
    .from(receivedEmailAttachment)
    .where(
      and(
        eq(receivedEmailAttachment.organizationId, organizationId),
        inArray(receivedEmailAttachment.receivedEmailId, [...ids]),
      ),
    )
    .orderBy(asc(receivedEmailAttachment.position));
  for (const row of rows) {
    const list = byEmail.get(row.receivedEmailId) ?? [];
    list.push(row);
    byEmail.set(row.receivedEmailId, list);
  }
  return byEmail;
}

/** A page of the environment's received emails, newest first; `after` is the previous page's last id. */
export async function listReceivedEmails(
  input: Scope & { limit: number; after?: string | undefined },
): Promise<{ data: ReceivedEmailSummaryOutput[]; hasMore: boolean }> {
  const rows = await db
    .select(summaryColumns)
    .from(receivedEmail)
    .where(
      and(
        eq(receivedEmail.organizationId, input.organizationId),
        eq(receivedEmail.environmentId, input.environmentId),
        input.after ? lt(receivedEmail.id, input.after) : undefined,
      ),
    )
    .orderBy(desc(receivedEmail.id))
    .limit(input.limit + 1);
  const page = rows.slice(0, input.limit);
  const [attachments, sandbox] = await Promise.all([
    attachmentsOf(
      input.organizationId,
      page.map((row) => row.id),
    ),
    isSandbox(input),
  ]);
  return {
    data: page.map((row) => toReceivedEmailSummary(row, attachments.get(row.id) ?? [], sandbox)),
    hasMore: rows.length > input.limit,
  };
}

export async function getReceivedEmailRow(
  input: Scope & { id: string },
): Promise<ReceivedEmailRow | null> {
  const [row] = await db
    .select()
    .from(receivedEmail)
    .where(
      and(
        eq(receivedEmail.id, input.id),
        eq(receivedEmail.organizationId, input.organizationId),
        eq(receivedEmail.environmentId, input.environmentId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getReceivedEmail(
  input: Scope & { id: string },
): Promise<ReceivedEmailObjectOutput | null> {
  const row = await getReceivedEmailRow(input);
  if (!row) return null;
  const [attachments, sandbox] = await Promise.all([
    attachmentsOf(input.organizationId, [row.id]),
    isSandbox(input),
  ]);
  return toReceivedEmailObject(row, attachments.get(row.id) ?? [], sandbox);
}

/** The raw message (`message/rfc822`), or `null` when the email or its content is gone. */
export async function getReceivedEmailRaw(
  input: Scope & { id: string },
  store: InboundContentStore,
): Promise<{ content: Uint8Array; filename: string } | null> {
  const row = await getReceivedEmailRow(input);
  if (!row?.rawKey) return null;
  const content = await store.get(row.rawKey);
  return content ? { content, filename: `${row.id}.eml` } : null;
}

/** One attachment's bytes, or `null` when the email, the attachment or its content is gone. */
export async function getReceivedEmailAttachment(
  input: Scope & { id: string; attachmentId: string },
  store: InboundContentStore,
): Promise<{ content: Uint8Array; filename: string; contentType: string } | null> {
  const [row] = await db
    .select({ attachment: receivedEmailAttachment })
    .from(receivedEmailAttachment)
    .innerJoin(
      receivedEmail,
      and(
        eq(receivedEmail.id, receivedEmailAttachment.receivedEmailId),
        eq(receivedEmail.organizationId, receivedEmailAttachment.organizationId),
      ),
    )
    .where(
      and(
        eq(receivedEmailAttachment.id, input.attachmentId),
        eq(receivedEmail.id, input.id),
        eq(receivedEmail.organizationId, input.organizationId),
        eq(receivedEmail.environmentId, input.environmentId),
      ),
    )
    .limit(1);
  if (!row) return null;
  const content = await store.get(row.attachment.contentKey);
  if (!content) return null;
  return {
    content,
    filename: row.attachment.filename ?? `${row.attachment.id}`,
    contentType: row.attachment.contentType,
  };
}

/**
 * Deletes a received email and its content right away. The row goes first, so nothing points at
 * content being deleted; content the store fails to delete expires with the bucket's lifecycle.
 */
export async function deleteReceivedEmail(
  input: Scope & { id: string },
  store: InboundContentStore,
): Promise<boolean> {
  const [attachmentKeys, deleted] = await db.transaction(async (tx) => {
    const keys = await tx
      .select({ key: receivedEmailAttachment.contentKey })
      .from(receivedEmailAttachment)
      .where(
        and(
          eq(receivedEmailAttachment.receivedEmailId, input.id),
          eq(receivedEmailAttachment.organizationId, input.organizationId),
        ),
      );
    const rows = await tx
      .delete(receivedEmail)
      .where(
        and(
          eq(receivedEmail.id, input.id),
          eq(receivedEmail.organizationId, input.organizationId),
          eq(receivedEmail.environmentId, input.environmentId),
        ),
      )
      .returning({ rawKey: receivedEmail.rawKey });
    return [keys.map((row) => row.key), rows[0] ?? null] as const;
  });
  if (!deleted) return false;
  const keys = [...(deleted.rawKey ? [deleted.rawKey] : []), ...attachmentKeys];
  try {
    await store.delete(keys);
  } catch (error) {
    console.error(`[email:inbound] deleting the content of ${input.id} failed:`, error);
  }
  return true;
}

/** Messages the organization's daily inbound limit dropped on `day` (UTC, `YYYY-MM-DD`). */
export async function inboundDropCount(organizationId: string, day: string): Promise<number> {
  const [row] = await db
    .select({ count: schema.inboundDropCounter.count })
    .from(schema.inboundDropCounter)
    .where(
      and(
        eq(schema.inboundDropCounter.organizationId, organizationId),
        eq(schema.inboundDropCounter.day, day),
      ),
    )
    .limit(1);
  return row?.count ?? 0;
}
