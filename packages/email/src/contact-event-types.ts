/**
 * Webhook event types of contacts, broadcasts and inboxes (environment-scoped). No imports:
 * `schemas.ts` lists them in `WEBHOOK_EVENT_TYPES` while `contact-schemas.ts`,
 * `broadcast-schemas.ts` and `inbox-schemas.ts` build on `schemas.ts`.
 */
export const CONTACT_EVENT_TYPES = [
  "contact.created",
  "contact.updated",
  "contact.deleted",
  "contact.unsubscribed",
  "contact.confirmed",
] as const;

export type ContactEventType = (typeof CONTACT_EVENT_TYPES)[number];

export const BROADCAST_EVENT_TYPES = [
  "broadcast.sending",
  "broadcast.sent",
  "broadcast.paused",
  "broadcast.canceled",
  "broadcast.failed",
] as const;

export type BroadcastEventType = (typeof BROADCAST_EVENT_TYPES)[number];

/** A message arrived in an inbox (`inbox-schemas.ts`). */
export const INBOX_EVENT_TYPES = ["inbox.message.received"] as const;

export type InboxEventType = (typeof INBOX_EVENT_TYPES)[number];
