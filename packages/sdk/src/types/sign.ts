/**
 * Sign wire types. Hand-written to mirror the API's snake_case JSON 1:1 (the API's contract test
 * asserts they stay assignable to and from its zod schemas).
 */

/**
 * `draft` until sent, `sent` while signers sign, then `completed` (everyone signed), `declined`
 * (a signer declined), `canceled` or `expired`.
 */
export type SignRequestStatus =
  | "draft"
  | "sent"
  | "completed"
  | "declined"
  | "canceled"
  | "expired";

export type SignSignerStatus = "pending" | "notified" | "viewed" | "signed" | "declined";

/** `email`: coss.com emails the signer a link. `embedded`: your app shows the signing page. */
export type SignDelivery = "embedded" | "email";

/**
 * How a signer is identified: `email_link` (they opened the link coss.com emailed) or
 * `customer_asserted` (your app vouched for them).
 */
export type SignAuthentication = "email_link" | "customer_asserted";

export type SignSigningOrder = "parallel" | "sequential";

/**
 * `signature` and `initials` take the signer's adopted signature, `date_signed` is filled with the
 * signing date, `name` and `email` with the signer's, `text` and `checkbox` by the signer.
 */
export type SignFieldType =
  | "signature"
  | "initials"
  | "date_signed"
  | "name"
  | "email"
  | "text"
  | "checkbox";

export type SignEventType =
  | "created"
  | "sent"
  | "notified"
  | "viewed"
  | "consented"
  | "signed"
  | "declined"
  | "reminded"
  | "canceled"
  | "expired"
  | "completed"
  | "sealed";

export type SignEventActor = "api_key" | "signer" | "dashboard" | "system";

export interface UploadSignDocumentParams {
  /** Ends in `.pdf`. */
  filename: string;
  /** The PDF's bytes, base64-encoded (at most 25 MB decoded). */
  content: string;
}

/** A page's size, in PDF points (1/72 inch). */
export interface SignPageSize {
  width: number;
  height: number;
}

