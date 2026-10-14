import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  customType,
  foreignKey,
  index,
  integer,
  json,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
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

// One `POST /v1/emails/batch` request. Holds the batch's idempotency key; its emails' keys are NULL.
export const emailBatch = pgTable(
  "email_batch",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.emailBatch)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull(),
    // No FK: Better Auth hard-deletes expired keys, and email history must survive that.
    apiKeyId: text("api_key_id"),
    idempotencyKey: text("idempotency_key"),
    requestHash: text("request_hash"),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "email_batch_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    // NULL keys are distinct, so requests without an Idempotency-Key never conflict.
    unique("email_batch_environment_idempotency_key_unique").on(t.environmentId, t.idempotencyKey),
    unique("email_batch_id_organization_unique").on(t.id, t.organizationId),
  ],
);

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
    // Internal sends whose body holds a secret (sign-in links in auth emails): `html`/`text` are
    // cleared when the email leaves `queued`/`scheduled`, like attachment content.
    discardBody: boolean("discard_body").notNull().default(false),
    headers: jsonb("headers").$type<Record<string, string>>().notNull().default({}),
    tags: jsonb("tags").$type<EmailTag[]>().notNull().default([]),
    // Matched against category-scoped suppressions and tracking rules.
    category: text("category"),
    // Open/click tracking, resolved once at send (per-send override, category rule, environment
    // default). The token names the email in its public `/t/*` URLs; set only when tracking is on.
    trackOpens: boolean("track_opens").notNull().default(false),
    trackClicks: boolean("track_clicks").notNull().default(false),
    trackingToken: text("tracking_token").unique("email_tracking_token_unique"),
    openCount: integer("open_count").notNull().default(0),
    firstOpenedAt: timestamp("first_opened_at", { withTimezone: true }),
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
    clickCount: integer("click_count").notNull().default(0),
    firstClickedAt: timestamp("first_clicked_at", { withTimezone: true }),
    lastClickedAt: timestamp("last_clicked_at", { withTimezone: true }),
    provider: text("provider"),
    providerMessageId: text("provider_message_id"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    idempotencyKey: text("idempotency_key"),
    requestHash: text("request_hash"),
    // Set for emails sent by `POST /v1/emails/batch`; the index is the email's position in it.
    batchId: text("batch_id"),
    batchIndex: integer("batch_index"),
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
    foreignKey({
      name: "email_batch_fk",
      columns: [t.batchId, t.organizationId],
      foreignColumns: [emailBatch.id, emailBatch.organizationId],
    }),
    index("email_batch_idx").on(t.batchId, t.batchIndex).where(sql`${t.batchId} is not null`),
    // NULL keys are distinct, so requests without an Idempotency-Key never conflict.
    unique("email_environment_idempotency_key_unique").on(t.environmentId, t.idempotencyKey),
    index("email_environment_created_at_idx").on(t.environmentId, t.createdAt.desc()),
    // Reputation checks scan an organization's recent emails.
    index("email_organization_created_at_idx").on(t.organizationId, t.createdAt),
    // Due-scan for scheduled sends. Not filtered on `status = 'scheduled'`: a new enum value
    // can't be used in the migration transaction that adds it.
    index("email_scheduled_at_idx").on(t.scheduledAt).where(sql`${t.scheduledAt} is not null`),
    // The worker's sweeps for queued emails whose dispatch was lost or interrupted.
    index("email_queued_created_at_idx").on(t.createdAt).where(sql`${t.status} = 'queued'`),
    // The worker's retention purge (oldest first, across organizations).
    index("email_created_at_idx").on(t.createdAt),
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
  open?: { user_agent: string | null };
  click?: { url: string; link_position: number; user_agent: string | null };
  reschedule?: { scheduled_at: string; previous_scheduled_at: string };
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

/** Postgres `bytea` (drizzle 0.x has no builder for it); node-postgres returns a `Buffer`. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/**
 * One row per attachment of an email. `content` is only kept until the email is sent or fails,
 * then set to null; the metadata stays.
 */
export const emailAttachment = pgTable(
  "email_attachment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.emailAttachment)),
    organizationId: text("organization_id").notNull(),
    emailId: text("email_id").notNull(),
    position: integer("position").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    // Set for inline attachments (referenced from the HTML as `cid:<content_id>`).
    contentId: text("content_id"),
    size: integer("size").notNull(),
    // Hex SHA-256 of the content, kept after the content is purged.
    sha256: text("sha256").notNull(),
    content: bytea("content"),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "email_attachment_email_fk",
      columns: [t.emailId, t.organizationId],
      foreignColumns: [email.id, email.organizationId],
    }).onDelete("cascade"),
    unique("email_attachment_email_position_unique").on(t.emailId, t.position),
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
  "email.opened",
  "email.clicked",
  "email.rescheduled",
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
  "import",
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
    sequence: bigint("sequence", { mode: "number" }).generatedAlwaysAsIdentity(),
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
    index("email_suppression_environment_sequence_idx").on(
      t.environmentId,
      t.createdAt.desc(),
      t.sequence.desc(),
    ),
  ],
);

