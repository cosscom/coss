/**
 * SMS (`@coss/sms`): an organization's provider account (a Twilio subaccount), its carrier
 * registrations and phone numbers, the messages it sends and receives, their delivery events and
 * each environment's suppression list.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { ID_PREFIXES, newId } from "../id.ts";
import { organization } from "./auth.ts";
import { environment } from "./domain.ts";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const smsAccountStatus = pgEnum("sms_account_status", ["active", "closing", "closed"]);

/**
 * One per organization, created on first use: the destination countries it may send to and, once
 * it registers a sender, its provider subaccount. `auth_token` is the subaccount's, encrypted with
 * `encryptSecret` (`@coss/webhooks`): the provider signs the subaccount's callbacks with it.
 */
export const smsAccount = pgTable("sms_account", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  provider: text("provider"),
  subaccountSid: text("subaccount_sid").unique("sms_account_subaccount_sid_unique"),
  authToken: text("auth_token"),
  status: smsAccountStatus("status").notNull().default("active"),
  // ISO 3166 codes live sends may go to; owners and admins change them.
  allowedCountries: text("allowed_countries").array().notNull().default(sql`'{US,CA}'::text[]`),
  // High-risk countries a platform admin unlocked: only these can be allowed among them.
  unlockedCountries: text("unlocked_countries").array().notNull().default(sql`'{}'::text[]`),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const smsRegistrationKind = pgEnum("sms_registration_kind", ["us_10dlc", "toll_free"]);

export const smsRegistrationStatus = pgEnum("sms_registration_status", [
  "draft",
  "submitted",
  "in_review",
  "approved",
  "rejected",
  "failed",
]);

/** The business behind a registration (camelCase, as the dashboard's form collects it). */
export type SmsBusinessProfile = {
  legalName: string;
  /** e.g. `PRIVATE_PROFIT`, `PUBLIC_PROFIT`, `NON_PROFIT`. */
  companyType: string;
  /** EIN for US businesses. */
  taxId: string;
  /** `EIN`, or another registration authority. */
  taxIdType: string;
  /** e.g. `TECHNOLOGY`. */
  industry: string;
  website: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  stockExchange?: string | null;
  stockTicker?: string | null;
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    title: string;
    jobPosition: string;
  };
};

/** What the business will send, as carriers review it. */
export type SmsCampaignDetails = {
  /** A2P use case, e.g. `ACCOUNT_NOTIFICATION`, `2FA`, `MIXED`, `LOW_VOLUME`. */
  useCase: string;
  description: string;
  messageFlow: string;
  samples: string[];
  hasEmbeddedLinks: boolean;
  hasEmbeddedPhone: boolean;
  /** Toll-free verification: where recipients opt in (a public URL). */
  optInProofUrl?: string | null;
  /** Expected messages a month (toll-free verification). */
  monthlyVolume?: string | null;
};

/**
 * A carrier registration of the organization's senders: US A2P 10DLC (brand + campaign under the
 * coss.com ISV profile) or a toll-free number's verification. `step` is where the worker's state
 * machine is; every provider resource is stored as soon as it exists, so a step can run again.
 */
export const smsRegistration = pgTable(
  "sms_registration",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.smsRegistration)),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    kind: smsRegistrationKind("kind").notNull(),
    status: smsRegistrationStatus("status").notNull().default("draft"),
    step: text("step"),
    // `standard` (secondary vetting) or `low_volume_standard` (US 10DLC only).
    brandType: text("brand_type"),
    profile: jsonb("profile").$type<SmsBusinessProfile>().notNull(),
    campaign: jsonb("campaign").$type<SmsCampaignDetails>().notNull(),
    customerProfileSid: text("customer_profile_sid"),
    trustProductSid: text("trust_product_sid"),
    brandSid: text("brand_sid"),
    messagingServiceSid: text("messaging_service_sid"),
    campaignSid: text("campaign_sid"),
    tollFreeVerificationSid: text("toll_free_verification_sid"),
    // Toll-free: the number being verified.
    numberId: text("number_id"),
    rejectionReason: text("rejection_reason"),
    nextCheckAt: timestamp("next_check_at", { withTimezone: true }),
    // Monthly campaign fees (`sms.registrations`, `fee=campaign_monthly…`): the next one is due then.
    nextFeeAt: timestamp("next_fee_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("sms_registration_id_organization_unique").on(t.id, t.organizationId),
    index("sms_registration_organization_idx").on(t.organizationId),
    index("sms_registration_next_check_idx")
      .on(t.nextCheckAt)
      .where(sql`${t.nextCheckAt} is not null`),
  ],
);

