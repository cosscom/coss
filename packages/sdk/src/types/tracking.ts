/** Tracking settings wire types (hand-written mirrors of the API's schemas). */

/** An environment's tracking default (`category: null`) or the rule for one category. */
export interface TrackingRule {
  object: "tracking_rule";
  id: string;
  /** The category the rule applies to; `null` for the environment default. */
  category: string | null;
  /** Whether opens are tracked. */
  opens: boolean;
  /** Whether clicks are tracked. */
  clicks: boolean;
  /**
   * Whether emails get one-click unsubscribe headers (only emails with a category and a single
   * recipient).
   */
  unsubscribe: boolean;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

/**
 * Open and click tracking and one-click unsubscribe settings of the API key's environment. For
 * each of `opens`, `clicks` and `unsubscribe`, a send's own `tracking` wins, then its category's
 * rule, then `default`, then off.
 */
export interface TrackingSettings {
  object: "tracking_settings";
  /** The environment default; `null` when none is set. */
  default: TrackingRule | null;
  /** Category rules, by category name. */
  categories: TrackingRule[];
}

/**
 * Body of `PATCH /v1/tracking_settings/default` and `…/categories/{category}`: at least one
 * field. Fields left out keep their value; a new rule starts with all off.
 */
export interface UpdateTrackingRuleParams {
  opens?: boolean;
  clicks?: boolean;
  /** Add one-click unsubscribe headers to emails with a category and a single recipient. */
  unsubscribe?: boolean;
}

/** Returned when a rule is removed. */
export interface DeletedTrackingRule {
  object: "tracking_rule";
  id: string;
  category: string | null;
  deleted: true;
}