/**
 * An environment's open/click tracking settings: the row with a NULL category is the environment
 * default, the others override it for one category. Each field resolves separately (a send's own
 * `tracking` wins, then its category's rule, then the default, then off).
 */
export const emailTrackingRule = pgTable(
  "email_tracking_rule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.emailTrackingRule)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull(),
    category: text("category"),
    opens: boolean("opens").notNull(),
    clicks: boolean("clicks").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "email_tracking_rule_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    unique("email_tracking_rule_environment_category_unique")
      .on(t.environmentId, t.category)
      .nullsNotDistinct(),
  ],
);

/** A link COSS rewrote in a click-tracked email; `position` is its index in the HTML. */
export const emailLink = pgTable(
  "email_link",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.emailLink)),
    organizationId: text("organization_id").notNull(),
    emailId: text("email_id").notNull(),
    position: integer("position").notNull(),
    url: text("url").notNull(),
    clickCount: integer("click_count").notNull().default(0),
    firstClickedAt: timestamp("first_clicked_at", { withTimezone: true }),
    lastClickedAt: timestamp("last_clicked_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "email_link_email_fk",
      columns: [t.emailId, t.organizationId],
      foreignColumns: [email.id, email.organizationId],
    }).onDelete("cascade"),
    unique("email_link_email_position_unique").on(t.emailId, t.position),
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

export const trackingDomainStatus = pgEnum("tracking_domain_status", [
  "pending",
  "active",
  "temporary_failure",
  "failed",
  "deleting",
]);

/** Result of checking the CNAME a tracking domain needs (same statuses as `DomainRecord`). */
export type TrackingDomainRecord = {
  type: "CNAME";
  name: string;
  value: string;
  status: DomainRecord["status"];
  found: string[];
};

/**
 * The custom tracking hostname of a sending domain (e.g. `links.acme.com`, a CNAME to COSS's
 * tracking host): open pixels and click redirects of emails sent from that domain use it once the
 * provider (Cloudflare for SaaS) serves it with a certificate. At most one per domain; hostnames
 * are unique across organizations while not `failed`.
 */
export const trackingDomain = pgTable(
  "tracking_domain",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.trackingDomain)),
    organizationId: text("organization_id").notNull(),
    domainId: text("domain_id").notNull(),
    // Lower-case ASCII (punycode), no trailing dot; a subdomain of the domain's name.
    hostname: text("hostname").notNull(),
    status: trackingDomainStatus("status").notNull().default("pending"),
    provider: text("provider").notNull(),
    // The provider's id for the hostname (a Cloudflare custom hostname id); null until created.
    providerHostnameId: text("provider_hostname_id"),
    record: jsonb("record").$type<TrackingDomainRecord>().notNull(),
    // The latest problem the provider reported (certificate validation, blocked hostname…).
    providerMessage: text("provider_message"),
    // Verification gives up 72 hours after this (creation, or the latest restart).
    verificationStartedAt: timestamp("verification_started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    nextCheckAt: timestamp("next_check_at", { withTimezone: true }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "tracking_domain_domain_fk",
      columns: [t.domainId, t.organizationId],
      foreignColumns: [domain.id, domain.organizationId],
    }).onDelete("cascade"),
    unique("tracking_domain_domain_unique").on(t.domainId),
    uniqueIndex("tracking_domain_hostname_active_unique")
      .on(t.hostname)
      .where(sql`${t.status} <> 'failed'`),
    index("tracking_domain_next_check_at_idx")
      .on(t.nextCheckAt)
      .where(sql`${t.nextCheckAt} is not null`),
  ],
);

/** Result of checking the MX a receiving domain needs (same statuses as `DomainRecord`). */
export type ReceivingDomainRecord = {
  type: "MX";
  name: string;
  value: string;
  priority: number;
  status: DomainRecord["status"];
  found: string[];
};

/**
 * A hostname of a sending domain that receives email (the domain itself or a subdomain, with an MX
 * to the provider's inbound host), delivered to one environment of the organization. At most one
 * per domain; hostnames are unique across organizations. The MX check is only shown to the
 * customer: mail is accepted whenever the provider receives it for a routed hostname.
 */
