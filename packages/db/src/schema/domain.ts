import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  json,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { ID_PREFIXES, newId } from "../id.ts";
import { apikey, organization, user } from "./auth.ts";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const project = pgTable(
  "project",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.project)),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("project_organization_slug_unique").on(t.organizationId, t.slug),
    // Target for composite FKs that pin children to the same organization.
    unique("project_id_organization_unique").on(t.id, t.organizationId),
  ],
);

export const environmentMode = pgEnum("environment_mode", ["live", "sandbox"]);

export const environment = pgTable(
  "environment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.environment)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    mode: environmentMode("mode").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "environment_project_fk",
      columns: [t.projectId, t.organizationId],
      foreignColumns: [project.id, project.organizationId],
    }).onDelete("cascade"),
    unique("environment_project_slug_unique").on(t.projectId, t.slug),
    unique("environment_id_organization_unique").on(t.id, t.organizationId),
    index("environment_organization_idx").on(t.organizationId),
  ],
);

/**
 * Binds a Better Auth API key to exactly one environment. Keys without a binding are rejected,
 * so keys minted outside our flow fail closed. Organization/project are derived via the join.
 */
export const environmentApiKey = pgTable(
  "environment_api_key",
  {
    apiKeyId: text("api_key_id")
      .primaryKey()
      .references(() => apikey.id, { onDelete: "cascade" }),
    environmentId: text("environment_id")
      .notNull()
      .references(() => environment.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [index("environment_api_key_environment_idx").on(t.environmentId)],
);

export const emailStatus = pgEnum("email_status", [
  "queued",
  "sent",
  "failed",
  "scheduled",
  "canceled",
]);

export type EmailTag = { name: string; value: string };

export const email = pgTable(
  "email",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.email)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull(),
    // No FK: Better Auth hard-deletes expired keys, and email history must survive that.
    apiKeyId: text("api_key_id"),
    status: emailStatus("status").notNull().default("queued"),
    from: text("from").notNull(),
    to: text("to").array().notNull(),
    cc: text("cc").array().notNull().default(sql`'{}'::text[]`),
    bcc: text("bcc").array().notNull().default(sql`'{}'::text[]`),
    replyTo: text("reply_to").array().notNull().default(sql`'{}'::text[]`),
    subject: text("subject").notNull(),
    html: text("html"),
    text: text("text"),
    headers: jsonb("headers").$type<Record<string, string>>().notNull().default({}),
    tags: jsonb("tags").$type<EmailTag[]>().notNull().default([]),
    // Matched against category-scoped suppressions.
    category: text("category"),
    provider: text("provider"),
    providerMessageId: text("provider_message_id"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    idempotencyKey: text("idempotency_key"),
    requestHash: text("request_hash"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    // When the email may be handed to the provider; set only for requests with `scheduled_at`.
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  },
  (t) => [
    foreignKey({
      name: "email_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    // NULL keys are distinct, so requests without an Idempotency-Key never conflict.
    unique("email_environment_idempotency_key_unique").on(t.environmentId, t.idempotencyKey),
    index("email_environment_created_at_idx").on(t.environmentId, t.createdAt.desc()),
    // Due-scan for scheduled sends. Not filtered on `status = 'scheduled'`: a new enum value
    // can't be used in the migration transaction that adds it.
    index("email_scheduled_at_idx").on(t.scheduledAt).where(sql`${t.scheduledAt} is not null`),
    // Target for composite FKs that pin children to the same organization.
    unique("email_id_organization_unique").on(t.id, t.organizationId),
  ],
);

export const emailRecipientKind = pgEnum("email_recipient_kind", ["to", "cc", "bcc"]);

/** Ordered by precedence: a recipient only moves to a higher-ranked status (see `@coss/email`). */
export const emailRecipientStatus = pgEnum("email_recipient_status", [
  "queued",
  "sent",
  "delivery_delayed",
  "delivered",
  "bounced",
  "suppressed",
  "complained",
  "failed",
  "canceled",
]);

/** Wire-format (snake_case) event details, stored as-is and returned by the API. */
export type EmailEventDetails = {
  bounce?: {
    type: "permanent" | "transient" | "undetermined";
    sub_type: string;
    diagnostic_code: string | null;
  };
  complaint?: { feedback_type: string | null; sub_type: string | null };
  delay?: { type: string; expires_at: string | null; diagnostic_code: string | null };
  delivery?: { smtp_response: string | null };
  failure?: { code: string; message: string };
  suppression?: { id: string; scope: string; reason: EmailSuppressionReason };
};

/** One row per distinct recipient address of an email; its status is driven by delivery events. */
export const emailRecipient = pgTable(
  "email_recipient",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.emailRecipient)),
    organizationId: text("organization_id").notNull(),
    emailId: text("email_id").notNull(),
    // Bare address, lower-cased (no display name).
    address: text("address").notNull(),
    kind: emailRecipientKind("kind").notNull(),
    position: integer("position").notNull(),
    status: emailRecipientStatus("status").notNull().default("queued"),
    lastEventAt: timestamp("last_event_at", { withTimezone: true }),
    details: jsonb("details").$type<EmailEventDetails>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "email_recipient_email_fk",
      columns: [t.emailId, t.organizationId],
      foreignColumns: [email.id, email.organizationId],
    }).onDelete("cascade"),
    unique("email_recipient_email_address_unique").on(t.emailId, t.address),
  ],
);

