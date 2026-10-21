// Risk rate limits, calibration and settings, and the Hooks portal settings.

/** A customer's own rate limit bucket (`coss.risk.limit()`). */
export type RiskLimitBucket = {
  id: string;
  name: string;
  /** Requests per `period_seconds`. */
  limit: number;
  period_seconds: number;
  burst: number;
  /** What a check answers while coss.com can't count. */
  on_failure: "allow" | "deny";
};

export type RiskLimitBucketsResponse = { data: RiskLimitBucket[] };

export type RiskCalibrationReason = {
  code: string;
  fired: number;
  /** With feedback `fraud` or `abuse`. */
  fraud: number;
  legitimate: number;
  /** `null` without feedback. */
  precision: number | null;
  weight: number;
  default_weight: number;
  /** `null` with too little feedback. */
  suggested_weight: number | null;
};

export type RiskCalibrationResponse = {
  window_days: number;
  assessments: number;
  labeled: number;
  /** Feedback a reason needs before a weight is suggested. */
  min_feedback: number;
  reasons: RiskCalibrationReason[];
};

export type RiskSettingsResponse = {
  review_threshold: number;
  block_threshold: number;
  /** Never the secret. */
  captcha: { provider: "turnstile" | "hcaptcha"; required: boolean } | null;
  /** Every content category, in order; `threshold` `null`: it never fires. */
  content_thresholds: { category: string; threshold: number | null }[];
  /** The reasons turned off, with what they mean. */
  disabled_reasons: { code: string; description: string }[];
};

export type HookPortalSettingsResponse = {
  /** Origins allowed to embed the portal; empty: it only opens as its own page. */
  allowed_origins: string[];
  display_name: string | null;
  accent_color: string | null;
  theme: "system" | "light" | "dark";
};
