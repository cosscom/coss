import type { Email } from "./email.ts";

/** `draft` (editable) → `scheduled` → `sending` ⇄ `paused` → `sent`; or `canceled`, `failed`. */
export type BroadcastStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "paused"
  | "sent"
  | "canceled"
  | "failed";

/** A broadcast's counters, per email (one email per reached contact). */
export interface BroadcastStats {
  /** Emails made so far. */
  recipients: number;
  sent: number;
  delivered: number;
  /** Permanent bounces. */
  bounced: number;
  complained: number;
  failed: number;
  /** Emails opened at least once (with open tracking). */
  opened: number;
  /** Emails clicked at least once (with click tracking). */
  clicked: number;
  /** Unsubscribes through the broadcast's links. */
  unsubscribed: number;
}

/** One marketing email to an audience or a segment. */
export interface Broadcast {
  object: "broadcast";
  id: string;
  name: string;
  status: BroadcastStatus;
  audience_id: string | null;
  segment_id: string | null;
  /** The topic's key: only contacts it reaches get it; it is the emails' `category`. */
  topic: string | null;
  from: string;
  reply_to: string[];
  subject: string;
  preview_text: string | null;
  html: string | null;
  text: string | null;
  tracking: { opens: boolean; clicks: boolean };
  /** Recipients per second (`null`: the plan's marketing rate). */
  rate_per_second: number | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  /** How many contacts it would reach, counted when it started. */
  recipients_estimated: number | null;
  /**
   * Why a paused broadcast waits: `paused` (by you), `billing_hold`, `usage_limit`,
   * `marketing_paused`, `account_suspended`, `sending_paused`.
   */
  pause_reason: string | null;
  error: { code: string; message: string } | null;
  stats: BroadcastStats;
  created_at: string;
  updated_at: string;
}

interface BroadcastContentParams {
  from: string;
  reply_to?: string[];
  /** May use `{{{contact.<key>|fallback}}}`. */
  subject: string;
  /** The inbox preview line. */
  preview_text?: string;
  /**
   * `{{{contact.<key>|fallback}}}` (escaped), `{{{unsubscribe_url}}}`, `{{{preferences_url}}}`,
   * `{{{mailing_address}}}`; a footer is added unless the last two are there.
   */
  html?: string;
  text?: string;
  tracking?: { opens?: boolean; clicks?: boolean };
  /** At most the plan's marketing rate (the default). */
  rate_per_second?: number;
}

export interface CreateBroadcastParams extends BroadcastContentParams {
  /** Shown only to you. */
  name: string;
  /** Send to this audience… (exactly one of `audience_id` and `segment_id`) */
  audience_id?: string;
  /** …or to this segment. */
  segment_id?: string;
  /** The topic's key. */
  topic?: string;
  /** Start sending right away. */
  send?: boolean;
  /** Start sending at this time (ISO 8601 with an offset, ≤ 30 days ahead). */
  scheduled_at?: string;
}

/** Fields left out keep their value; `null` clears one. */
export interface UpdateBroadcastParams {
  name?: string;
  audience_id?: string | null;
  segment_id?: string | null;
  topic?: string | null;
  from?: string;
  reply_to?: string[];
  subject?: string;
  preview_text?: string | null;
  html?: string | null;
  text?: string | null;
  tracking?: { opens?: boolean; clicks?: boolean };
  rate_per_second?: number | null;
}

export interface ListBroadcastsParams {
  status?: BroadcastStatus;
  /** 1-100, default 50. */
  limit?: number;
  /** The `id` of the last broadcast of the previous page. */
  after?: string;
}

export interface ListBroadcastEmailsParams {
  limit?: number;
  /** The `id` of the last email of the previous page. */
  after?: string;
}

export interface SendBroadcastParams {
  /** Omit to start right away. */
  scheduled_at?: string;
}

export interface TestBroadcastParams {
  /** 1-5 addresses. */
  to: string[];
  /** A contact (id or address) whose values fill the template; default: the fallbacks. */
  contact?: string;
}

export interface BroadcastTest {
  object: "broadcast_test";
  email_ids: string[];
}

export interface DeletedBroadcast {
  object: "broadcast";
  id: string;
  deleted: true;
}

export type BroadcastEmailList = { object: "list"; data: Email[]; has_more: boolean };
