/**
 * Webhook event types of contacts and broadcasts (environment-scoped). No imports: `schemas.ts`
 * lists them in `WEBHOOK_EVENT_TYPES` while `contact-schemas.ts` and `broadcast-schemas.ts` build
 * on `schemas.ts`.
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
