/**
 * Sign (`@coss/sign`): e-signatures. An environment's uploaded PDFs, the signature requests made
 * from them, each request's signers and the fields they fill, and the request's audit trail.
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
  primaryKey,
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

/** A page's size in PDF points (1/72 inch), as its crop box shows it. */
export type SignPageSize = { width: number; height: number };

/** A text anchor found in a document (`{{signature:signer_1}}`), in points from the top left. */
export type SignAnchor = {
  text: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * An uploaded PDF. Its bytes live in the document store (`store_key`; S3, or
 * `sign_fake_object`); the row keeps what requests need without reading them.
 */
export const signDocument = pgTable(
  "sign_document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.signDocument)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull(),
    // No FK: Better Auth hard-deletes expired keys, and history must survive that.
    apiKeyId: text("api_key_id"),
    filename: text("filename").notNull(),
    storeKey: text("store_key").notNull(),
    // Hex SHA-256 of the uploaded bytes.
    sha256: text("sha256").notNull(),
    size: integer("size").notNull(),
    pages: jsonb("pages").$type<SignPageSize[]>().notNull(),
    anchors: jsonb("anchors").$type<SignAnchor[]>().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "sign_document_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    unique("sign_document_id_organization_unique").on(t.id, t.organizationId),
    index("sign_document_environment_created_at_idx").on(t.environmentId, t.createdAt.desc()),
    index("sign_document_created_at_idx").on(t.createdAt),
  ],
);

export const signRequestStatus = pgEnum("sign_request_status", [
  "draft",
  "sent",
  "completed",
  "declined",
  "canceled",
  "expired",
]);

export const signSigningOrder = pgEnum("sign_signing_order", ["parallel", "sequential"]);

/** A request for one or more signers to sign one or more documents. */
export const signRequest = pgTable(
  "sign_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.signRequest)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull(),
    // No FK, like `sign_document.api_key_id`.
    apiKeyId: text("api_key_id"),
    status: signRequestStatus("status").notNull().default("draft"),
    title: text("title").notNull(),
    message: text("message"),
    signingOrder: signSigningOrder("signing_order").notNull().default("parallel"),
    metadata: jsonb("metadata").$type<Record<string, string>>().notNull().default({}),
    idempotencyKey: text("idempotency_key"),
    requestHash: text("request_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    declinedAt: timestamp("declined_at", { withTimezone: true }),
    // The sealed, completed document (document store) and its hex SHA-256, once the worker made it.
    signedDocumentKey: text("signed_document_key"),
    signedDocumentSha256: text("signed_document_sha256"),
    sealedAt: timestamp("sealed_at", { withTimezone: true }),
    // The worker's lease while sealing, and its retries.
    sealLeaseUntil: timestamp("seal_lease_until", { withTimezone: true }),
    sealAttempts: integer("seal_attempts").notNull().default(0),
    sealNextAttemptAt: timestamp("seal_next_attempt_at", { withTimezone: true }),
    sealError: text("seal_error"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "sign_request_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
    // NULL keys are distinct, so requests without an Idempotency-Key never conflict.
    unique("sign_request_environment_idempotency_key_unique").on(t.environmentId, t.idempotencyKey),
    unique("sign_request_id_organization_unique").on(t.id, t.organizationId),
    index("sign_request_environment_created_at_idx").on(t.environmentId, t.createdAt.desc()),
    index("sign_request_expires_at_idx").on(t.expiresAt).where(sql`${t.status} = 'sent'`),
    index("sign_request_created_at_idx").on(t.createdAt),
    // Completed requests waiting for their sealed document.
    index("sign_request_unsealed_idx")
      .on(t.completedAt)
      .where(sql`${t.status} = 'completed' and ${t.sealedAt} is null`),
  ],
);

/** The documents of a request, in order. A document may be used by several requests. */
export const signRequestDocument = pgTable(
  "sign_request_document",
  {
    requestId: text("request_id").notNull(),
    documentId: text("document_id").notNull(),
    organizationId: text("organization_id").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.requestId, t.position] }),
    foreignKey({
      name: "sign_request_document_request_fk",
      columns: [t.requestId, t.organizationId],
      foreignColumns: [signRequest.id, signRequest.organizationId],
    }).onDelete("cascade"),
    // A document can't go while a request uses it.
    foreignKey({
      name: "sign_request_document_document_fk",
      columns: [t.documentId, t.organizationId],
      foreignColumns: [signDocument.id, signDocument.organizationId],
    }).onDelete("restrict"),
    unique("sign_request_document_unique").on(t.requestId, t.documentId),
    index("sign_request_document_document_idx").on(t.documentId),
  ],
);

