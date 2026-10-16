/**
 * Webhook event types of contacts (environment-scoped). No imports: `schemas.ts` lists them in
 * `WEBHOOK_EVENT_TYPES` while `contact-schemas.ts` builds on `schemas.ts`.
 */
export const CONTACT_EVENT_TYPES = [
  "contact.created",
  "contact.updated",
  "contact.deleted",
  "contact.unsubscribed",
  "contact.confirmed",
] as const;

export type ContactEventType = (typeof CONTACT_EVENT_TYPES)[number];