export const receivingDomain = pgTable(
  "receiving_domain",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.receivingDomain)),
    organizationId: text("organization_id").notNull(),
    domainId: text("domain_id").notNull(),
    environmentId: text("environment_id").notNull(),
    // Lower-case ASCII (punycode), no trailing dot; the domain's name or a subdomain of it.
    hostname: text("hostname").notNull(),
    record: jsonb("record").$type<ReceivingDomainRecord>().notNull(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    nextCheckAt: timestamp("next_check_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "receiving_domain_domain_fk",
      columns: [t.domainId, t.organizationId],
      foreignColumns: [domain.id, domain.organizationId],
    }).onDelete("cascade"),
    foreignKey({
      name: "receiving_domain_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    unique("receiving_domain_domain_unique").on(t.domainId),
    unique("receiving_domain_hostname_unique").on(t.hostname),
    index("receiving_domain_environment_idx").on(t.environmentId),
    index("receiving_domain_next_check_at_idx")
      .on(t.nextCheckAt)
      .where(sql`${t.nextCheckAt} is not null`),
  ],
);

/**
 * An environment's address space under COSS's managed inbound domain:
 * `<anything>@<label>.<INBOUND_MANAGED_DOMAIN>`. Created on first read; the label never changes.
 */
export const environmentInboundAddress = pgTable(
  "environment_inbound_address",
  {
    environmentId: text("environment_id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    label: text("label").notNull().unique("environment_inbound_address_label_unique"),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "environment_inbound_address_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
  ],
);

export const receivedEmailStatus = pgEnum("received_email_status", ["received", "blocked"]);

/** One header line of a received email, in message order (names keep their case). */
export type ReceivedEmailHeader = { name: string; value: string };

/**
 * An email received for one environment. A message addressed to several environments (or
 * organizations) becomes one row each, holding only that environment's envelope recipients.
 * The raw message and attachment bytes live in the inbound content store (`raw_key`,
 * `content_key`); `blocked` rows (a virus verdict) keep no content.
 */
export const receivedEmail = pgTable(
  "received_email",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.receivedEmail)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull(),
    status: receivedEmailStatus("status").notNull(),
    blockedReason: text("blocked_reason"),
    provider: text("provider").notNull(),
    providerMessageId: text("provider_message_id").notNull(),
    // Envelope: MAIL FROM (empty for bounces) and this environment's RCPT TO addresses.
    mailFrom: text("mail_from").notNull(),
    recipients: text("recipients").array().notNull(),
    // Parsed headers (addresses as `Name <address>` or bare addresses).
    from: text("from"),
    to: text("to").array().notNull().default(sql`'{}'::text[]`),
    cc: text("cc").array().notNull().default(sql`'{}'::text[]`),
    replyTo: text("reply_to").array().notNull().default(sql`'{}'::text[]`),
    subject: text("subject"),
    messageId: text("message_id"),
    inReplyTo: text("in_reply_to"),
    references: text("references").array().notNull().default(sql`'{}'::text[]`),
    // The Date header, when it parses.
    sentAt: timestamp("sent_at", { withTimezone: true }),
    headers: jsonb("headers").$type<ReceivedEmailHeader[]>().notNull().default([]),
    text: text("text"),
    html: text("html"),
    // True when `text`, `html` or `headers` were cut to their stored limits (the raw message is whole).
    truncated: boolean("truncated").notNull().default(false),
    // Provider verdicts: pass | fail | gray | processing_failed (null when not checked).
    spamVerdict: text("spam_verdict"),
    virusVerdict: text("virus_verdict"),
    spfVerdict: text("spf_verdict"),
    dkimVerdict: text("dkim_verdict"),
    dmarcVerdict: text("dmarc_verdict"),
    // The sender domain's DMARC policy when DMARC failed: none | quarantine | reject.
    dmarcPolicy: text("dmarc_policy"),
    // Size of the raw message in bytes.
    size: integer("size").notNull(),
    rawKey: text("raw_key"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "received_email_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    // A provider notification delivered twice (SQS is at-least-once) records the email once.
    unique("received_email_provider_message_unique").on(
      t.environmentId,
      t.provider,
      t.providerMessageId,
    ),
    // Lists page newest first by id (UUIDv7 ids are time-ordered).
    index("received_email_environment_id_idx").on(t.environmentId, t.id.desc()),
    // The worker's retention purge and organization deletion.
    index("received_email_created_at_idx").on(t.createdAt),
    index("received_email_organization_idx").on(t.organizationId),
    unique("received_email_id_organization_unique").on(t.id, t.organizationId),
  ],
);

/** Attachment metadata of a received email; the bytes are in the content store (`content_key`). */
export const receivedEmailAttachment = pgTable(
  "received_email_attachment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.receivedEmailAttachment)),
    organizationId: text("organization_id").notNull(),
    receivedEmailId: text("received_email_id").notNull(),
    position: integer("position").notNull(),
    filename: text("filename"),
    contentType: text("content_type").notNull(),
    contentId: text("content_id"),
    // `attachment` or `inline`.
    disposition: text("disposition").notNull(),
    size: integer("size").notNull(),
    sha256: text("sha256").notNull(),
    contentKey: text("content_key").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "received_email_attachment_email_fk",
      columns: [t.receivedEmailId, t.organizationId],
      foreignColumns: [receivedEmail.id, receivedEmail.organizationId],
    }).onDelete("cascade"),
    unique("received_email_attachment_position_unique").on(t.receivedEmailId, t.position),
  ],
);

