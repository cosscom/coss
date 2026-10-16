/** Suppression list wire types (hand-written mirrors of the API's schemas). */

/**
 * Why an address is suppressed. `bounce`: a permanent bounce. `complaint`: a spam complaint.
 * `manual`: added one by one through the API or the dashboard. `import`: added by a bulk import.
 * `unsubscribe`: the recipient's one-click unsubscribe, scoped to the email's category.
 */
export type SuppressionReason = "bounce" | "complaint" | "manual" | "import" | "unsubscribe";

/** An entry of the API key's environment's suppression list. */
export interface Suppression {
  object: "suppression";
  id: string;
  /** The bare, lower-cased address. */
  address: string;
  /**
   * `"*"` (every email), `"stream:marketing"` (marketing emails; complaints about them add it) or
   * a category: only emails sent with that `category` skip the address.
   */
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
  /** The stream of the email you plan to send; `marketing` also counts `"stream:marketing"`. */
  stream?: "transactional" | "marketing";
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

/** One entry of `POST /v1/suppressions/import`. */
export interface ImportSuppressionEntry {
  address: string;
  /** `"*"` (the default) or a category. */
  scope?: string;
}

/** Input of `coss.email.suppressions.import()`; the SDK sends 1,000 entries per request. */
export interface ImportSuppressionsParams {
  suppressions: ImportSuppressionEntry[];
}

/** What an import did. */
export interface SuppressionImport {
  object: "suppression_import";
  /** Entries added. */
  created: number;
  /** Valid entries that were already on the list (or repeated in the import); unchanged. */
  existing: number;
  /** Skipped entries; `index` is the entry's position in `suppressions`. */
  invalid: Array<{ index: number; address: string; message: string }>;
}

/** Query of `GET /v1/suppressions/export`. */
export interface ExportSuppressionsParams {
  scope?: string;
  reason?: SuppressionReason;
}
