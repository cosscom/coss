/** Suppression list wire types (hand-written mirrors of the API's schemas). */

/**
 * Why an address is suppressed. `bounce`: a permanent bounce. `complaint`: a spam complaint.
 * `manual`: added through the API or the dashboard.
 */
export type SuppressionReason = "bounce" | "complaint" | "manual";

/** An entry of the API key's environment's suppression list. */
export interface Suppression {
  object: "suppression";
  id: string;
  /** The bare, lower-cased address. */
  address: string;
  /** `"*"` (every email) or a category: only emails sent with that `category` skip the address. */
  scope: string;
  reason: SuppressionReason;
  /** The email whose bounce or complaint added this entry. */
  email_id: string | null;
  /** ISO 8601 timestamp. */
  created_at: string;
}

/** Body of `POST /v1/suppressions`. */
export interface CreateSuppressionParams {
  /** Display names are ignored; matching is case-insensitive. */
  address: string;
  /** `"*"` (the default) suppresses every email; a category only suppresses those emails. */
  scope?: string;
}

/** Query of `GET /v1/suppressions`. */
export interface ListSuppressionsParams {
  address?: string;
  scope?: string;
  /** 1-100, default 50. */
  limit?: number;
  /** The `id` of the last entry of the previous page. */
  after?: string;
}

/** Query of `GET /v1/suppressions/check`. */
export interface CheckSuppressionParams {
  address: string;
  /** The category of the email you plan to send. Without it, only `"*"` entries count. */
  category?: string;
}

/** Whether a send would skip an address. */
export interface SuppressionCheck {
  object: "suppression_check";
  address: string;
  suppressed: boolean;
  /** The entries that match. */
  suppressions: Suppression[];
}

/** Response of `DELETE /v1/suppressions/{id}`. */
export interface DeletedSuppression {
  object: "suppression";
  id: string;
  deleted: true;
}
