/**
 * Inboxes (`@coss/email` inboxes): an address of an environment, usually an AI agent's, whose
 * received emails and sends are grouped into threads. The content stays where it is: inbound
 * messages point at `received_email`, outbound ones at `email`, and are deleted with them.
 */
import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { ID_PREFIXES, newId } from "../id.ts";
import { email, environment, receivedEmail } from "./domain.ts";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** `managed`: at the environment's domain under coss.com's inbound domain; `domain`: a receiving domain's. */
export const inboxKind = pgEnum("inbox_kind", ["managed", "domain"]);

/**
 * One address (`<username>@<domain>`, lower-cased, unique per environment) an environment receives
 * and sends conversations at. Mail reaches it only while its domain routes to the environment: a
 * receiving domain that moves to another environment (or organization) takes its mail along, and
 * the new owner can create inboxes at the same addresses while the old ones keep their threads.
 */
export const inbox = pgTable(
  "inbox",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.inbox)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull(),
    kind: inboxKind("kind").notNull(),
    username: text("username").notNull(),
    domain: text("domain").notNull(),
    address: text("address").notNull(),
    displayName: text("display_name"),
    // The customer's own id for the inbox (e.g. their user's or agent's): creating it again returns it.
    clientId: text("client_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "inbox_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    unique("inbox_environment_address_unique").on(t.environmentId, t.address),
    // NULL client ids are distinct.
    unique("inbox_environment_client_id_unique").on(t.environmentId, t.clientId),
    unique("inbox_id_organization_unique").on(t.id, t.organizationId),
    index("inbox_environment_id_idx").on(t.environmentId, t.id.desc()),
    index("inbox_organization_idx").on(t.organizationId),
  ],
);

/** A conversation of one inbox: its messages share references (or a subject and a participant). */
export const inboxThread = pgTable(
  "inbox_thread",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.inboxThread)),
    organizationId: text("organization_id").notNull(),
    environmentId: text("environment_id").notNull(),
    inboxId: text("inbox_id").notNull(),
    // The first message's subject as it was, and the key replies are matched by: the SHA-256 (hex) of
    // the subject without `Re:`, lower-cased; '' for none. A digest, so any subject fits the index.
    subject: text("subject"),
    subjectKey: text("subject_key").notNull(),
    // Bare addresses of everyone in the conversation but the inbox itself.
    participants: text("participants").array().notNull().default(sql`'{}'::text[]`),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "inbox_thread_inbox_fk",
      columns: [t.inboxId, t.organizationId],
      foreignColumns: [inbox.id, inbox.organizationId],
    }).onDelete("cascade"),
    unique("inbox_thread_id_organization_unique").on(t.id, t.organizationId),
    // Thread lists: most recent activity first.
    index("inbox_thread_inbox_last_message_idx").on(t.inboxId, t.lastMessageAt.desc(), t.id.desc()),
    index("inbox_thread_inbox_subject_idx").on(t.inboxId, t.subjectKey),
    // The retention purge of threads whose messages are gone.
    index("inbox_thread_last_message_at_idx").on(t.lastMessageAt),
    index("inbox_thread_organization_idx").on(t.organizationId),
  ],
);

export const inboxMessageDirection = pgEnum("inbox_message_direction", ["inbound", "outbound"]);

/**
 * A message of a thread: a received email (`inbound`) or an email sent from the inbox
 * (`outbound`). Deleted with the email it points at (retention, deletes).
 */
export const inboxMessage = pgTable(
  "inbox_message",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.inboxMessage)),
    organizationId: text("organization_id").notNull(),
    environmentId: text("environment_id").notNull(),
    inboxId: text("inbox_id").notNull(),
    threadId: text("thread_id").notNull(),
    direction: inboxMessageDirection("direction").notNull(),
    receivedEmailId: text("received_email_id"),
    emailId: text("email_id"),
    // The `Message-ID` of an inbound message, at most `MAX_MESSAGE_ID_LENGTH` (outbound ones are
    // matched by the provider's id).
    rfcMessageId: text("rfc_message_id"),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "inbox_message_thread_fk",
      columns: [t.threadId, t.organizationId],
      foreignColumns: [inboxThread.id, inboxThread.organizationId],
    }).onDelete("cascade"),
    foreignKey({
      name: "inbox_message_received_email_fk",
      columns: [t.receivedEmailId, t.organizationId],
      foreignColumns: [receivedEmail.id, receivedEmail.organizationId],
    }).onDelete("cascade"),
    foreignKey({
      name: "inbox_message_email_fk",
      columns: [t.emailId, t.organizationId],
      foreignColumns: [email.id, email.organizationId],
    }).onDelete("cascade"),
    check(
      "inbox_message_source_check",
      sql`(${t.direction} = 'inbound' and ${t.receivedEmailId} is not null and ${t.emailId} is null) or (${t.direction} = 'outbound' and ${t.emailId} is not null and ${t.receivedEmailId} is null)`,
    ),
    unique("inbox_message_inbox_received_email_unique").on(t.inboxId, t.receivedEmailId),
    unique("inbox_message_email_unique").on(t.emailId),
    // A thread's messages by when they were received or sent.
    index("inbox_message_thread_idx").on(t.threadId, t.createdAt, t.id),
    index("inbox_message_inbox_id_idx").on(t.inboxId, t.id.desc()),
    index("inbox_message_inbox_rfc_message_id_idx")
      .on(t.inboxId, t.rfcMessageId)
      .where(sql`${t.rfcMessageId} is not null`),
    index("inbox_message_received_email_idx").on(t.receivedEmailId),
    index("inbox_message_organization_idx").on(t.organizationId),
  ],
);
