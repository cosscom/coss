/**
 * How long COSS keeps each kind of data: the single source of the worker's purges (each in the
 * package that owns the tables) and of the published policy (docs and dashboard). Client-safe:
 * no dependencies, never imports `@coss/db`.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days each purged kind of data is kept, counted from `RETENTION_POLICY`'s `after`. */
export const RETENTION_DAYS = {
  /** Emails with their recipients, events, links and attachment metadata (not queued or scheduled). */
  emails: 45,
  /** Received emails with their headers, bodies, raw message and attachments. */
  receivedEmails: 30,
  /** Webhook messages with their deliveries and attempts (once none is pending). */
  webhookDeliveries: 30,
  /** Log drain batches with their lines and attempt logs (once finished). */
  logDrainBatches: 7,
  /** Lines queued for a log drain that never got into a batch (e.g. while its organization is suspended). */
  logDrainBacklog: 3,
  /** Hourly reputation counts: the longest reputation window (30 days) plus a day. */
  reputationRollups: 31,
  /** Content screening verdicts. */
  contentScreenings: 90,
  /** Settled reputation notification emails. */
  reputationNotifications: 90,
  /** Standing changes (an organization's latest one is always kept). */
  reputationHistory: 730,
  /** Platform admin actions. */
  adminAuditLog: 730,
  /** Sessions, verification tokens and invitations, counted from their expiry. */
  expiredAuth: 7,
  /** Risk assessments with their reasons, signals and feedback. */
  riskAssessments: 365,
  /** The email address, IP address and user agent on a risk assessment (removed before the rest). */
  riskPersonalData: 90,
  /** What an environment remembers (hashed mailboxes and reported identifiers), since last seen. */
  riskMemory: 365,
  /** Invoices, with their lines, payments and credit notes: what tax law needs (they outlive the account). */
  invoices: 3650,
  /** Hourly metered usage (invoices keep each month's totals). */
  billingUsage: 400,
  /** Events received from the payment provider, once processed. */
  billingProviderEvents: 30,
  /** Settled billing notification emails (usage alerts, payment reminders). */
  billingNotifications: 90,
} as const satisfies Record<string, number>;

export type RetentionPeriod =
  | { days: number; after: "creation" | "expiry" }
  | { until: "sent" | "deleted" | "closed" };

export type RetentionRule = {
  id: string;
  label: string;
  description: string;
  period: RetentionPeriod;
};