/**
 * The fake provider's inbound content store (development and tests: S3 in production). No FK:
 * content is written before its row, and cleaned up like S3 objects (explicit deletes, a
 * lifecycle-like retention step, organization deletion).
 */
export const inboundFakeObject = pgTable(
  "inbound_fake_object",
  {
    key: text("key").primaryKey(),
    organizationId: text("organization_id").notNull(),
    contentType: text("content_type").notNull(),
    content: bytea("content").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("inbound_fake_object_organization_idx").on(t.organizationId),
    index("inbound_fake_object_created_at_idx").on(t.createdAt),
  ],
);

/** Received messages dropped because an organization went over its daily inbound limit. */
export const inboundDropCounter = pgTable(
  "inbound_drop_counter",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // UTC day.
    day: text("day").notNull(),
    count: integer("count").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ name: "inbound_drop_counter_pk", columns: [t.organizationId, t.day] })],
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
    // The API version (`Coss-Version` date) payloads are rendered in at delivery.
    apiVersion: text("api_version").notNull(),
    // Event types to deliver; empty means every type.
    eventTypes: text("event_types").array().notNull().default(sql`'{}'::text[]`),
    // The `whsec_…` signing secret, encrypted with WEBHOOK_SECRETS_KEY (it must be reversible).
    secretCiphertext: text("secret_ciphertext").notNull(),
    // The secret before the last roll, which also signs deliveries until it expires. Both or neither.
    previousSecretCiphertext: text("previous_secret_ciphertext"),
    previousSecretExpiresAt: timestamp("previous_secret_expires_at", { withTimezone: true }),
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
    check(
      "webhook_endpoint_previous_secret_check",
      sql`(${t.previousSecretCiphertext} is null) = (${t.previousSecretExpiresAt} is null)`,
    ),
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
    // Deleting an environment (or an organization, `organization_deletion`) finds its messages.
    index("webhook_message_environment_idx").on(t.environmentId),
    // The worker's retention purge.
    index("webhook_message_created_at_idx").on(t.createdAt),
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

export const reputationStatus = pgEnum("reputation_status", ["good", "warning", "suspended"]);

/**
 * An organization's sending standing, kept by the reputation guard (`@coss/reputation`). Created
 * lazily: no row means `good`. Only platform admins move an organization out of `suspended`.
 */
export const reputationStanding = pgTable(
  "reputation_standing",
  {
    organizationId: text("organization_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    status: reputationStatus("status").notNull().default("good"),
    // The trigger behind the current status (e.g. `complaint_rate`, `manual`); null when good.
    reason: text("reason"),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
    // Rate windows never reach back past the last reinstatement.
    reinstatedAt: timestamp("reinstated_at", { withTimezone: true }),
    // Per-organization policy overrides set by platform admins (validated by `@coss/reputation`).
    policyOverrides: jsonb("policy_overrides").$type<Record<string, unknown>>(),
    // The latest evaluation's check results.
    metrics: jsonb("metrics").$type<Record<string, unknown>>(),
    lastEvaluatedAt: timestamp("last_evaluated_at", { withTimezone: true }),
    // Fences evaluations against intervening standing/policy changes.
    revision: integer("revision").notNull().default(0),
    // New evidence changes the due marker without releasing the active worker.
    evaluationLeaseUntil: timestamp("evaluation_lease_until", { withTimezone: true }),
    // When the worker should evaluate next; null when nothing is pending.
    nextEvaluationAt: timestamp("next_evaluation_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("reputation_standing_next_evaluation_idx")
      .on(t.nextEvaluationAt)
      .where(sql`${t.nextEvaluationAt} IS NOT NULL`),
  ],
);

export const reputationEventType = pgEnum("reputation_event_type", [
  "warning_raised",
  "warning_cleared",
  "suspended",
  "reinstated",
  "policy_updated",
]);

export const reputationActor = pgEnum("reputation_actor", ["system", "admin"]);

/**
 * Append-only history of an organization's standing changes (audit trail). The worker deletes
 * entries past the retention in `@coss/retention`, except each organization's latest transition.
 */
export const reputationEvent = pgTable(
  "reputation_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.reputationEvent)),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    type: reputationEventType("type").notNull(),
    trigger: text("trigger").notNull(),
    actor: reputationActor("actor").notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    note: text("note"),
    metrics: jsonb("metrics").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index("reputation_event_organization_created_at_idx").on(t.organizationId, t.createdAt.desc()),
    unique("reputation_event_id_organization_unique").on(t.id, t.organizationId),
  ],
);

export const reputationNotificationStatus = pgEnum("reputation_notification_status", [
  "pending",
  "sent",
  "skipped",
  "failed",
]);

/**
 * Outbox of the emails that tell an organization's owners and admins about a warning or a
 * suspension. Written in the transition's transaction; the worker sends it (`@coss/reputation`).
 */
export const reputationNotification = pgTable(
  "reputation_notification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.reputationNotification)),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    reputationEventId: text("reputation_event_id").notNull(),
    // The transition announced: `warning_raised` or `suspended`.
    type: reputationEventType("type").notNull(),
    status: reputationNotificationStatus("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    // When the worker should (re)try; also the claim's lease. Null once settled.
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    // The addresses it was sent to (owners and admins with a verified email, at send time).
    recipients: text("recipients").array().notNull().default(sql`'{}'::text[]`),
    // Why it was skipped, or the last failure.
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "reputation_notification_event_fk",
      columns: [t.reputationEventId, t.organizationId],
      foreignColumns: [reputationEvent.id, reputationEvent.organizationId],
    }).onDelete("cascade"),
    uniqueIndex("reputation_notification_event_idx").on(t.reputationEventId),
    index("reputation_notification_next_attempt_idx")
      .on(t.nextAttemptAt)
      .where(sql`${t.nextAttemptAt} IS NOT NULL`),
  ],
);

