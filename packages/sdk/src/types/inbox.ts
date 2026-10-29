/**
 * Inbox wire types (`coss.inboxes`): an environment's addresses for agents, their threads and
 * messages. Hand-written to mirror the API's snake_case JSON 1:1 (the API's contract test asserts
 * they stay assignable to and from its zod schemas).
 */
import type { EmailAttachmentParams, EmailStatus, EmailTag } from "./email.ts";
import type { ReceivedEmailAttachment } from "./received-email.ts";

/** `managed`: at the environment's domain under coss.com's inbound domain; `domain`: a receiving domain's. */
export type InboxKind = "managed" | "domain";

export interface Inbox {
  object: "inbox";
  id: string;
  /** The inbox's address (`username@domain`). */
  address: string;
  username: string;
  domain: string;
  kind: InboxKind;
  /** The name messages are sent with. */
  display_name: string | null;
  /** Your own id for the inbox (unique per environment). */
  client_id: string | null;
  /**
   * Whether messages can be sent from it: live inboxes at coss.com's inbound domain only receive
   * (create the inbox at a receiving domain under a verified domain to send).
   */
  can_send: boolean;
  sandbox: boolean;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

/** Parameters of `coss.inboxes.create`. */
export interface CreateInboxParams {
  /** The part before the @ (lower-case letters, digits, `.`, `_`, `-`); random when omitted. */
  username?: string;
  /** One of the environment's receiving domains; omitted: its own domain under coss.com's inbound domain. */
  domain?: string;
  /** The name messages are sent with. */
  display_name?: string;
  /** Your own id for the inbox: creating it again returns the existing inbox. */
  client_id?: string;
}

/** Parameters of `coss.inboxes.update`. */
export interface UpdateInboxParams {
  /** `null` sends with the bare address. */
  display_name?: string | null;
}

export interface DeletedInbox {
  object: "inbox";
  id: string;
  deleted: true;
}

/** Query of the inbox lists (`list`, `threads.list`). */
export interface ListInboxesParams {
  /** 1-100, default 20. */
  limit?: number;
  /** The `id` of the last item of the previous page. */
  after?: string;
}

/** `inbound`: received by the inbox; `outbound`: sent from it. */
export type InboxMessageDirection = "inbound" | "outbound";

/** `received` for inbound messages, else the outbound message's email status. */
export type InboxMessageStatus = "received" | EmailStatus;

/** A message as lists return it: a preview instead of its bodies. */
export interface InboxMessageSummary {
  object: "inbox_message";
  id: string;
  inbox_id: string;
  thread_id: string;
  direction: InboxMessageDirection;
  status: InboxMessageStatus;
  /** The `From` header. */
  from: string | null;
  to: string[];
  cc: string[];
  subject: string | null;
  /** The start of the message's own text (without the quoted conversation). */
  preview: string | null;
  /** An inbound message's attachments: download one with `coss.inboxes.messages.getAttachment`. */
  attachments: ReceivedEmailAttachment[];
  /** Whether the receiving server judged it spam. */
  spam: boolean;
  /** The received email of an inbound message. */
  received_email_id: string | null;
  /** The email of an outbound message: its delivery events and webhooks name it. */
  email_id: string | null;
  /** ISO 8601 timestamp: when it was received or sent. */
  created_at: string;
}

/** A message with its bodies. HTML is the sender's: sanitize it before showing it. */
export interface InboxMessage extends InboxMessageSummary {
  reply_to: string[];
  /** An inbound message's `Message-ID` header. */
  message_id: string | null;
  in_reply_to: string | null;
  references: string[];
  text: string | null;
  /** The message's own text: `text` without the quoted conversation and signature (a heuristic). */
  extracted_text: string | null;
  html: string | null;
  /** Whether `text` or `html` were shortened (2 MB each). */
  truncated: boolean;
}

/** Query of `coss.inboxes.messages.list`. */
export interface ListInboxMessagesParams extends ListInboxesParams {
  /** Only inbound (received) or outbound (sent) messages. */
  direction?: InboxMessageDirection;
}

/** What a message from an inbox carries besides its recipients and subject. */
interface InboxMessageContentParams {
  /** At least one of `text` and `html` is required. */
  text?: string;
  html?: string;
  attachments?: EmailAttachmentParams[];
  tags?: EmailTag[];
}

/** Parameters of `coss.inboxes.messages.send`: a new thread. */
export interface SendInboxMessageParams extends InboxMessageContentParams {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
}

/** Parameters of `coss.inboxes.messages.reply`. */
export interface ReplyInboxMessageParams extends InboxMessageContentParams {
  /** Also reply to everyone else on the message (but the inbox). Default `false`. */
  reply_all?: boolean;
  cc?: string | string[];
  bcc?: string | string[];
}

/** A conversation as lists return it. */
export interface InboxThreadSummary {
  object: "inbox_thread";
  id: string;
  inbox_id: string;
  /** The first message's subject. */
  subject: string | null;
  /** Addresses of everyone in the conversation but the inbox. */
  participants: string[];
  message_count: number;
  /** The start of the latest message. */
  preview: string | null;
  /** ISO 8601 timestamp. */
  last_message_at: string;
  /** ISO 8601 timestamp of the latest inbound message: equal to `last_message_at` when it awaits a reply. */
  last_inbound_at: string | null;
  /** ISO 8601 timestamp. */
  created_at: string;
}

/** A conversation with its latest 50 messages, oldest first. */
export interface InboxThread extends InboxThreadSummary {
  messages: InboxMessage[];
}

export interface DeletedInboxThread {
  object: "inbox_thread";
  id: string;
  deleted: true;
}

export type InboxEventType = "inbox.message.received";

/** What `inbox.message.received` says about a message; never its content (read the message). */
export interface InboxMessageReceivedWebhookEventData {
  inbox_id: string;
  inbox_address: string;
  thread_id: string;
  /** The inbox message's id: `coss.inboxes.messages.get(inbox_id, message_id)`. */
  message_id: string;
  received_email_id: string;
  /** The `From` header. */
  from: string | null;
  to: string[];
  subject: string | null;
  attachment_count: number;
  /** Whether the message started its thread. */
  new_thread: boolean;
  spam: boolean;
  sandbox: boolean;
  /** ISO 8601 timestamp. */
  received_at: string;
}

/** Body of an `inbox.message.received` webhook request. */
export interface InboxMessageReceivedWebhookEvent {
  id: string;
  object: "event";
  type: InboxEventType;
  /** The API version this event is rendered in: the receiving endpoint's `api_version`. */
  api_version: string;
  /** ISO 8601 timestamp. */
  created_at: string;
  data: InboxMessageReceivedWebhookEventData;
}

/** Query of `coss.inboxes.threads.list`. */
export type ListInboxThreadsParams = ListInboxesParams;
