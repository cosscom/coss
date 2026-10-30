/**
 * Forms (`@coss/forms`): hosted form endpoints. An environment's forms, the submissions posted to
 * them (screened by Risk), their uploaded files, and the deliveries a submission still owes
 * (notification emails, contacts, the submitter's verification email).
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { ID_PREFIXES, newId } from "../id.ts";
import { environment } from "./domain.ts";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** Postgres `bytea` (drizzle 0.x has no builder for it); node-postgres returns a `Buffer`. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/** A field a form defines (`@coss/forms/schemas` `FormField`, stored as given). */
export type FormFieldDefinition = {
  name: string;
  type:
    | "text"
    | "email"
    | "textarea"
    | "number"
    | "tel"
    | "url"
    | "date"
    | "select"
    | "radio"
    | "checkbox"
    | "hidden"
    | "file";
  label: string | null;
  required: boolean;
  placeholder: string | null;
  options: string[];
  maxLength: number | null;
};

/** Where accepted submissions become contacts (`upsertContact` in the worker). */
export type FormContactsConfig = {
  enabled: boolean;
  audienceIds: string[];
  /** Topic keys the contact is opted into. */
  topics: string[];
  /** `null`: the environment's marketing settings decide (`double_opt_in_default`). */
  doubleOptIn: boolean | null;
  firstNameField: string | null;
  lastNameField: string | null;
  /** Contact property key → form field name. */
  properties: Record<string, string>;
};

export type FormFilesConfig = {
  enabled: boolean;
  maxFiles: number;
  maxFileBytes: number;
  /** MIME types or `type/*` wildcards; empty: the default list (`DEFAULT_FORM_FILE_TYPES`). */
  allowedTypes: string[];
};

/** The page coss.com hosts at `/f/<id>` (rendered from `fields`). */
export type FormHostedConfig = {
  enabled: boolean;
  title: string | null;
  description: string | null;
  submitLabel: string | null;
  successMessage: string | null;
};

export const formCaptcha = pgEnum("form_captcha", ["off", "required"]);
export const formOnReview = pgEnum("form_on_review", ["deliver", "hold"]);

export const form = pgTable(
  "form",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.form)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull(),
    // No FK: Better Auth hard-deletes expired keys, and history must survive that.
    apiKeyId: text("api_key_id"),
    name: text("name").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    // `null`: any field is accepted (within the caps); otherwise submissions are checked by them.
    fields: jsonb("fields").$type<FormFieldDefinition[]>(),
    // With `fields`: refuse fields the form doesn't define.
    strictFields: boolean("strict_fields").notNull().default(false),
    // Origins that may post to the form; empty: any.
    allowedOrigins: text("allowed_origins").array().notNull().default(sql`'{}'::text[]`),
    // Where an HTML post is redirected (303) after it is accepted; `null`: the hosted thank-you page.
    redirectUrl: text("redirect_url"),
    honeypotField: text("honeypot_field").notNull().default("_gotcha"),
    captcha: formCaptcha("captcha").notNull().default("off"),
    // The captcha's site key, for hosted pages (the secret is the environment's Risk captcha).
    captchaSiteKey: text("captcha_site_key"),
    onReview: formOnReview("on_review").notNull().default("hold"),
    // A submission whose text scores this high in a content category (spam, phishing, malware,
    // fraud) is spam, whatever the environment's risk settings say; `null`: off.
    contentThreshold: doublePrecision("content_threshold").default(0.9),
    emailField: text("email_field").notNull().default("email"),
    // Hold every submission until the submitter clicks the link emailed to `email_field`.
    verifySubmitter: boolean("verify_submitter").notNull().default(false),
    notifyRecipients: text("notify_recipients").array().notNull().default(sql`'{}'::text[]`),
    // Notification emails come from this address (a verified domain in live environments);
    // `null`: coss.com's sender ("<form name> via coss.com").
    notificationFrom: text("notification_from"),
    // The submitter's verification email comes from this address (required with
    // `verify_submitter` in live environments: never coss.com's).
    confirmationFrom: text("confirmation_from"),
    contacts: jsonb("contacts").$type<FormContactsConfig>(),
    files: jsonb("files").$type<FormFilesConfig>(),
    hosted: jsonb("hosted").$type<FormHostedConfig>(),
    // When the hosted page was last published (its text screened, in live environments).
    hostedPublishedAt: timestamp("hosted_published_at", { withTimezone: true }),
    // A platform admin disabled the form (phishing); only an admin lifts it.
    disabledByAdminAt: timestamp("disabled_by_admin_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "form_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    unique("form_id_organization_unique").on(t.id, t.organizationId),
    index("form_environment_created_at_idx").on(t.environmentId, t.createdAt.desc()),
  ],
);