/**
 * Hourly rollups of an organization's live email reputation counts (`@coss/email`), by the hour
 * the emails were created. Computed lazily by the reputation checks for closed hours; delivery
 * events that change an hour's counts bump `revision`, so a row is current only while
 * `computed_revision = revision`. Mailbox-simulator recipients are counted separately.
 */
export const emailReputationRollup = pgTable(
  "email_reputation_rollup",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    bucketStart: timestamp("bucket_start", { withTimezone: true }).notNull(),
    revision: integer("revision").notNull().default(0),
    // Null until first computed.
    computedRevision: integer("computed_revision"),
    recipients: integer("recipients").notNull().default(0),
    bounces: integer("bounces").notNull().default(0),
    complaints: integer("complaints").notNull().default(0),
    simulatorRecipients: integer("simulator_recipients").notNull().default(0),
    simulatorBounces: integer("simulator_bounces").notNull().default(0),
    simulatorComplaints: integer("simulator_complaints").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.bucketStart] })],
);
export const contentScreeningVerdict = pgEnum("content_screening_verdict", [
  "clean",
  "flagged",
  "blocked",
  "error",
]);

/**
 * One AI content screening of an outgoing message (`@coss/screening`). Product-agnostic: the
 * message is named by `product` + `subject_id` (no FK), and its content is never copied here.
 */
export const contentScreening = pgTable(
  "content_screening",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.contentScreening)),
    organizationId: text("organization_id").notNull(),
    environmentId: text("environment_id").notNull(),
    // e.g. `email`; `subject_id` is that product's message id.
    product: text("product").notNull(),
    subjectId: text("subject_id").notNull(),
    // The message's position among the organization's live messages of this product.
    sequence: integer("sequence").notNull(),
    classifier: text("classifier").notNull(),
    model: text("model"),
    verdict: contentScreeningVerdict("verdict").notNull(),
    // Whether a `blocked` verdict actually stopped the message (the policy's `enforce`).
    enforced: boolean("enforced").notNull().default(false),
    // Probability per category, e.g. `{ "spam": 0.02, "phishing": 0.97 }`.
    scores: jsonb("scores").$type<Record<string, number>>().notNull().default({}),
    topCategory: text("top_category"),
    topScore: real("top_score"),
    inputTokens: integer("input_tokens"),
    latencyMs: integer("latency_ms").notNull(),
    errorMessage: text("error_message"),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "content_screening_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    index("content_screening_organization_created_at_idx").on(t.organizationId, t.createdAt.desc()),
    // The worker's retention purge.
    index("content_screening_created_at_idx").on(t.createdAt),
  ],
);

/** How many live messages of a product an organization has dispatched (screening samples by it). */
export const contentScreeningCounter = pgTable(
  "content_screening_counter",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    product: text("product").notNull(),
    seen: integer("seen").notNull().default(0),
    // A sampled screening failed, so the next message is screened instead.
    owed: boolean("owed").notNull().default(false),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.product] })],
);

/**
 * A platform admin's suspension of an organization; the row's presence is the suspension.
 * While it exists the organization's API keys are refused, its webhook deliveries are held and
 * its dashboard is read-only. Lifting it deletes the row (history lives in `admin_audit_event`).
 */
export const organizationSuspension = pgTable("organization_suspension", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  // Internal note for platform admins; never shown to the organization.
  reason: text("reason").notNull(),
  suspendedByUserId: text("suspended_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: createdAt(),
});