/** A text anchor found in a document (`{{signature:signer_1}}`), in points from the page's top left. */
export interface SignAnchor {
  text: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SignDocument {
  object: "sign_document";
  id: string;
  filename: string;
  size: number;
  /** Hex SHA-256 of the uploaded bytes. */
  sha256: string;
  page_count: number;
  pages: SignPageSize[];
  anchors: SignAnchor[];
  sandbox: boolean;
  created_at: string;
}

export interface DeletedSignDocument {
  object: "sign_document";
  id: string;
  deleted: true;
}

export interface ListSignDocumentsParams {
  /** 1-100, default 20. */
  limit?: number;
  /** The `id` of the last document of the previous page. */
  after?: string;
}

interface SignFieldInputBase {
  type: SignFieldType;
  /** Default `true`. */
  required?: boolean;
  /** Shown to the signer. */
  label?: string;
}

/** A field at a position: PDF points from the page's top left. */
export interface PlacedSignFieldInput extends SignFieldInputBase {
  /** Index of the document in `documents` (default 0). */
  document?: number;
  /** 1-based. */
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A field over every occurrence of a text anchor, e.g. `{{signature:signer_1}}`. */
export interface AnchoredSignFieldInput extends SignFieldInputBase {
  anchor: string;
  /** Default: the anchor text's size. */
  width?: number;
  height?: number;
  /** Points to move it right and down. */
  offset_x?: number;
  offset_y?: number;
}

export type SignFieldInput = PlacedSignFieldInput | AnchoredSignFieldInput;

export interface SignSignerInput {
  name: string;
  email: string;
  /** Default `email`. */
  delivery?: SignDelivery;
  /** With `signing_order: "sequential"`, signers sign in increasing `order`. */
  order?: number;
  /** Your own id for the signer, recorded in the audit trail. */
  client_ref?: string;
  /** Every signer needs at least one `signature` field. */
  fields: SignFieldInput[];
}

/** An uploaded document by id, or a PDF inline (base64). */
export type SignDocumentInput = { document_id: string } | UploadSignDocumentParams;

export interface CreateSignRequestParams {
  title: string;
  message?: string;
  documents: SignDocumentInput[];
  signers: SignSignerInput[];
  /** Default `parallel`. */
  signing_order?: SignSigningOrder;
  /** At most 365 days ahead (ISO 8601). */
  expires_at?: string;
  metadata?: Record<string, string>;
  /**
   * Email signers who haven't signed get a reminder every this many days (1-30, up to 3).
   * Default: your settings' `reminder_interval_days`; `null`: none.
   */
  reminder_interval_days?: number | null;
  /** Default `true`; `false` keeps a `draft`. */
  send?: boolean;
}

export interface SignRequestDocument {
  id: string;
  filename: string;
  sha256: string;
  page_count: number;
}

export interface SignSigner {
  object: "sign_signer";
  id: string;
  name: string;
  email: string;
  order: number;
  delivery: SignDelivery;
  authentication: SignAuthentication;
  status: SignSignerStatus;
  client_ref: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
}

export interface SignField {
  object: "sign_field";
  id: string;
  signer_id: string;
  document_id: string;
  type: SignFieldType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  label: string | null;
  anchor: string | null;
}

export interface SignRequest {
  object: "sign_request";
  id: string;
  status: SignRequestStatus;
  title: string;
  message: string | null;
  signing_order: SignSigningOrder;
  documents: SignRequestDocument[];
  signers: SignSigner[];
  fields: SignField[];
  metadata: Record<string, string>;
  sandbox: boolean;
  /** Days between automatic reminders to email signers; `null`: none. */
  reminder_interval_days: number | null;
  expires_at: string | null;
  expired_at: string | null;
  sent_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  declined_at: string | null;
  /**
   * The completed document, sealed by coss.com; `null` until it is ready (announced by the
   * `sign_request.completed` webhook). Download it with `coss.sign.requests.signedDocument(id)`.
   */
  signed_document: { sha256: string; sealed_at: string } | null;
  created_at: string;
}

export interface DeletedSignRequest {
  object: "sign_request";
  id: string;
  deleted: true;
}

export interface ListSignRequestsParams {
  /** One status or several (sent comma-separated). */
  status?: SignRequestStatus | SignRequestStatus[];
  /** 1-100, default 20. */
  limit?: number;
  /** The `id` of the last request of the previous page. */
  after?: string;
}

export interface SignEventDetails {
  reason?: string;
  /** Each document's SHA-256 at that moment, by document id. */
  document_sha256?: Record<string, string>;
  /** SHA-256 of the consent text the signer accepted. */
  disclosure_sha256?: string;
  field_ids?: string[];
  /** SHA-256 of the signature image the signer adopted. */
  signature_sha256?: string;
  initials_sha256?: string;
  /** The signing session the signer used. */
  session_id?: string;
  /** `sealed`: the SHA-256 of the sealed, completed document. */
  signed_document_sha256?: string;
}

/** One entry of a request's audit trail. */
export interface SignEvent {
  object: "sign_event";
  id: string;
  /** 1-based position in the trail. */
  sequence: number;
  type: SignEventType;
  signer_id: string | null;
  actor: SignEventActor;
  ip_address: string | null;
  user_agent: string | null;
  details: SignEventDetails;
  occurred_at: string;
  /** The previous event's `hash` (`null` for the first). */
  previous_hash: string | null;
  /** SHA-256 over this event and `previous_hash`. */
  hash: string;
}

export interface CreateSignSessionParams {
  /** Seconds until the link expires: default 3600, at most 86400. */
  expires_in?: number;
}

/** A signing link for one `embedded` signer. */
export interface SignSession {
  object: "sign_session";
  id: string;
  request_id: string;
  signer_id: string;
  /**
   * The signing page: embed it with `mountSigning` from `coss/sign` (from an origin in your
   * settings' `allowed_origins`) or redirect to it. Show it only to that signer.
   */
  url: string;
  /** The secret part of `url` (its fragment), shown only here. */
  token: string;
  expires_at: string;
}

export type SignTheme = "system" | "light" | "dark";

export interface SignSettings {
  object: "sign_settings";
  /** Origins that may embed the signing page, like `https://app.example.com`. */
  allowed_origins: string[];
  /** The requester's name signers see; `null`: the organization's name. */
  display_name: string | null;
  accent_color: string | null;
  theme: SignTheme;
  /** Your own consent text; `null`: coss.com's default. */
  disclosure: string | null;
  /**
   * Signing emails come from this address (a verified domain in live environments); `null`: from
   * coss.com as "<display name> via coss.com".
   */
  email_from: string | null;
  /** The default days between reminders for new requests; `null`: none. */
  reminder_interval_days: number | null;
}

/** Only the fields given change. */
export interface UpdateSignSettingsParams {
  /** At most 10. */
  allowed_origins?: string[];
  display_name?: string | null;
  /** `#rrggbb`. */
  accent_color?: string | null;
  theme?: SignTheme;
  disclosure?: string | null;
  email_from?: string | null;
  /** 1-30. */
  reminder_interval_days?: number | null;
}

export type SignWebhookEventType =
  | "sign_request.sent"
  | "sign_request.viewed"
  | "sign_request.signer_signed"
  | "sign_request.declined"
  | "sign_request.completed"
  | "sign_request.canceled"
  | "sign_request.expired";

export interface SignRequestWebhookEventData {
  sign_request_id: string;
  /** The request's status after the event. */
  status: SignRequestStatus;
  title: string;
  metadata: Record<string, string>;
  /** The signer who viewed, signed or declined; `null` otherwise. */
  signer: {
    id: string;
    name: string;
    email: string;
    client_ref: string | null;
    status: SignSignerStatus;
  } | null;
  /** A decline's reason, if the signer gave one. */
  reason: string | null;
  sandbox: boolean;
  occurred_at: string;
}

/** A `sign_request.*` webhook; `id` is the audit trail event's id. */
export interface SignRequestWebhookEvent {
  id: string;
  object: "event";
  type: SignWebhookEventType;
  api_version: string;
  created_at: string;
  data: SignRequestWebhookEventData;
}

/** A role of a template, filled by a real signer when a request is made from it. */
export interface SignTemplateRole {
  /** Lowercase letters, digits and `_`, e.g. `client`. */
  key: string;
  /** Shown in the builder, e.g. `Client`. */
  name: string;
}

interface TemplateFieldExtras {
  role: string;
  /** `text` fields only: filled from the request's `merge_fields[merge_key]`. */
  merge_key?: string;
}

export type SignTemplateFieldInput =
  | (PlacedSignFieldInput & TemplateFieldExtras)
  | (AnchoredSignFieldInput & TemplateFieldExtras);

export interface CreateSignTemplateParams {
  name: string;
  /** Requests' title; default `name`. */
  title?: string | null;
  message?: string | null;
  signing_order?: SignSigningOrder;
  documents?: SignDocumentInput[];
  roles?: SignTemplateRole[];
  fields?: SignTemplateFieldInput[];
}

/** Only the fields given change; `documents`, `roles` and `fields` replace the whole list. */
export interface UpdateSignTemplateParams {
  name?: string;
  title?: string | null;
  message?: string | null;
  signing_order?: SignSigningOrder;
  documents?: SignDocumentInput[];
  roles?: SignTemplateRole[];
  fields?: SignTemplateFieldInput[];
}

export interface SignTemplateField {
  id: string;
  role: string;
  document_id: string;
  type: SignFieldType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  label: string | null;
  merge_key: string | null;
}

export interface SignTemplate {
  object: "sign_template";
  id: string;
  name: string;
  title: string | null;
  message: string | null;
  signing_order: SignSigningOrder;
  documents: {
    id: string;
    filename: string;
    sha256: string;
    page_count: number;
    pages: SignPageSize[];
  }[];
  roles: SignTemplateRole[];
  fields: SignTemplateField[];
  /** Requests can be made from it: documents, and a `signature` field for every role. */
  ready: boolean;
  sandbox: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeletedSignTemplate {
  object: "sign_template";
  id: string;
  deleted: true;
}

export interface ListSignTemplatesParams {
  limit?: number;
  after?: string;
}

export interface CreateSignRequestFromTemplateParams {
  /** Default: the template's title, else its name. */
  title?: string;
  message?: string;
  /** One signer for each of the template's roles. */
  signers: {
    role: string;
    name: string;
    email: string;
    delivery?: SignDelivery;
    order?: number;
    client_ref?: string;
  }[];
  /** Values of the template's merge fields, by `merge_key`. */
  merge_fields?: Record<string, string>;
  signing_order?: SignSigningOrder;
  expires_at?: string;
  metadata?: Record<string, string>;
  reminder_interval_days?: number | null;
  send?: boolean;
}

export interface CreateSignBuilderSessionParams {
  /** Seconds until the link expires: default 3600, at most 86400. */
  expires_in?: number;
}

/** A link to the embedded builder for one template. */
export interface SignBuilderSession {
  object: "sign_builder_session";
  id: string;
  template_id: string;
  /** Embed it with `mountBuilder` from `coss/sign`. Show it only to whoever edits the template. */
  url: string;
  token: string;
  expires_at: string;
}
