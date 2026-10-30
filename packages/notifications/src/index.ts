/**
 * coss.com's notification emails to organizations: the outbox products enqueue into, the worker's
 * send loop, recipients and retention. Server-only; the layout is `@coss/email-layout`.
 */
export * from "./outbox.ts";
export * from "./recipients.ts";
export * from "./retention.ts";
