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
  | "completed";

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
  expires_at: string | null;
  sent_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  declined_at: string | null;
  created_at: string;
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
  disclosure_sha256?: string;
  field_ids?: string[];
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