/**
 * The API version an organization's requests use when they send no `Coss-Version` header. Created lazily on the
 * organization's first API use (pinned to the latest version then), changed only by an upgrade in the dashboard.
 */
export const organizationApiVersion = pgTable("organization_api_version", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  apiVersion: text("api_version").notNull(),
  updatedByUserId: text("updated_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * Append-only log of platform admin actions (bans, role changes, impersonation, suspensions…),
 * kept for the retention in `@coss/retention` (the worker deletes older entries).
 * Platform-level, so `organization_id` is optional, and history: no FKs to the targets, and the
 * actor's email is copied so entries stay readable after the rows they name are gone.
 */
export const adminAuditEvent = pgTable(
  "admin_audit_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.adminAuditEvent)),
    sequence: bigint("sequence", { mode: "number" }).generatedAlwaysAsIdentity(),
    actorUserId: text("actor_user_id"),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    organizationId: text("organization_id"),
    reason: text("reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("admin_audit_event_target_idx").on(
      t.targetType,
      t.targetId,
      t.createdAt.desc(),
      t.sequence.desc(),
    ),
    index("admin_audit_event_organization_idx")
      .on(t.organizationId, t.createdAt.desc(), t.sequence.desc())
      .where(sql`${t.organizationId} is not null`),
    // The worker's retention purge.
    index("admin_audit_event_created_at_idx").on(t.createdAt),
  ],
);

/**
 * An organization's rule for one rate limit bucket (`BUCKETS` in `@coss/ratelimit`), replacing the
 * default. Set by platform admins (the admin console, or `bun run ratelimit:set`).
 */
export const rateLimitOverride = pgTable(
  "rate_limit_override",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.rateLimitOverride)),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    bucket: text("bucket").notNull(),
    limit: integer("limit").notNull(),
    periodMs: integer("period_ms").notNull(),
    // Defaults to `limit`.
    burst: integer("burst"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("rate_limit_override_organization_bucket_unique").on(t.organizationId, t.bucket)],
);

/**
 * Maps a directory (SCIM) group to an organization role: members of the group get `role` (admin wins over
 * member). `group_name` is the group's displayName, trimmed and lower-cased. Read by the SCIM role projection
 * (`@coss/auth` `scim.ts`); written only by `setScimGroupRoles` (@coss/tenancy).
 */
export const scimGroupRole = pgTable(
  "scim_group_role",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.scimGroupRole)),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    groupName: text("group_name").notNull(),
    // "admin" | "member" (never "owner": the directory doesn't manage owners).
    role: text("role").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("scim_group_role_organization_group_unique").on(t.organizationId, t.groupName)],
);

export const logSource = pgEnum("log_source", ["api", "email", "webhook"]);
export type LogSource = (typeof logSource.enumValues)[number];

export const logLevel = pgEnum("log_level", ["info", "warning", "error"]);
export type LogLevel = (typeof logLevel.enumValues)[number];

/**
 * One line of an environment's log (`@coss/logs`): an API request, an email event or a webhook
 * delivery attempt. Append-only and partitioned by day on `occurred_at` (migration 0027; the worker
 * creates upcoming partitions and drops expired ones), hence the composite primary key.
 */
