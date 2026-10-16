/**
 * Push notifications to the iOS app (`@coss/push`): the devices that receive them (one per app
 * session, so whatever ends the session stops its pushes) and the outbox the worker sends from.
 */
import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { ID_PREFIXES, newId } from "../id.ts";
import { organization, session, user } from "./auth.ts";
import { environment } from "./domain.ts";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const apnsEnvironment = pgEnum("apns_environment", ["production", "sandbox"]);

export const pushDevice = pgTable(
  "push_device",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.pushDevice)),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sessionId: text("session_id")
      .notNull()
      .references(() => session.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    apnsEnvironment: apnsEnvironment("apns_environment").notNull(),
    // Categories (`PUSH_CATEGORIES`) the person wants on this device.
    categories: text("categories").array().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("push_device_session_idx").on(t.sessionId),
    // A phone's token belongs to one session at a time (the latest sign-in on it).
    uniqueIndex("push_device_token_idx").on(t.token),
    index("push_device_user_idx").on(t.userId),
  ],
);

export const pushNotificationKind = pgEnum("push_notification_kind", [
  "reputation_warning",
  "reputation_suspended",
  "billing_payment_failed",
  "billing_hold_placed",
  "webhook_endpoint_disabled",
  "hook_endpoint_disabled",
  "log_drain_disabled",
  "risk_review",
]);

export const pushNotificationStatus = pgEnum("push_notification_status", [
  "pending",
  "sent",
  "skipped",
  "failed",
]);

export const pushNotification = pgTable(
  "push_notification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.pushNotification)),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    environmentId: text("environment_id"),
    kind: pushNotificationKind("kind").notNull(),
    // What it is about (an endpoint, an invoice, a reputation event…), checked again at send time.
    subjectId: text("subject_id").notNull(),
    // Pending notifications with the same key are one notification (`count` says how many events).
    collapseKey: text("collapse_key"),
    count: integer("count").notNull().default(1),
    status: pushNotificationStatus("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    // When the worker should (re)try; also the claim's lease. Null once settled.
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    // Devices APNs accepted it for, so a retry never sends it to them twice.
    deliveredDeviceIds: text("delivered_device_ids").array().notNull().default(sql`'{}'::text[]`),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "push_notification_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    uniqueIndex("push_notification_pending_collapse_idx")
      .on(t.collapseKey)
      .where(sql`${t.status} = 'pending'`),
    index("push_notification_collapse_sent_idx")
      .on(t.collapseKey, t.sentAt)
      .where(sql`${t.collapseKey} IS NOT NULL AND ${t.sentAt} IS NOT NULL`),
    index("push_notification_next_attempt_idx")
      .on(t.nextAttemptAt)
      .where(sql`${t.nextAttemptAt} IS NOT NULL`),
    index("push_notification_created_at_idx").on(t.createdAt),
    index("push_notification_organization_idx").on(t.organizationId),
  ],
);