export const emailEventType = pgEnum("email_event_type", [
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.complained",
  "email.failed",
  "email.suppressed",
  "email.scheduled",
  "email.canceled",
]);

/**
 * Normalized delivery events (from SES, the fake provider, or COSS itself). Message-level events
 * (`email.sent`, `email.failed`) have no recipient. `dedupe_key` makes ingestion idempotent.
 */
export const emailEvent = pgTable(
  "email_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.emailEvent)),
    organizationId: text("organization_id").notNull(),
    environmentId: text("environment_id").notNull(),
    emailId: text("email_id").notNull(),
    type: emailEventType("type").notNull(),
    provider: text("provider").notNull(),
    providerEventType: text("provider_event_type").notNull(),
    recipient: text("recipient"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    details: jsonb("details").$type<EmailEventDetails>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "email_event_email_fk",
      columns: [t.emailId, t.organizationId],
      foreignColumns: [email.id, email.organizationId],
    }).onDelete("cascade"),
    unique("email_event_email_dedupe_unique").on(t.emailId, t.dedupeKey),
    index("email_event_email_occurred_at_idx").on(t.emailId, t.occurredAt),
  ],
);

export const emailSuppressionReason = pgEnum("email_suppression_reason", [
  "bounce",
  "complaint",
  "manual",
]);

export type EmailSuppressionReason = (typeof emailSuppressionReason.enumValues)[number];

/**
 * An environment's suppression list: sends skip a recipient whose address has an entry with scope
 * `*` or with the email's category. Permanent bounces and complaints add `*` entries.
 */
export const emailSuppression = pgTable(
  "email_suppression",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.emailSuppression)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull(),
    // Bare address, lower-cased (no display name).
    address: text("address").notNull(),
    // `*` (every email) or a category.
    scope: text("scope").notNull(),
    reason: emailSuppressionReason("reason").notNull(),
    // The email whose bounce or complaint added the entry. No FK: the entry outlives the email.
    emailId: text("email_id"),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "email_suppression_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    unique("email_suppression_environment_address_scope_unique").on(
      t.environmentId,
      t.address,
      t.scope,
    ),
    index("email_suppression_environment_id_idx").on(t.environmentId, t.id.desc()),
  ],
);

export const tenantSendingStatus = pgEnum("tenant_sending_status", [
  "enabled",
  "disabled",
  "reinstated",
]);

/**
 * The provider-side tenant of an organization (an SES tenant: isolated reputation, suppression
 * list and pausing). Created with the organization's first domain.
 */
export const emailTenant = pgTable("email_tenant", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  tenantName: text("tenant_name").notNull().unique("email_tenant_name_unique"),
  tenantArn: text("tenant_arn"),
  sendingStatus: tenantSendingStatus("sending_status").notNull().default("enabled"),
  // Bootstrap commits the imported lists and this marker together before disabling SES suppression.
  suppressionMigratedAt: timestamp("suppression_migrated_at", { withTimezone: true }),
  statusCause: text("status_cause"),
  statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const domainStatus = pgEnum("domain_status", [
  "pending",
  "verified",
  "temporary_failure",
  "failed",
  "deleting",
]);

export const mailFromStatus = pgEnum("mail_from_status", [
  "pending",
  "success",
  "temporary_failure",
  "failed",
]);

/** Result of checking one DNS record a domain needs (or should have). */
export type DomainRecord = {
  purpose: "dkim" | "mail_from_mx" | "mail_from_spf" | "dmarc";
  type: "CNAME" | "MX" | "TXT";
  name: string;
  value: string;
  priority: number | null;
  required: boolean;
  status: "verified" | "missing" | "mismatch" | "not_checked";
  /** What DNS returned when it did not match. */
  found: string[];
};

/**
 * A sending domain of an organization (an SES domain identity with Easy DKIM and a custom MAIL
 * FROM subdomain). Names are unique across organizations while not `failed`: DKIM tokens belong
 * to the provider account, so two organizations can never hold the same identity.
 */
export const domain = pgTable(
  "domain",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.domain)),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Lower-case ASCII (punycode), no trailing dot.
    name: text("name").notNull(),
    status: domainStatus("status").notNull().default("pending"),
    canSend: boolean("can_send").notNull().default(false),
    provider: text("provider").notNull(),
    region: text("region"),
    dkimTokens: text("dkim_tokens").array().notNull().default(sql`'{}'::text[]`),
    dkimHostedZone: text("dkim_hosted_zone"),
    mailFromDomain: text("mail_from_domain").notNull(),
    mailFromStatus: mailFromStatus("mail_from_status").notNull().default("pending"),
    records: jsonb("records").$type<DomainRecord[]>().notNull().default([]),
    // Verification gives up 72 hours after this (creation, or the latest restart).
    verificationStartedAt: timestamp("verification_started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    nextCheckAt: timestamp("next_check_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("domain_name_active_unique").on(t.name).where(sql`${t.status} <> 'failed'`),
    index("domain_organization_idx").on(t.organizationId),
    index("domain_next_check_at_idx").on(t.nextCheckAt).where(sql`${t.nextCheckAt} is not null`),
    unique("domain_id_organization_unique").on(t.id, t.organizationId),
  ],
);