export const logEntry = pgTable(
  "log_entry",
  {
    id: text("id")
      .notNull()
      .$defaultFn(() => newId(ID_PREFIXES.logEntry)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    source: logSource("source").notNull(),
    level: logLevel("level").notNull(),
    // e.g. `api.request`, `email.delivered`, `webhook.attempt`.
    type: text("type").notNull(),
    message: text("message").notNull(),
    requestId: text("request_id"),
    // No FK: Better Auth hard-deletes keys.
    apiKeyId: text("api_key_id"),
    method: text("method"),
    path: text("path"),
    // The matched route pattern, e.g. `/v1/emails/:id`.
    route: text("route"),
    statusCode: integer("status_code"),
    durationMs: integer("duration_ms"),
    clientIp: text("client_ip"),
    userAgent: text("user_agent"),
    errorCode: text("error_code"),
    // The resource the line is about (`email_…`, `whep_…`, `dom_…`), no FK.
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    recipient: text("recipient"),
    // Redacted request/response bodies, event details.
    attributes: jsonb("attributes").$type<Record<string, unknown>>().notNull().default({}),
    // Lowercased text the free-text search matches (message, path, ids, recipient).
    searchText: text("search_text").notNull().default(""),
  },
  (t) => [
    primaryKey({ name: "log_entry_pkey", columns: [t.occurredAt, t.id] }),
    foreignKey({
      name: "log_entry_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    index("log_entry_environment_occurred_at_idx").on(
      t.environmentId,
      t.occurredAt.desc(),
      t.id.desc(),
    ),
    index("log_entry_environment_request_idx")
      .on(t.environmentId, t.requestId)
      .where(sql`${t.requestId} is not null`),
    index("log_entry_environment_resource_idx")
      .on(t.environmentId, t.resourceId)
      .where(sql`${t.resourceId} is not null`),
    index("log_entry_search_text_idx").using("gin", t.searchText.op("gin_trgm_ops")),
  ],
);

export const orgAuditActorType = pgEnum("org_audit_actor_type", ["user", "api_key", "system"]);
export type OrgAuditActorType = (typeof orgAuditActorType.enumValues)[number];

/**
 * An organization's audit log: who changed what (dashboard members, API keys, Better Auth flows,
 * COSS support). History: no FKs except the organization, and actor/target labels are copied so
 * entries stay readable after the rows they name are gone. Kept indefinitely.
 */
export const orgAuditEvent = pgTable(
  "org_audit_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.orgAuditEvent)),
    sequence: bigint("sequence", { mode: "number" }).generatedAlwaysAsIdentity(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    projectId: text("project_id"),
    environmentId: text("environment_id"),
    actorType: orgAuditActorType("actor_type").notNull(),
    actorId: text("actor_id"),
    actorLabel: text("actor_label").notNull(),
    // e.g. `api_key.created`, `domain.deleted`, `member.role_changed`.
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    targetLabel: text("target_label"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    clientIp: text("client_ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [
    index("org_audit_event_organization_idx").on(
      t.organizationId,
      t.createdAt.desc(),
      t.sequence.desc(),
    ),
    index("org_audit_event_organization_action_idx").on(
      t.organizationId,
      t.action,
      t.createdAt.desc(),
      t.sequence.desc(),
    ),
  ],
);

/** What a log drain forwards: the environment log's sources, plus the environment's audit events. */
export const logDrainSource = pgEnum("log_drain_source", ["api", "email", "webhook", "audit"]);
export type LogDrainSource = (typeof logDrainSource.enumValues)[number];

/**
 * An HTTPS endpoint an environment's log lines are streamed to, in signed NDJSON batches by the
 * worker (`@coss/webhooks` log drains). Queued lines are `log_drain_record`s.
 */
export const logDrain = pgTable(
  "log_drain",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.logDrain)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    // Sources to forward; empty means every source.
    sources: logDrainSource("sources").array().notNull().default(sql`'{}'::log_drain_source[]`),
    // The `whsec_…` signing secret, encrypted with WEBHOOK_SECRETS_KEY.
    secretCiphertext: text("secret_ciphertext").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    // Why it is disabled: `manual` or `failing` (a batch exhausted its retries). Null while enabled.
    disabledReason: text("disabled_reason"),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "log_drain_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    // Every log line looks up its environment's enabled drains.
    index("log_drain_environment_idx").on(t.environmentId).where(sql`${t.enabled}`),
    unique("log_drain_id_organization_unique").on(t.id, t.organizationId),
  ],
);

export const logDrainBatchStatus = pgEnum("log_drain_batch_status", [
  "pending",
  "succeeded",
  "failed",
]);

/** One NDJSON request of queued lines, retried with backoff until it succeeds or gives up. */
export const logDrainBatch = pgTable(
  "log_drain_batch",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.logDrainBatch)),
    organizationId: text("organization_id").notNull(),
    drainId: text("drain_id").notNull(),
    status: logDrainBatchStatus("status").notNull().default("pending"),
    recordCount: integer("record_count").notNull(),
    byteSize: integer("byte_size").notNull(),
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
      name: "log_drain_batch_drain_fk",
      columns: [t.drainId, t.organizationId],
      foreignColumns: [logDrain.id, logDrain.organizationId],
    }).onDelete("cascade"),
    // One open batch per drain: lines go out in order, and two workers never form two.
    uniqueIndex("log_drain_batch_pending_unique").on(t.drainId).where(sql`${t.status} = 'pending'`),
    index("log_drain_batch_due_idx").on(t.nextAttemptAt).where(sql`${t.status} = 'pending'`),
    index("log_drain_batch_drain_created_at_idx").on(t.drainId, t.createdAt.desc()),
    // The worker's retention purge.
    index("log_drain_batch_updated_at_idx").on(t.updatedAt).where(sql`${t.status} <> 'pending'`),
    unique("log_drain_batch_id_organization_unique").on(t.id, t.organizationId),
  ],
);

/**
 * A line queued for one drain (the outbox), written with the log line or audit event it copies.
 * `line` is the wire object as `GET /v1/logs` returns it (or the audit event's).
 */