/** The published policy, in display order. */
export const RETENTION_POLICY: readonly RetentionRule[] = [
  {
    id: "emails",
    label: "Emails",
    description:
      "Subject, bodies, addresses, headers, tags, recipient statuses, delivery events, opens, clicks and attachment names. Queued and scheduled emails are kept until they are sent or canceled.",
    period: { days: RETENTION_DAYS.emails, after: "creation" },
  },
  {
    id: "attachment_content",
    label: "Attachment content",
    description:
      "The bytes of attachments; only their name, type, size and checksum stay with the email.",
    period: { until: "sent" },
  },
  {
    id: "received_emails",
    label: "Received emails",
    description:
      "Emails sent to your receiving addresses: the raw message, headers, bodies, attachments and spam and authentication verdicts. You can also delete one right away.",
    period: { days: RETENTION_DAYS.receivedEmails, after: "creation" },
  },
  {
    id: "idempotency_keys",
    label: "Idempotency keys",
    description: "A request repeated with the same Idempotency-Key replays the first response.",
    period: { days: 1, after: "creation" },
  },
  {
    id: "webhook_deliveries",
    label: "Webhook deliveries",
    description:
      "Event payloads, delivery statuses and attempt logs (including response excerpts). Deliveries still being retried are kept until they finish.",
    period: { days: RETENTION_DAYS.webhookDeliveries, after: "creation" },
  },
  {
    id: "log_drain_batches",
    label: "Log drain batches",
    description: `The lines sent to your log drains and their delivery attempts (including response excerpts). Lines that could not be sent within ${RETENTION_DAYS.logDrainBacklog} days are dropped.`,
    period: { days: RETENTION_DAYS.logDrainBatches, after: "creation" },
  },
  {
    id: "content_screenings",
    label: "Content screening results",
    description:
      "Verdicts of the automated abuse screening. The screened content itself is never stored.",
    period: { days: RETENTION_DAYS.contentScreenings, after: "creation" },
  },
  {
    id: "reputation_statistics",
    label: "Reputation statistics",
    description: "Hourly bounce and complaint counts behind your account standing.",
    period: { days: RETENTION_DAYS.reputationRollups, after: "creation" },
  },
  {
    id: "reputation_notifications",
    label: "Standing notification emails",
    description: "Records of the emails sent to owners and admins about a warning or suspension.",
    period: { days: RETENTION_DAYS.reputationNotifications, after: "creation" },
  },
  {
    id: "reputation_history",
    label: "Account standing history",
    description:
      "Warnings, suspensions and reinstatements. The latest change is kept while the organization exists.",
    period: { days: RETENTION_DAYS.reputationHistory, after: "creation" },
  },
  {
    id: "risk_assessments",
    label: "Risk assessments",
    description:
      "Decisions, scores, reasons, signals (ASN, country, counts) and the feedback you sent. Your user id stays until you ask COSS to forget the user.",
    period: { days: RETENTION_DAYS.riskAssessments, after: "creation" },
  },
  {
    id: "risk_personal_data",
    label: "Risk assessment personal data",
    description:
      "The email address, IP address and user agent you sent with an assessment. Only keyed hashes remain afterwards.",
    period: { days: RETENTION_DAYS.riskPersonalData, after: "creation" },
  },
  {
    id: "risk_memory",
    label: "Risk memory",
    description:
      "Keyed hashes of mailboxes that have an account and of identifiers you reported as fraud or abuse (IP addresses count for 30 days), and the countries and networks each user logged in from (by keyed hash of your user id), counted from when they were last seen.",
    period: { days: RETENTION_DAYS.riskMemory, after: "creation" },
  },
  {
    id: "admin_audit_log",
    label: "Admin audit log",
    description: "Actions COSS staff take on organizations and users.",
    period: { days: RETENTION_DAYS.adminAuditLog, after: "creation" },
  },
  {
    id: "expired_auth",
    label: "Expired sessions and invitations",
    description:
      "Sign-in sessions, verification and reset tokens, and invitations that were never accepted.",
    period: { days: RETENTION_DAYS.expiredAuth, after: "expiry" },
  },
  {
    id: "invoices",
    label: "Invoices and payments",
    description:
      "Invoices with their line items, payments and credit notes, as tax law requires. Kept after your account is closed.",
    period: { days: RETENTION_DAYS.invoices, after: "creation" },
  },
  {
    id: "billing_usage",
    label: "Usage records",
    description:
      "Hourly counts of billable usage per environment. Each invoice keeps its month's totals.",
    period: { days: RETENTION_DAYS.billingUsage, after: "creation" },
  },
  {
    id: "billing_notifications",
    label: "Billing notification emails",
    description: "Records of usage alerts and payment reminders sent to your billing contacts.",
    period: { days: RETENTION_DAYS.billingNotifications, after: "creation" },
  },
  {
    id: "payment_provider_events",
    label: "Payment provider events",
    description: "Notifications from our payment processor about invoices and payments.",
    period: { days: RETENTION_DAYS.billingProviderEvents, after: "creation" },
  },
  {
    id: "suppressions",
    label: "Suppressions",
    description:
      "Addresses that sends skip. Never removed automatically, so a bounced address stays protected.",
    period: { until: "deleted" },
  },
  {
    id: "account",
    label: "Account and configuration",
    description:
      "Users, organizations, projects, environments, API keys, domains, webhook endpoints, log drains, risk allow and block lists, settings, and billing details (plan, contracts and credits). Items you delete (a key, a domain, an endpoint, a drain) are removed right away.",
    period: { until: "closed" },
  },
];

/** The moment before which data kept for `days` is due for deletion. */
export function retentionCutoff(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

/** A human-readable duration: "24 hours", "45 days", "2 years". */
export function formatRetentionDays(days: number): string {
  if (days === 1) return "24 hours";
  if (days % 365 === 0) return days === 365 ? "1 year" : `${days / 365} years`;
  return `${days} days`;
}

/** How long a rule keeps its data, e.g. "45 days", "7 days after expiry", "Until sent". */
export function formatRetentionPeriod(period: RetentionPeriod): string {
  if ("until" in period) {
    if (period.until === "sent") return "Until the email is sent";
    return period.until === "deleted" ? "Until you delete it" : "While your account exists";
  }
  const duration = formatRetentionDays(period.days);
  return period.after === "expiry" ? `${duration} after expiry` : duration;
}