/** A customer URL that receives signed event notifications for one environment. */
export const webhookEndpoint = pgTable(
  "webhook_endpoint",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.webhookEndpoint)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    // Event types to deliver; empty means every type.
    eventTypes: text("event_types").array().notNull().default(sql`'{}'::text[]`),
    // The `whsec_…` signing secret, encrypted with WEBHOOK_SECRETS_KEY (it must be reversible).
    secretCiphertext: text("secret_ciphertext").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "webhook_endpoint_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    index("webhook_endpoint_environment_idx").on(t.environmentId),
    unique("webhook_endpoint_id_organization_unique").on(t.id, t.organizationId),
  ],
);

/** One event to notify an environment's endpoints about (the outbox). `id` is the event's id. */
export const webhookMessage = pgTable(
  "webhook_message",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    environmentId: text("environment_id").notNull(),
    type: text("type").notNull(),
    // `json`, not `jsonb`: keeps the payload's key order, so deliveries read as they were built.
    payload: json("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "webhook_message_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    unique("webhook_message_id_organization_unique").on(t.id, t.organizationId),
  ],
);

export const webhookDeliveryStatus = pgEnum("webhook_delivery_status", [
  "pending",
  "succeeded",
  "failed",
]);

/** A message to one endpoint, retried with backoff by the worker until it succeeds or gives up. */
export const webhookDelivery = pgTable(
  "webhook_delivery",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.webhookDelivery)),
    organizationId: text("organization_id").notNull(),
    messageId: text("message_id").notNull(),
    endpointId: text("endpoint_id").notNull(),
    status: webhookDeliveryStatus("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    // Set while a worker is attempting it; an expired lease can be taken over.
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    lastStatusCode: integer("last_status_code"),
    lastError: text("last_error"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "webhook_delivery_message_fk",
      columns: [t.messageId, t.organizationId],
      foreignColumns: [webhookMessage.id, webhookMessage.organizationId],
    }).onDelete("cascade"),
    foreignKey({
      name: "webhook_delivery_endpoint_fk",
      columns: [t.endpointId, t.organizationId],
      foreignColumns: [webhookEndpoint.id, webhookEndpoint.organizationId],
    }).onDelete("cascade"),
    unique("webhook_delivery_message_endpoint_unique").on(t.messageId, t.endpointId),
    index("webhook_delivery_due_idx").on(t.nextAttemptAt).where(sql`${t.status} = 'pending'`),
    index("webhook_delivery_endpoint_created_at_idx").on(t.endpointId, t.createdAt.desc()),
    unique("webhook_delivery_id_organization_unique").on(t.id, t.organizationId),
  ],
);

/** One HTTP attempt of a delivery (the endpoint's delivery log). */
export const webhookAttempt = pgTable(
  "webhook_attempt",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.webhookAttempt)),
    organizationId: text("organization_id").notNull(),
    deliveryId: text("delivery_id").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull(),
    statusCode: integer("status_code"),
    durationMs: integer("duration_ms").notNull(),
    error: text("error"),
    // At most 1 KB of the response body, as text.
    responseExcerpt: text("response_excerpt"),
  },
  (t) => [
    foreignKey({
      name: "webhook_attempt_delivery_fk",
      columns: [t.deliveryId, t.organizationId],
      foreignColumns: [webhookDelivery.id, webhookDelivery.organizationId],
    }).onDelete("cascade"),
    index("webhook_attempt_delivery_idx").on(t.deliveryId, t.attemptedAt),
  ],
);
