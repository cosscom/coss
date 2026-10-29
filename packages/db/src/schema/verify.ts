/**
 * Verify (`@coss/verify`): one-time codes as a service. An environment's verification requests
 * (one code sent to a phone number or an email address, checked by the customer's backend), the
 * messages each one sent, and the environment's settings.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
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

export const verifyChannel = pgEnum("verify_channel", ["sms", "email"]);
export type VerifyChannel = (typeof verifyChannel.enumValues)[number];

export const verifyStatus = pgEnum("verify_status", [
  "pending",
  "approved",
  "expired",
  "canceled",
  "failed",
  "blocked",
]);
export type VerifyStatus = (typeof verifyStatus.enumValues)[number];

/** How a send went out: the environment's own number, coss.com's shared numbers, or email. */
export const verifySendRoute = pgEnum("verify_send_route", [
  "own_number",
  "shared_number",
  "email",
  "coss_email",
]);
export type VerifySendRoute = (typeof verifySendRoute.enumValues)[number];

/** Why the fraud guard blocked a request (codes from `@coss/risk`'s `VERIFICATION_REASONS`). */
export type VerifyRiskReason = { code: string; value?: number };

export const verifyRequest = pgTable(
  "verify_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.verifyRequest)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull(),
    // No FK: Better Auth hard-deletes expired keys, and history must survive that.
    apiKeyId: text("api_key_id"),
    // The member whose personal key started it, captured at acceptance (their spend). No FK.
    apiKeyOwnerId: text("api_key_owner_id"),
    channel: verifyChannel("channel").notNull(),
    // E.164 number or lower-cased email address (purged with the row).
    to: text("to").notNull(),
    // ISO 3166 code of an SMS destination.
    toCountry: text("to_country"),
    status: verifyStatus("status").notNull().default("pending"),
    failureCode: text("failure_code"),
    riskReasons: jsonb("risk_reasons").$type<VerifyRiskReason[]>().notNull().default([]),
    // HMAC of the code (never the code itself); cleared once it can no longer be checked.
    codeHash: text("code_hash"),
    codeLength: integer("code_length").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull(),
    sends: integer("sends").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    // Billing: metered once (`verify.verifications`) when approved, live environments only.
    usageRecordedAt: timestamp("usage_recorded_at", { withTimezone: true }),
    tags: jsonb("tags").$type<{ name: string; value: string }[]>().notNull().default([]),
    idempotencyKey: text("idempotency_key"),
    requestHash: text("request_hash"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "verify_request_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    // NULL keys are distinct, so requests without an Idempotency-Key never conflict.
    unique("verify_request_environment_idempotency_key_unique").on(
      t.environmentId,
      t.idempotencyKey,
    ),
    unique("verify_request_id_organization_unique").on(t.id, t.organizationId),
    index("verify_request_environment_created_at_idx").on(t.environmentId, t.createdAt.desc()),
    // A start or a check by `to` finds the destination's pending request.
    index("verify_request_pending_to_idx")
      .on(t.environmentId, t.to, t.channel)
      .where(sql`${t.status} = 'pending'`),
    // The worker's retention purge (oldest first, across organizations).
    index("verify_request_created_at_idx").on(t.createdAt),
  ],
);

export const verifySend = pgTable(
  "verify_send",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.verifySend)),
    organizationId: text("organization_id").notNull(),
    environmentId: text("environment_id").notNull(),
    requestId: text("request_id").notNull(),
    // 1 for the first code, then each resend: claimed with the code it carries, before sending.
    sequence: integer("sequence").notNull(),
    channel: verifyChannel("channel").notNull(),
    route: verifySendRoute("route").notNull(),
    // The message, in the environment it was sent from (coss.com's own for shared numbers and
    // coss.com's sender). No FK: messages are purged on their own schedule.
    smsId: text("sms_id"),
    emailId: text("email_id"),
    // The environment an SMS is sent in (the customer's, or coss.com's for shared numbers): with
    // the channel's idempotency key `<request id>:send:<sequence>`, it finds a message whose id
    // wasn't saved (a crash right after sending).
    messageEnvironmentId: text("message_environment_id"),
    // The key (and its owner) this send was asked for with: its shared-number SMS is their spend.
    // No FK (keys are hard-deleted).
    apiKeyId: text("api_key_id"),
    apiKeyOwnerId: text("api_key_owner_id"),
    // Shared numbers: billed to the request's organization (`verify.sms`, by country) once the
    // SMS reached a carrier.
    country: text("country"),
    usageRecordedAt: timestamp("usage_recorded_at", { withTimezone: true }),
    // A resend's own Idempotency-Key (the first send's is the request's): its retries replay.
    idempotencyKey: text("idempotency_key"),
    requestHash: text("request_hash"),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "verify_send_request_fk",
      columns: [t.requestId, t.organizationId],
      foreignColumns: [verifyRequest.id, verifyRequest.organizationId],
    }).onDelete("cascade"),
    unique("verify_send_request_sequence_unique").on(t.requestId, t.sequence),
    // NULL keys are distinct, so sends without one never conflict.
    unique("verify_send_environment_idempotency_key_unique").on(t.environmentId, t.idempotencyKey),
    // The worker's metering of shared-number sends.
    index("verify_send_unmetered_idx")
      .on(t.createdAt)
      .where(sql`${t.route} = 'shared_number' and ${t.usageRecordedAt} is null`),
  ],
);

/**
 * A check made with an Idempotency-Key and its answer: a retry of it (even after other checks)
 * gets the same answer without spending an attempt.
 */
export const verifyCheck = pgTable(
  "verify_check",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.verifyCheck)),
    organizationId: text("organization_id").notNull(),
    requestId: text("request_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    valid: boolean("valid").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "verify_check_request_fk",
      columns: [t.requestId, t.organizationId],
      foreignColumns: [verifyRequest.id, verifyRequest.organizationId],
    }).onDelete("cascade"),
    unique("verify_check_request_idempotency_key_unique").on(t.requestId, t.idempotencyKey),
  ],
);

export const verifySettings = pgTable(
  "verify_settings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.verifySettings)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull().unique("verify_settings_environment_unique"),
    // Named in every message ("Your Acme verification code is …"); `null`: the project's name.
    appName: text("app_name"),
    codeLength: integer("code_length").notNull().default(6),
    ttlSeconds: integer("ttl_seconds").notNull().default(600),
    maxAttempts: integer("max_attempts").notNull().default(5),
    // One of the organization's own approved numbers; `null`: coss.com's shared numbers.
    smsFrom: text("sms_from"),
    // An address on a verified domain; `null`: coss.com's sender ("<app name> via coss.com").
    emailFrom: text("email_from"),
    // ISO 3166 codes SMS codes may go to.
    allowedCountries: text("allowed_countries").array().notNull().default(sql`'{US,CA}'::text[]`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "verify_settings_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
  ],
);
