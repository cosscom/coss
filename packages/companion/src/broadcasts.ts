// Broadcasts and the environment's marketing settings.

import type { EmailStatus, Page } from "./index.ts";

export type BroadcastStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "paused"
  | "sent"
  | "canceled"
  | "failed";

export type BroadcastStats = {
  recipients: number;
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
  failed: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
};

/** A row of the broadcasts list (the dashboard's table columns). */
export type MobileBroadcastSummary = {
  id: string;
  name: string;
  status: BroadcastStatus;
  stats: Pick<BroadcastStats, "recipients" | "delivered" | "opened" | "clicked">;
  tracking: { opens: boolean; clicks: boolean };
  updated_at: string;
};

export type BroadcastListResponse = Page<MobileBroadcastSummary>;

export type MobileBroadcast = {
  id: string;
  name: string;
  status: BroadcastStatus;
  /** Who it goes to: an audience or a segment (`null`: deleted since). */
  target: { type: "audience" | "segment"; id: string; name: string } | null;
  topic: string | null;
  from: string;
  reply_to: string[];
  preview_text: string | null;
  tracking: { opens: boolean; clicks: boolean };
  /** Recipients per second: its own, else the plan's. */
  rate_per_second: number;
  scheduled_at: string | null;
  started_at: string | null;
  /** Completed or canceled. */
  finished_at: string | null;
  updated_at: string;
  recipients_estimated: number | null;
  /** Why it is paused (or waiting while sending): `paused`, `billing_hold`, `usage_limit`… */
  pause_reason: string | null;
  error: { code: string; message: string } | null;
  stats: BroadcastStats;
  /** Drafts only: the contacts it would reach now (`null`: not counted). */
  reach_estimate: number | null;
  /** A draft that can't be sent until the marketing settings have a postal address. */
  mailing_address_missing: boolean;
  /** The preview's subject, filled in with the fallbacks (the dashboard's preview). */
  preview_subject: string;
  /** The preview's plain-text part with the marketing footer; HTML stays on coss.com. */
  preview_text_body: string | null;
  has_html: boolean;
};

export type BroadcastEmail = {
  id: string;
  to: string;
  status: EmailStatus;
  created_at: string;
};

export type BroadcastResponse = {
  broadcast: MobileBroadcast;
  /** The broadcast's newest emails (none for drafts). */
  recent_emails: BroadcastEmail[];
  /** May pause, resume or cancel it (`broadcast:send`). */
  can_send: boolean;
  /** May open its emails (`email:read`). */
  can_read_email: boolean;
};

/** `POST …/broadcasts/{id}/pause|resume|cancel`. */
export type BroadcastChangeResponse = { status: BroadcastStatus };

/** The environment's marketing settings (read-only in the app). */
export type MarketingSettings = {
  display_name: string | null;
  mailing_address: string | null;
  double_opt_in_default: boolean;
  confirmation_from: string | null;
  confirmation_subject: string | null;
  confirmation_html: string | null;
  confirmed_redirect_url: string | null;
};

export type MarketingSettingsResponse = { settings: MarketingSettings };
