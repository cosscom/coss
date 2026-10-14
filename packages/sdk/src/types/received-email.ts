/**
 * Received (inbound) email wire types. Hand-written to mirror the API's snake_case JSON 1:1 (the
 * API's contract test asserts they stay assignable to and from its zod schemas).
 */

/** `received`, or `blocked` when the message carried a virus (only its envelope is kept). */
export type ReceivedEmailStatus = "received" | "blocked";

/** What the receiving server concluded; `null` when the check did not run. */
export type VerdictStatus = "pass" | "fail" | "gray" | "processing_failed";

export interface ReceivedEmailVerdicts {
  spam: VerdictStatus | null;
  virus: VerdictStatus | null;
  spf: VerdictStatus | null;
  dkim: VerdictStatus | null;
  dmarc: VerdictStatus | null;
  /** The sender domain's DMARC policy (`none`, `quarantine`, `reject`) when DMARC failed. */
  dmarc_policy: string | null;
}

/** Metadata of an attachment; download it with `email.received.getAttachment`. */
export interface ReceivedEmailAttachment {
  id: string;
  /** `null` when the part named none. */
  filename: string | null;
  content_type: string;
  /** Set for parts the HTML references (`cid:` URLs). */
  content_id: string | null;
  disposition: "attachment" | "inline";
  /** Size in bytes. */
  size: number;
}

/** A received email as lists return it: without bodies and headers. */
export interface ReceivedEmailSummary {
  object: "received_email";
  id: string;
  status: ReceivedEmailStatus;
  blocked_reason: "virus" | null;
  /** The envelope sender (`MAIL FROM`); empty for bounces. */
  mail_from: string;
  /** The envelope recipients this environment received it for (Bcc'd addresses included). */
  recipients: string[];
  /** The `From` header. */
  from: string | null;
  to: string[];
  cc: string[];
  subject: string | null;
  /** The `Message-ID` header. */
  message_id: string | null;
  attachments: ReceivedEmailAttachment[];
  /** Size of the raw message in bytes. */
  size: number;
  /** Whether the spam verdict is `fail`. */
  spam: boolean;
  verdicts: ReceivedEmailVerdicts;
  /** Whether a sandbox environment received it. */
  sandbox: boolean;
  /** ISO 8601 timestamp. */
  received_at: string;
}

/** A received email with its headers and bodies. HTML is the sender's: sanitize it to show it. */
export interface ReceivedEmail extends ReceivedEmailSummary {
  reply_to: string[];
  in_reply_to: string | null;
  /** Message ids of the `References` header. */
  references: string[];
  /** The `Date` header, when valid (ISO 8601). */
  sent_at: string | null;
  /** Every header in message order, duplicates included. */
  headers: { name: string; value: string }[];
  text: string | null;
  html: string | null;
  /** Whether `text`, `html` or `headers` were shortened; `getRaw` always has everything. */
  truncated: boolean;
}

/** Query of `email.received.list`. */
export interface ListReceivedEmailsParams {
  /** 1-100, default 20. */
  limit?: number;
  /** The `id` of the last email of the previous page. */
  after?: string;
}

/** Returned by `email.received.delete`. */
export interface DeletedReceivedEmail {
  object: "received_email";
  id: string;
  deleted: true;
}

/** The environment's own domain under COSS's inbound domain: any address at it is received. */
export interface InboundAddress {
  object: "inbound_address";
  environment_id: string;
  domain: string;
}