export const signSignerStatus = pgEnum("sign_signer_status", [
  "pending",
  "notified",
  "viewed",
  "signed",
  "declined",
]);

// `embedded`: the customer's app shows the signing page; `email`: coss.com emails a link.
export const signDelivery = pgEnum("sign_delivery", ["embedded", "email"]);

// How the signer was identified: possession of the emailed link, or the customer's word for it.
export const signAuthentication = pgEnum("sign_authentication", [
  "email_link",
  "customer_asserted",
]);

export const signSigner = pgTable(
  "sign_signer",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.signSigner)),
    organizationId: text("organization_id").notNull(),
    requestId: text("request_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    // Signing order (1-based); signers with the same position sign in parallel.
    position: integer("position").notNull(),
    delivery: signDelivery("delivery").notNull(),
    authentication: signAuthentication("authentication").notNull(),
    status: signSignerStatus("status").notNull().default("pending"),
    // The customer's own id for the signer (embedded signing).
    clientRef: text("client_ref"),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    consentedAt: timestamp("consented_at", { withTimezone: true }),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    declinedAt: timestamp("declined_at", { withTimezone: true }),
    declineReason: text("decline_reason"),
    // The adopted signature and initials (PNG, in the document store) and their hex SHA-256.
    signatureKey: text("signature_key"),
    signatureSha256: text("signature_sha256"),
    initialsKey: text("initials_key"),
    initialsSha256: text("initials_sha256"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "sign_signer_request_fk",
      columns: [t.requestId, t.organizationId],
      foreignColumns: [signRequest.id, signRequest.organizationId],
    }).onDelete("cascade"),
    unique("sign_signer_id_organization_unique").on(t.id, t.organizationId),
    unique("sign_signer_request_email_unique").on(t.requestId, t.email),
    index("sign_signer_request_idx").on(t.requestId, t.position),
  ],
);

export const signFieldType = pgEnum("sign_field_type", [
  "signature",
  "initials",
  "date_signed",
  "name",
  "email",
  "text",
  "checkbox",
]);

/** A field one signer fills on one page of one of the request's documents. */
export const signField = pgTable(
  "sign_field",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.signField)),
    organizationId: text("organization_id").notNull(),
    requestId: text("request_id").notNull(),
    signerId: text("signer_id").notNull(),
    documentId: text("document_id").notNull(),
    type: signFieldType("type").notNull(),
    // 1-based; the box is in PDF points from the page's top left corner.
    page: integer("page").notNull(),
    x: doublePrecision("x").notNull(),
    y: doublePrecision("y").notNull(),
    width: doublePrecision("width").notNull(),
    height: doublePrecision("height").notNull(),
    required: boolean("required").notNull().default(true),
    label: text("label"),
    // The anchor it was placed by, if any.
    anchor: text("anchor"),
    // What the signer entered; immutable once the signer has signed.
    value: text("value"),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "sign_field_signer_fk",
      columns: [t.signerId, t.organizationId],
      foreignColumns: [signSigner.id, signSigner.organizationId],
    }).onDelete("cascade"),
    foreignKey({
      name: "sign_field_request_fk",
      columns: [t.requestId, t.organizationId],
      foreignColumns: [signRequest.id, signRequest.organizationId],
    }).onDelete("cascade"),
    index("sign_field_request_idx").on(t.requestId),
    index("sign_field_signer_idx").on(t.signerId),
  ],
);