export const smsNumberKind = pgEnum("sms_number_kind", ["local", "toll_free"]);
export const smsNumberStatus = pgEnum("sms_number_status", ["pending", "active", "releasing"]);

/**
 * A phone number the organization holds (one organization's at a time). Live sends go `from` an
 * `active` number whose registration is approved; replies route to `receiving_environment_id`.
 */
export const smsNumber = pgTable(
  "sms_number",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.smsNumber)),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // E.164.
    phoneNumber: text("phone_number").notNull().unique("sms_number_phone_number_unique"),
    kind: smsNumberKind("kind").notNull(),
    country: text("country").notNull(),
    provider: text("provider").notNull(),
    providerSid: text("provider_sid"),
    status: smsNumberStatus("status").notNull().default("pending"),
    // The registration it sends under (no FK: either may be removed first).
    registrationId: text("registration_id"),
    // Where its replies go (no FK: the environment may be deleted; routing re-checks it).
    receivingEnvironmentId: text("receiving_environment_id"),
    // Monthly number fees (`sms.numbers`): the next one is due then.
    nextFeeAt: timestamp("next_fee_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("sms_number_id_organization_unique").on(t.id, t.organizationId),
    index("sms_number_organization_idx").on(t.organizationId),
    index("sms_number_next_fee_idx").on(t.nextFeeAt).where(sql`${t.nextFeeAt} is not null`),
  ],
);

export const smsStatus = pgEnum("sms_status", [
  "queued",
  "scheduled",
  "sent",
  "delivered",
  "undelivered",
  "failed",
  "canceled",
]);

export type SmsTag = { name: string; value: string };

export const smsMessage = pgTable(
  "sms_message",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.smsMessage)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull(),
    // No FK: Better Auth hard-deletes expired keys, and history must survive that.
    apiKeyId: text("api_key_id"),
    // The member whose personal key sent it, captured at acceptance (their spend). No FK.
    apiKeyOwnerId: text("api_key_owner_id"),
    status: smsStatus("status").notNull().default("queued"),
    // E.164 numbers.
    from: text("from").notNull(),
    to: text("to").notNull(),
    // ISO 3166 code of `to`: what the message is priced and allowed by.
    toCountry: text("to_country").notNull(),
    // The organization's number it is sent from (live sends; no FK: numbers can be released).
    numberId: text("number_id"),
    body: text("body").notNull(),
    // Internal senders only (Verify's codes): the body is a secret, cleared once the message is
    // sent, failed or canceled.
    discardBody: boolean("discard_body").notNull().default(false),
    // `gsm7` or `ucs2`: how the body is encoded, which decides `segments`.
    encoding: text("encoding").notNull(),
    segments: integer("segments").notNull(),
    tags: jsonb("tags").$type<SmsTag[]>().notNull().default([]),
    // The claim: set only when a dispatcher takes the message.
    provider: text("provider"),
    providerMessageId: text("provider_message_id"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    idempotencyKey: text("idempotency_key"),
    requestHash: text("request_hash"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    // Billing: metered once (`sms.segments`, by `to_country`) when it reaches a carrier.
    usageRecordedAt: timestamp("usage_recorded_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "sms_message_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    // NULL keys are distinct, so requests without an Idempotency-Key never conflict.
    unique("sms_message_environment_idempotency_key_unique").on(t.environmentId, t.idempotencyKey),
    index("sms_message_environment_created_at_idx").on(t.environmentId, t.createdAt.desc()),
    // Reputation checks scan an organization's messages by the time they were sent
    // (`@coss/sms` reputation-checks.ts `SEND_TIME`; keep the expression identical).
    index("sms_message_organization_send_time_idx").on(
      t.organizationId,
      sql`coalesce(${t.sentAt}, ${t.createdAt})`,
    ),
    index("sms_message_scheduled_due_idx").on(t.scheduledAt).where(sql`${t.status} = 'scheduled'`),
    index("sms_message_queued_created_at_idx").on(t.createdAt).where(sql`${t.status} = 'queued'`),
    // The worker's retention purge (oldest first, across organizations).
    index("sms_message_created_at_idx").on(t.createdAt),
    unique("sms_message_id_organization_unique").on(t.id, t.organizationId),
  ],
);

export const smsEventType = pgEnum("sms_event_type", [
  "sms.scheduled",
  "sms.sent",
  "sms.delivered",
  "sms.undelivered",
  "sms.failed",
  "sms.suppressed",
  "sms.canceled",
]);

/** Wire-format (snake_case) event details, stored as-is and returned by the API. */
export type SmsEventDetails = {
  failure?: { code: string; message: string };
  /** The provider's or the carrier's own error code (e.g. Twilio `30007`). */
  provider_error_code?: string | null;
  suppression?: { id: string; reason: SmsSuppressionReason };
};

/** Normalized delivery events (from Twilio, the fake provider or coss.com itself). */
export const smsEvent = pgTable(
  "sms_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.smsEvent)),
    organizationId: text("organization_id").notNull(),
    environmentId: text("environment_id").notNull(),
    messageId: text("message_id").notNull(),
    type: smsEventType("type").notNull(),
    provider: text("provider").notNull(),
    providerStatus: text("provider_status").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    details: jsonb("details").$type<SmsEventDetails>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "sms_event_message_fk",
      columns: [t.messageId, t.organizationId],
      foreignColumns: [smsMessage.id, smsMessage.organizationId],
    }).onDelete("cascade"),
    unique("sms_event_message_dedupe_unique").on(t.messageId, t.dedupeKey),
    index("sms_event_message_occurred_at_idx").on(t.messageId, t.occurredAt),
  ],
);

