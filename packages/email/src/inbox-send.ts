/**
 * Sending from an inbox: a new thread, or a reply in a message's thread. Both are ordinary sends
 * through the email service (sender authorization, suppressions, screening, idempotency, usage):
 * the email's insert transaction also files it into the thread (`afterInsert`), so a stored email
 * is always in its thread. A retry with the same `Idempotency-Key` replays the message.
 *
 * Inboxes at coss.com's managed domain send only in sandbox environments (live sending needs a
 * verified domain of the organization). Sends never track opens or clicks: conversations don't
 * want rewritten links.
 */
import { db, schema } from "@coss/db";
import { and, eq } from "drizzle-orm";
import { InboxError } from "./errors.ts";
import type {
  InboxMessageObjectOutput,
  ReplyInboxMessageRequestOutput,
  SendInboxMessageRequestOutput,
} from "./inbox-schemas.ts";
import { replySubject } from "./inbox-text.ts";
import {
  bareAddress,
  canSend,
  getInboxMessage,
  getInboxMessageRow,
  getInboxRow,
  getInboxThreadRow,
  type InboxEnvironment,
  type InboxRow,
  inboxAddressOf,
  messageIdKey,
  recordOutboundInboxMessage,
} from "./inboxes.ts";
import {
  type EmailObjectOutput,
  SendEmailRequest,
  type SendEmailRequestOutput,
  uniqueRecipientCount,
} from "./schemas.ts";
import type { EmailService, SendEmailInput } from "./service.ts";

const { inboxMessage } = schema;

/** An `In-Reply-To`/`References` value fits one header line (`HEADER_VALUE`). */
const MAX_REFERENCES_LENGTH = 900;

/** The caller's send quota (the API's `emailSendQuota`), charged once the recipients are known. */
export type InboxSendQuota = {
  /** Charges `recipients`; a denial carries the error to throw when the request is no replay. */
  consume(recipients: number): Promise<{ allowed: true } | { allowed: false; error: Error }>;
  /** Gives the charge back (a replay, or a send refused before anything was stored). */
  refund(): Promise<void>;
};

export type InboxSendInput = {
  environment: InboxEnvironment;
  apiKeyId: string | null;
  apiKeyOwnerId?: string | null;
  inboxId: string;
  idempotencyKey?: string | null;
  quota?: InboxSendQuota;
};

function fromHeader(row: InboxRow): string {
  return row.displayName ? `"${row.displayName}" <${row.address}>` : row.address;
}

function asList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return typeof value === "string" ? [value] : value;
}

/**
 * `References` for a reply: the parent's references, then the parent. When too long, the first
 * (the thread's root) and the most recent ones are kept.
 */
export function replyReferences(parentReferences: readonly string[], parentId: string | null) {
  const ids = [
    ...new Set([...parentReferences, parentId].flatMap((value) => messageIdKey(value) ?? [])),
  ];
  const kept: string[] = [];
  let length = ids[0]?.length ?? 0;
  for (const id of ids.slice(1).reverse()) {
    if (length + id.length + 1 > MAX_REFERENCES_LENGTH) break;
    kept.unshift(id);
    length += id.length + 1;
  }
  return ids[0] ? [ids[0], ...kept] : [];
}

async function requireSendingInbox(input: InboxSendInput): Promise<InboxRow> {
  const row = await getInboxRow({ ...input.environment, id: input.inboxId });
  if (!row) throw new InboxError("not_found", "No inbox with this id exists in this environment.");
  if (!canSend(row, input.environment.mode === "sandbox")) {
    throw new InboxError(
      "inbox_cannot_send",
      `${row.address} is at coss.com's inbound domain, which only receives in live ` +
        "environments. Create the inbox at a receiving domain under one of your verified " +
        "domains to send from it.",
    );
  }
  return row;
}

async function send(
  emailService: EmailService,
  input: InboxSendInput & { row: InboxRow; threadId: string | null; params: unknown },
): Promise<{ message: InboxMessageObjectOutput; replayed: boolean }> {
  const parsed = SendEmailRequest.safeParse(input.params);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new InboxError("invalid_message", issue?.message ?? "Invalid message.", {
      ...(issue?.path.length ? { param: issue.path.join(".") } : {}),
    });
  }
  const params: SendEmailRequestOutput = parsed.data;
  const sendInput: SendEmailInput = {
    environment: input.environment,
    apiKeyId: input.apiKeyId,
    apiKeyOwnerId: input.apiKeyOwnerId ?? null,
    params,
    // Inbox sends share the email table's keys: keep them apart from `POST /v1/emails`'.
    idempotencyKey: input.idempotencyKey ? `inbox:${input.row.id}:${input.idempotencyKey}` : null,
    afterInsert: async (tx, row) => {
      await recordOutboundInboxMessage(tx, {
        row: input.row,
        threadId: input.threadId,
        emailId: row.id,
        subject: row.subject,
        to: row.to,
        cc: row.cc,
        at: row.createdAt,
      });
    },
  };
  const result = await sendWithQuota(emailService, sendInput, input.quota);
  const { email, replayed } = result;
  const [linked] = await db
    .select({ id: inboxMessage.id })
    .from(inboxMessage)
    .where(
      and(
        eq(inboxMessage.emailId, email.id),
        eq(inboxMessage.organizationId, input.environment.organizationId),
        eq(inboxMessage.inboxId, input.row.id),
      ),
    )
    .limit(1);
  const message =
    linked &&
    (await getInboxMessage({ ...input.environment, inboxId: input.row.id, id: linked.id }));
  if (!message) {
    // The replayed email's thread was deleted since: it is still sent, but no longer in the inbox.
    throw new InboxError(
      "message_not_found",
      "This request was already sent, and its message has been deleted from the inbox since.",
    );
  }
  return { message, replayed };
}