export const logDrainRecord = pgTable(
  "log_drain_record",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.logDrainRecord)),
    organizationId: text("organization_id").notNull(),
    drainId: text("drain_id").notNull(),
    // Set when the record joins a batch; deleted with it.
    batchId: text("batch_id"),
    source: logDrainSource("source").notNull(),
    // The `log_…` or `oaudit_…` id.
    sourceId: text("source_id").notNull(),
    // `json`, not `jsonb`: keeps the object's key order.
    line: json("line").$type<Record<string, unknown>>().notNull(),
    // Bytes of the serialized line, newline included.
    byteSize: integer("byte_size").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "log_drain_record_drain_fk",
      columns: [t.drainId, t.organizationId],
      foreignColumns: [logDrain.id, logDrain.organizationId],
    }).onDelete("cascade"),
    foreignKey({
      name: "log_drain_record_batch_fk",
      columns: [t.batchId, t.organizationId],
      foreignColumns: [logDrainBatch.id, logDrainBatch.organizationId],
    }).onDelete("cascade"),
    unique("log_drain_record_drain_source_unique").on(t.drainId, t.sourceId),
    // Lines waiting for a batch, oldest first.
    index("log_drain_record_queued_idx").on(t.drainId, t.id).where(sql`${t.batchId} is null`),
    index("log_drain_record_batch_idx").on(t.batchId),
  ],
);

/** One HTTP attempt of a batch (the drain's delivery log). */
export const logDrainAttempt = pgTable(
  "log_drain_attempt",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.logDrainAttempt)),
    organizationId: text("organization_id").notNull(),
    batchId: text("batch_id").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull(),
    statusCode: integer("status_code"),
    durationMs: integer("duration_ms").notNull(),
    error: text("error"),
    // At most 1 KB of the response body, as text.
    responseExcerpt: text("response_excerpt"),
  },
  (t) => [
    foreignKey({
      name: "log_drain_attempt_batch_fk",
      columns: [t.batchId, t.organizationId],
      foreignColumns: [logDrainBatch.id, logDrainBatch.organizationId],
    }).onDelete("cascade"),
    index("log_drain_attempt_batch_idx").on(t.batchId, t.attemptedAt),
  ],
);

export const authEmailKind = pgEnum("auth_email_kind", [
  "verify_email",
  "reset_password",
  "invitation",
]);

export const authEmailStatus = pgEnum("auth_email_status", [
  "pending",
  "sent",
  "skipped",
  "failed",
]);

/**
 * Outbox of the account emails Better Auth asks for (sign-up verification, password resets,
 * invitations). Written by `@coss/auth`'s callbacks; the worker sends each one through COSS's own
 * email product (`@coss/auth/emails`). Not tenant data: an email belongs to an address, not an
 * organization.
 */
export const authEmail = pgTable(
  "auth_email",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.authEmail)),
    kind: authEmailKind("kind").notNull(),
    to: text("to").notNull(),
    // The account it is about (null for invitations, which may go to people without one). No FK:
    // Better Auth creates a user in a transaction the outbox insert is not part of; an email for
    // a user that doesn't exist (any more) is skipped.
    userId: text("user_id"),
    // The link to send. It carries a secret (a verification or reset token), so it is cleared
    // as soon as the email is settled.
    url: text("url"),
    // Kind-specific content (invitations: organization, inviter, role).
    data: jsonb("data").$type<Record<string, string>>().notNull().default({}),
    // The link stops working at this time; an email not sent by then is skipped.
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    status: authEmailStatus("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    // When the worker should (re)try; also the claim's lease. Null once settled.
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    // Why it was skipped, or the last failure.
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("auth_email_next_attempt_idx")
      .on(t.nextAttemptAt)
      .where(sql`${t.nextAttemptAt} IS NOT NULL`),
  ],
);

export const organizationDeletionStatus = pgEnum("organization_deletion_status", [
  "pending",
  "completed",
]);

/**
 * A request to delete an organization, and afterwards the record that it was deleted. While
 * `pending`, the organization has no members, invitations, API keys or SSO provider (removed when
 * the request is made) and the worker tears down its provider resources and data in batches, then
 * deletes the organization row. History: no FKs, and the names are copied, so the row outlives
 * the organization and its requester.
 */
export const organizationDeletion = pgTable(
  "organization_deletion",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.organizationDeletion)),
    organizationId: text("organization_id").notNull().unique("organization_deletion_org_unique"),
    organizationName: text("organization_name").notNull(),
    organizationSlug: text("organization_slug").notNull(),
    requestedByUserId: text("requested_by_user_id"),
    requestedByEmail: text("requested_by_email").notNull(),
    // A platform admin deleted it from the admin console (also in `admin_audit_event`).
    byPlatformAdmin: boolean("by_platform_admin").notNull().default(false),
    status: organizationDeletionStatus("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    // When the worker should (re)try; also the claim's lease. Null once completed.
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow(),
    lastError: text("last_error"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("organization_deletion_next_attempt_idx")
      .on(t.nextAttemptAt)
      .where(sql`${t.nextAttemptAt} IS NOT NULL`),
  ],
);
