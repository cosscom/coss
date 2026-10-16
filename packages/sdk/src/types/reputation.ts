/** Reputation wire types (hand-written mirrors of the API's `Reputation` schema). */

export type ReputationStatus = "good" | "warning" | "suspended";

export type ReputationCheckSeverity = "ok" | "warning" | "suspend";

/**
 * `paused`: the marketing stream's bounce or complaint rate reached its suspension threshold, so
 * marketing sends are refused (`marketing_paused`) until coss.com support lifts the pause.
 * Transactional email is unaffected.
 */
export type MarketingStatus = "active" | "paused";

/** The marketing stream's own standing. */
export interface MarketingStanding {
  status: MarketingStatus;
  /** The trigger behind a pause, e.g. `marketing_complaint_rate`. */
  reason: string | null;
  /** ISO 8601 timestamp. */
  paused_at: string | null;
}

/** One signal the reputation guard measured, e.g. the bounce rate. */
export interface ReputationCheck {
  /** What was measured, e.g. `bounce_rate` or `complaint_rate`. */
  trigger: string;
  severity: ReputationCheckSeverity;
  message: string;
  /** `count / volume`; `null` with no volume. */
  rate: number | null;
  count: number;
  /** Recipients sent to (live environments) in the window. */
  volume: number;
  warning_threshold: number | null;
  suspend_threshold: number | null;
  /** Below this volume the rate is reported but never acted on. */
  minimum_volume: number | null;
}

/** `GET /v1/reputation`: the organization's standing with the reputation guard. */
export interface Reputation {
  object: "reputation";
  /**
   * `suspended` means live sending is refused (`account_suspended`) until coss.com support
   * reinstates the organization; sandbox keys keep working.
   */
  status: ReputationStatus;
  /** The trigger behind a `warning` or `suspended` status. */
  reason: string | null;
  /** ISO 8601 timestamp. */
  status_changed_at: string | null;
  /** When `checks` were computed; `null` before the first evaluation. */
  evaluated_at: string | null;
  /** The period `checks` cover. */
  window: { start: string; end: string } | null;
  checks: ReputationCheck[];
  marketing: MarketingStanding;
}
