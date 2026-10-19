/** Storage settings wire types (hand-written mirrors of the API's schemas). */

import type { ContentStorageMode } from "./email.ts";

/**
 * What coss.com keeps of the API key's environment's emails. Emails keep the setting that applied
 * when they were sent.
 */
export interface StorageSettings {
  object: "storage_settings";
  /**
   * `"store"` (the default) keeps each email's content (subject, body, headers, template
   * variables, attachment filenames) for the email retention period. `"discard"` keeps it only
   * until the email is sent, fails or is canceled; its metadata (addresses, tags, category,
   * status, recipients, events) is kept as usual.
   */
  content_storage: ContentStorageMode;
  /** ISO 8601 timestamp of the last change, or `null` if it never changed (content is stored). */
  updated_at: string | null;
}

/** Parameters of `coss.email.storage.update`. */
export interface UpdateStorageSettingsParams {
  /** `"store"` keeps emails' content; `"discard"` clears it once they are sent. */
  content_storage: ContentStorageMode;
}