export const smsSuppressionReason = pgEnum("sms_suppression_reason", [
  "opt_out",
  "manual",
  "invalid_number",
]);

export type SmsSuppressionReason = (typeof smsSuppressionReason.enumValues)[number];

/** An environment's SMS suppression list: sends to a listed number are skipped. */
export const smsSuppression = pgTable(
  "sms_suppression",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.smsSuppression)),
    sequence: bigint("sequence", { mode: "number" }).generatedAlwaysAsIdentity(),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull(),
    // E.164.
    phoneNumber: text("phone_number").notNull(),
    reason: smsSuppressionReason("reason").notNull(),
    // The message whose failure or reply added it. No FK: the entry outlives the message.
    messageId: text("message_id"),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "sms_suppression_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    unique("sms_suppression_environment_phone_unique").on(t.environmentId, t.phoneNumber),
    index("sms_suppression_environment_sequence_idx").on(
      t.environmentId,
      t.createdAt.desc(),
      t.sequence.desc(),
    ),
  ],
);

/** A message received on one of the organization's numbers, in its receiving environment. */
export const smsReceived = pgTable(
  "sms_received",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.smsReceived)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull(),
    numberId: text("number_id"),
    from: text("from").notNull(),
    to: text("to").notNull(),
    body: text("body").notNull(),
    segments: integer("segments").notNull(),
    // Country of the receiving number: what the message is priced by.
    country: text("country").notNull(),
    // `stop`, `start` or `help` when the body is an opt-out keyword.
    keyword: text("keyword"),
    provider: text("provider").notNull(),
    providerMessageId: text("provider_message_id").notNull(),
    usageRecordedAt: timestamp("usage_recorded_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "sms_received_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    // Providers retry callbacks: a message is stored once.
    unique("sms_received_provider_message_unique").on(t.provider, t.providerMessageId),
    index("sms_received_environment_created_at_idx").on(t.environmentId, t.createdAt.desc()),
    index("sms_received_created_at_idx").on(t.createdAt),
  ],
);

/**
 * Every inbound message the provider reported, routed or not: a retried callback is recognized
 * by it even when nothing was stored (an unrouted STOP or START must not be applied twice, or a
 * retry could undo a later change), and opt-outs stay counted by reputation after a START or a
 * removed suppression. Purged with received messages.
 */
export const smsInboundReceipt = pgTable(
  "sms_inbound_receipt",
  {
    provider: text("provider").notNull(),
    providerMessageId: text("provider_message_id").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Who sent it and its opt-out keyword (`stop`, `start`, `help`), for the opt-out rate.
    fromNumber: text("from_number"),
    keyword: text("keyword"),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerMessageId] }),
    index("sms_inbound_receipt_created_at_idx").on(t.createdAt),
    // Reputation's opt-out count and organization deletion's batches.
    index("sms_inbound_receipt_organization_created_at_idx").on(t.organizationId, t.createdAt),
  ],
);