async function sendWithQuota(
  emailService: EmailService,
  input: SendEmailInput,
  quota: InboxSendQuota | undefined,
): Promise<{ email: EmailObjectOutput; replayed: boolean }> {
  if (!quota) return emailService.send(input);
  const decision = await quota.consume(uniqueRecipientCount(input.params));
  if (!decision.allowed) {
    // A replay sends nothing, so it needs no quota.
    const replay = await emailService.replay(input);
    if (replay) return { email: replay, replayed: true };
    throw decision.error;
  }
  let result: { email: EmailObjectOutput; replayed: boolean };
  try {
    result = await emailService.send(input);
  } catch (error) {
    await quota.refund();
    throw error;
  }
  if (result.replayed) await quota.refund();
  return result;
}

/** Sends a message from the inbox, starting a thread. */
export async function sendInboxMessage(
  emailService: EmailService,
  input: InboxSendInput & { request: SendInboxMessageRequestOutput },
): Promise<{ message: InboxMessageObjectOutput; replayed: boolean }> {
  const row = await requireSendingInbox(input);
  const { request } = input;
  return send(emailService, {
    ...input,
    row,
    threadId: null,
    params: {
      from: fromHeader(row),
      to: request.to,
      cc: request.cc,
      bcc: request.bcc,
      subject: request.subject,
      text: request.text,
      html: request.html,
      attachments: request.attachments,
      tags: request.tags,
      tracking: { opens: false, clicks: false },
    },
  });
}

/**
 * Replies to a message of the inbox in its thread: to its sender (its `Reply-To` first), or for
 * the inbox's own message to its recipients again; `reply_all` adds everyone else on it.
 */
export async function replyToInboxMessage(
  emailService: EmailService,
  input: InboxSendInput & { messageId: string; request: ReplyInboxMessageRequestOutput },
): Promise<{ message: InboxMessageObjectOutput; replayed: boolean }> {
  const row = await requireSendingInbox(input);
  const scope = { ...input.environment, inboxId: row.id };
  const parent = await getInboxMessageRow({ ...scope, id: input.messageId });
  if (!parent) {
    throw new InboxError("message_not_found", "No message with this id exists in this inbox.");
  }
  const thread = await getInboxThreadRow({ ...scope, id: parent.message.threadId });
  const { inbound, outbound } = parent;
  const request = input.request;

  const own = (value: string) => inboxAddressOf(value) === row.address;
  let to: string[];
  let others: string[];
  let references: string[];
  let inReplyTo: string | null;
  if (inbound) {
    to = (inbound.replyTo.length > 0 ? inbound.replyTo : inbound.from ? [inbound.from] : []).filter(
      (value) => !own(value),
    );
    others = [...inbound.to, ...inbound.cc];
    inReplyTo = messageIdKey(inbound.messageId);
    references = replyReferences(inbound.references, inbound.messageId);
  } else if (outbound) {
    to = outbound.to;
    others = outbound.cc;
    const headers = Object.fromEntries(
      Object.entries(outbound.headers).map(([name, value]) => [name.toLowerCase(), value]),
    );
    inReplyTo = messageIdKey(headers["in-reply-to"]);
    references = replyReferences(headers.references?.split(/\s+/) ?? [], null);
  } else {
    throw new InboxError(
      "message_not_found",
      "This message's email is no longer stored, so it can't be replied to.",
    );
  }
  // Everyone once, the inbox never: `to` first, then Cc, then Bcc.
  const seen = new Set<string>();
  const keep = (values: readonly string[]) =>
    values.filter((value) => {
      const address = bareAddress(value);
      if (!address || own(address) || seen.has(address)) return false;
      seen.add(address);
      return true;
    });
  const toList = keep(to);
  const ccList = keep([...(request.reply_all ? others : []), ...asList(request.cc)]);
  const bccList = keep(asList(request.bcc));
  if (toList.length === 0) {
    throw new InboxError("no_reply_recipient", "This message has no address to reply to.");
  }

  const headers: Record<string, string> = {};
  if (inReplyTo) headers["In-Reply-To"] = inReplyTo;
  if (references.length > 0) headers.References = references.join(" ");
  return send(emailService, {
    ...input,
    row,
    threadId: parent.message.threadId,
    params: {
      from: fromHeader(row),
      to: toList,
      ...(ccList.length > 0 ? { cc: ccList } : {}),
      ...(bccList.length > 0 ? { bcc: bccList } : {}),
      subject: replySubject((inbound ?? outbound)?.subject || thread?.subject || null),
      text: request.text,
      html: request.html,
      attachments: request.attachments,
      tags: request.tags,
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
      tracking: { opens: false, clicks: false },
    },
  });
}