export const signEventType = pgEnum("sign_event_type", [
  "created",
  "sent",
  "notified",
  "viewed",
  "consented",
  "signed",
  "declined",
  "reminded",
  "canceled",
  "expired",
  "completed",
  "sealed",
]);

/** Wire-format (snake_case) event details, stored as-is and returned by the API. */
export type SignEventDetails = {
  reason?: string;
  document_sha256?: Record<string, string>;
  disclosure_sha256?: string;
  field_ids?: string[];
  signature_sha256?: string;
  initials_sha256?: string;
  session_id?: string;
  signed_document_sha256?: string;
};

/**
 * A request's audit trail, append-only. Each event's `hash` covers its own content and the
 * previous event's hash, so a changed or removed event breaks the chain from there on.
 */
export const signEvent = pgTable(
  "sign_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.signEvent)),
    organizationId: text("organization_id").notNull(),
    requestId: text("request_id").notNull(),
    // 1-based, gapless per request.
    sequence: integer("sequence").notNull(),
    type: signEventType("type").notNull(),
    // No FK: the trail names signers by id and keeps their details in `actor`.
    signerId: text("signer_id"),
    // `api_key`, `signer`, `dashboard` or `system`.
    actor: text("actor").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    details: jsonb("details").$type<SignEventDetails>().notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    previousHash: text("previous_hash"),
    hash: text("hash").notNull(),
  },
  (t) => [
    foreignKey({
      name: "sign_event_request_fk",
      columns: [t.requestId, t.organizationId],
      foreignColumns: [signRequest.id, signRequest.organizationId],
    }).onDelete("cascade"),
    unique("sign_event_request_sequence_unique").on(t.requestId, t.sequence),
  ],
);

/**
 * A signing session: a short-lived link for one signer of one request, minted by the customer's
 * backend (embedded signing) or by coss.com (email links). Only the token's sha256 is stored.
 */
export const signSession = pgTable(
  "sign_session",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.signSession)),
    organizationId: text("organization_id").notNull(),
    environmentId: text("environment_id").notNull(),
    requestId: text("request_id").notNull(),
    signerId: text("signer_id").notNull(),
    tokenHash: text("token_hash").notNull().unique("sign_session_token_hash_unique"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // Who minted it (no FK: Better Auth hard-deletes keys); `null` for coss.com's own links.
    apiKeyId: text("api_key_id"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "sign_session_signer_fk",
      columns: [t.signerId, t.organizationId],
      foreignColumns: [signSigner.id, signSigner.organizationId],
    }).onDelete("cascade"),
    index("sign_session_expires_at_idx").on(t.expiresAt),
    index("sign_session_signer_idx").on(t.signerId),
  ],
);

/** How an environment's signing page looks, what signers consent to and who may embed it. */
export const signSettings = pgTable(
  "sign_settings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId(ID_PREFIXES.signSettings)),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    environmentId: text("environment_id").notNull().unique("sign_settings_environment_unique"),
    // Origins allowed to frame the signing page (`frame-ancestors`); empty: it can't be embedded.
    allowedOrigins: text("allowed_origins").array().notNull().default(sql`'{}'::text[]`),
    // Shown to signers as the requester ("Acme asks you to sign…").
    displayName: text("display_name"),
    // `#rrggbb`.
    accentColor: text("accent_color"),
    // `light`, `dark` or `system`.
    theme: text("theme").notNull().default("system"),
    // The consent to electronic records and signatures; `null`: coss.com's default text.
    disclosure: text("disclosure"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "sign_settings_environment_fk",
      columns: [t.environmentId, t.organizationId],
      foreignColumns: [environment.id, environment.organizationId],
    }).onDelete("cascade"),
  ],
);

/** Document bytes when no bucket is configured (development, tests): the fake document store. */
export const signFakeObject = pgTable(
  "sign_fake_object",
  {
    key: text("key").primaryKey(),
    organizationId: text("organization_id").notNull(),
    contentType: text("content_type").notNull(),
    content: bytea("content").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sign_fake_object_organization_idx").on(t.organizationId)],
);
