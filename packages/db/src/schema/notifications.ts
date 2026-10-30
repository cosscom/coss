/**
 * coss.com's notification emails to an organization's people (`@coss/notifications`): an outbox a
 * product writes into in the transaction that decides the email, sent later by the worker.
 */
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { ID_PREFIXES, newId } from "../id.ts";
import { organization } from "./auth.ts";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const notificationStatus = pgEnum("notification_status", [
  "pending",
  "sent",
  "skipped",
  "failed",
]);

/**
 * One notification email to an organization (a kind and its payload; recipients and content are
 * resolved when it is sent). `dedupe_key` makes each one once-only within the organization.
 */
export const notification = pgTable(
  "notification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.notification)),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: notificationStatus("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    // When the worker should (re)try — not before then, so also a delay — and the claim's
    // lease. Null once settled.
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    recipients: text("recipients").array().notNull().default(sql`'{}'::text[]`),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("notification_dedupe_unique").on(t.organizationId, t.dedupeKey),
    index("notification_next_attempt_idx")
      .on(t.nextAttemptAt)
      .where(sql`${t.nextAttemptAt} IS NOT NULL`),
    index("notification_created_at_idx").on(t.createdAt),
  ],
);
