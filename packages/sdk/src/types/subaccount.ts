/** Recipient quotas you set on a sub-account; `null`: only your organization's quota applies. */
export interface SubaccountQuotas {
  recipients_per_day: number | null;
  recipients_per_second: number | null;
  /** How many recipients a moment may take before the per-second rate applies. */
  burst: number | null;
}

export type SubaccountStatus = "active" | "disabled" | "deleting";
export type SubaccountReputationStatus = "good" | "warning" | "paused";

/** A sub-account's own sending standing. */
export interface SubaccountReputation {
  /** `paused`: its live sends are refused (`subaccount_paused`) until you reinstate it. */
  status: SubaccountReputationStatus;
  /** What last changed it, e.g. `bounce_rate`, `complaint_rate`, `content_screening`. */
  trigger: string | null;
  /** ISO 8601 timestamp. */
  changed_at: string | null;
  reinstated_at: string | null;
}

/**
 * One of your users (email for platforms), with their own domains, suppressions, quotas and
 * reputation.
 */
export interface Subaccount {
  object: "subaccount";
  id: string;
  /** Your own id for it, unique in the environment; every method that takes a sub-account accepts it. */
  uid: string | null;
  name: string;
  metadata: Record<string, string>;
  /** `disabled`: you turned it off. `deleting`: its domains are being released. */
  status: SubaccountStatus;
  quotas: SubaccountQuotas;
  reputation: SubaccountReputation;
  /** ISO 8601 timestamp. */
  created_at: string;
  updated_at: string;
}

/** Quotas in a request: fields left out keep their value, `null` removes one. */
export interface SubaccountQuotasParams {
  recipients_per_day?: number | null;
  recipients_per_second?: number | null;
  burst?: number | null;
}

/** Body of `POST /v1/subaccounts`. */
export interface CreateSubaccountParams {
  name: string;
  /** Your own id for it (1-256 letters, digits and `. _ : @ | -`). */
  uid?: string;
  /** At most 16 keys (up to 40 characters), values up to 500 characters. */
  metadata?: Record<string, string>;
  quotas?: SubaccountQuotasParams;
}

/** Body of `PATCH /v1/subaccounts/{subaccount}`; fields left out keep their value. */
export interface UpdateSubaccountParams {
  name?: string;
  /** `null` removes it. */
  uid?: string | null;
  /** Replaces the metadata. */
  metadata?: Record<string, string>;
  /** `disabled` refuses its sends until it is `active` again. */
  status?: "active" | "disabled";
  quotas?: SubaccountQuotasParams;
}

/** Query of `GET /v1/subaccounts`. */
export interface ListSubaccountsParams {
  /** 1-100, default 50. */
  limit?: number;
  /** The last `id` of the previous page. */
  after?: string;
}