export const formSubmissionStatus = pgEnum("form_submission_status", [
  "pending_confirmation",
  "accepted",
  "held",
  "spam",
]);

export const formSpamReason = pgEnum("form_spam_reason", [
  "honeypot",
  "risk_block",
  "risk_review",
  "content",
]);

export const formSubmission = pgTable(
  "form_submission",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.formSubmission)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull(),
    formId: text("form_id").notNull(),
    status: formSubmissionStatus("status").notNull(),
    // Field name → value (several values of one name: an array).
    data: jsonb("data").$type<Record<string, string | string[]>>().notNull(),
    submitterEmail: text("submitter_email"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    origin: text("origin"),
    referrer: text("referrer"),
    // The Risk assessment (no FK: risk purges assessments on its own schedule).
    riskAssessmentId: text("risk_assessment_id"),
    riskDecision: text("risk_decision"),
    riskScore: doublePrecision("risk_score"),
    spamReason: formSpamReason("spam_reason"),
    // sha256 of the submitter's verification token (`verify_submitter`).
    confirmationTokenHash: text("confirmation_token_hash").unique(
      "form_submission_confirmation_token_unique",
    ),
    confirmationExpiresAt: timestamp("confirmation_expires_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    // Released from held/spam by a person: `user:<id>` or `api_key:<id>`.
    releasedAt: timestamp("released_at", { withTimezone: true }),
    releasedBy: text("released_by"),
    // Set once, when the submission was metered (compare-and-set).
    usageRecordedAt: timestamp("usage_recorded_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "form_submission_form_fk",
      columns: [t.formId, t.organizationId],
      foreignColumns: [form.id, form.organizationId],
    }).onDelete("cascade"),
    unique("form_submission_id_organization_unique").on(t.id, t.organizationId),
    index("form_submission_form_created_at_idx").on(t.formId, t.status, t.createdAt.desc()),
    index("form_submission_created_at_idx").on(t.createdAt),
    // Organization teardown deletes an environment's submissions in batches.
    index("form_submission_environment_idx").on(t.environmentId, t.organizationId),
  ],
);

/** A file uploaded with a submission; its bytes live in the file store (`store_key`). */
export const formSubmissionFile = pgTable(
  "form_submission_file",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.formSubmissionFile)),
    organizationId: text("organization_id").notNull(),
    submissionId: text("submission_id").notNull(),
    field: text("field").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    storeKey: text("store_key").notNull(),
    // Hex SHA-256 of the bytes.
    sha256: text("sha256").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "form_submission_file_submission_fk",
      columns: [t.submissionId, t.organizationId],
      foreignColumns: [formSubmission.id, formSubmission.organizationId],
    }).onDelete("cascade"),
    index("form_submission_file_submission_idx").on(t.submissionId),
  ],
);

export const formDeliveryKind = pgEnum("form_delivery_kind", [
  "notification",
  "contact",
  "verification",
]);
export const formDeliveryState = pgEnum("form_delivery_state", [
  "pending",
  "delivered",
  "failed",
  "skipped",
]);

/** Work a submission still owes, done by the worker's `forms` loop (leased, retried). */
export const formDelivery = pgTable(
  "form_delivery",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.formDelivery)),
    organizationId: text("organization_id").notNull(),
    environmentId: text("environment_id").notNull(),
    submissionId: text("submission_id").notNull(),
    kind: formDeliveryKind("kind").notNull(),
    state: formDeliveryState("state").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    lastError: text("last_error"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "form_delivery_submission_fk",
      columns: [t.submissionId, t.organizationId],
      foreignColumns: [formSubmission.id, formSubmission.organizationId],
    }).onDelete("cascade"),
    unique("form_delivery_submission_kind_unique").on(t.submissionId, t.kind),
    index("form_delivery_due_idx").on(t.nextAttemptAt).where(sql`${t.state} = 'pending'`),
  ],
);

/** File bytes when no bucket is configured (development, tests): the fake file store. */
export const formFakeObject = pgTable(
  "form_fake_object",
  {
    key: text("key").primaryKey(),
    organizationId: text("organization_id").notNull(),
    contentType: text("content_type").notNull(),
    content: bytea("content").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("form_fake_object_organization_idx").on(t.organizationId)],
);

/**
 * File store objects to delete, recorded in the transaction that drops their last reference (a
 * deleted or purged submission): the worker's `forms` loop deletes them, retrying with backoff.
 */
export const formStoreCleanup = pgTable(
  "form_store_cleanup",
  {
    key: text("key").primaryKey(),
    organizationId: text("organization_id").notNull(),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    index("form_store_cleanup_next_attempt_at_idx").on(t.nextAttemptAt),
    index("form_store_cleanup_organization_idx").on(t.organizationId),
  ],
);
