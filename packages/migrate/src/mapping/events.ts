/**
 * Providers' webhook events → coss.com event types (`WEBHOOK_EVENT_TYPES`). Approximate mappings
 * are noted on the imported endpoint; events with no counterpart are listed and dropped.
 */

type EventMapping = { types: string[]; note?: string };

const RESEND_SAME = new Set([
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.complained",
  "email.failed",
  "email.opened",
  "email.clicked",
  "email.scheduled",
  "email.suppressed",
  "email.received",
  "contact.created",
  "contact.updated",
  "contact.deleted",
]);

const RESEND: Record<string, EventMapping> = {
  "contact.topics.updated": {
    types: ["contact.unsubscribed", "contact.updated"],
    note: "contact.topics.updated became contact.unsubscribed and contact.updated.",
  },
};

const SENDGRID: Record<string, EventMapping> = {
  processed: { types: ["email.sent"] },
  dropped: {
    types: ["email.suppressed", "email.failed"],
    note: "dropped became email.suppressed (suppressed recipients) and email.failed.",
  },
  deferred: { types: ["email.delivery_delayed"] },
  delivered: { types: ["email.delivered"] },
  bounce: {
    types: ["email.bounced"],
    note: "bounce became email.bounced, which covers permanent bounces only.",
  },
  open: { types: ["email.opened"] },
  click: { types: ["email.clicked"] },
  spam_report: { types: ["email.complained"] },
  unsubscribe: { types: ["email.unsubscribed"] },
  group_unsubscribe: {
    types: ["email.unsubscribed", "contact.unsubscribed"],
    note: "group_unsubscribe became email.unsubscribed and contact.unsubscribed.",
  },
  group_resubscribe: {
    types: ["contact.updated"],
    note: "group_resubscribe became contact.updated.",
  },
  account_status_change: {
    types: ["account.suspended", "account.reinstated", "account.reputation_warning"],
    note: "account_status_change became coss.com's account.* events (live environments only).",
  },
};

const POSTMARK: Record<string, EventMapping> = {
  Delivery: { types: ["email.delivered"] },
  Bounce: {
    types: ["email.bounced", "email.delivery_delayed"],
    note: "Bounce became email.bounced (permanent) and email.delivery_delayed (temporary).",
  },
  SpamComplaint: { types: ["email.complained"] },
  Open: { types: ["email.opened"] },
  Click: { types: ["email.clicked"] },
  SubscriptionChange: {
    types: ["email.unsubscribed"],
    note: "SubscriptionChange became email.unsubscribed; reactivations have no coss.com event.",
  },
};

export type MappedEvents = { eventTypes: string[]; unmapped: string[]; notes: string[] };

function mapWith(
  events: string[],
  table: Record<string, EventMapping>,
  same: ReadonlySet<string> = new Set(),
): MappedEvents {
  const types = new Set<string>();
  const unmapped: string[] = [];
  const notes: string[] = [];
  for (const event of events) {
    if (same.has(event)) {
      types.add(event);
      continue;
    }
    const mapping = table[event];
    if (!mapping) {
      unmapped.push(event);
      continue;
    }
    for (const type of mapping.types) types.add(type);
    if (mapping.note) notes.push(mapping.note);
  }
  return { eventTypes: [...types].sort(), unmapped, notes };
}

export function mapResendEvents(events: string[]): MappedEvents {
  return mapWith(events, RESEND, RESEND_SAME);
}

/** `events`: the names of the SendGrid event webhook's enabled event flags. */
export function mapSendGridEvents(events: string[]): MappedEvents {
  return mapWith(events, SENDGRID);
}

/** `SENDGRID_EVENT_FLAGS`: the boolean fields of a SendGrid event webhook. */
export const SENDGRID_EVENT_FLAGS: readonly string[] = Object.keys(SENDGRID);

/** `events`: the names of the Postmark webhook's enabled triggers. */
export function mapPostmarkEvents(events: string[]): MappedEvents {
  return mapWith(events, POSTMARK);
}

export const POSTMARK_TRIGGERS: readonly string[] = Object.keys(POSTMARK);
