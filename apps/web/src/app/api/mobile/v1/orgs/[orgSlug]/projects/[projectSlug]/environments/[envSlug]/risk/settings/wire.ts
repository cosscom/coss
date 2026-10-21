import type { RiskSettingsResponse } from "@coss/companion";
import { CONTENT_CATEGORIES, REASONS, type RiskSettingsOutput } from "@coss/risk/schemas";

/** What the app's Risk settings screen shows (the captcha secret is never part of it). */
export function toMobileRiskSettings(settings: RiskSettingsOutput): RiskSettingsResponse {
  return {
    review_threshold: settings.review_threshold,
    block_threshold: settings.block_threshold,
    captcha: settings.captcha
      ? { provider: settings.captcha.provider, required: settings.captcha.required }
      : null,
    content_thresholds: CONTENT_CATEGORIES.map((category) => ({
      category,
      threshold: settings.content_thresholds[category] ?? null,
    })),
    disabled_reasons: settings.disabled_reasons.map((code) => ({
      code,
      description: REASONS[code].description,
    })),
  };
}
