import type { HookPortalSettingsResponse, RiskLimitBucket } from "@coss/companion";
import { formatCount } from "./format";
import type { Tone } from "./theme";

// apps/web/src/app/[orgSlug]/projects/[projectSlug]/[envSlug]/risk/limits/page.tsx.
export const ON_FAILURE: Record<RiskLimitBucket["on_failure"], [Tone, string]> = {
  allow: ["neutral", "Allow"],
  deny: ["warning", "Deny"],
};

const PERIOD_TEXT: Record<number, string> = {
  1: "second",
  60: "minute",
  3600: "hour",
  86400: "day",
};

/** "100 per minute" (risk/limits/page.tsx's `rate`). */
export function bucketRate(limit: number, periodSeconds: number): string {
  const unit = PERIOD_TEXT[periodSeconds];
  return unit
    ? `${formatCount(limit)} per ${unit}`
    : `${formatCount(limit)} per ${periodSeconds} s`;
}

// apps/web/src/app/[orgSlug]/projects/[projectSlug]/[envSlug]/risk/settings/settings-form.tsx.
export const CAPTCHA_PROVIDER_LABELS: Record<string, string> = {
  none: "Off",
  turnstile: "Cloudflare Turnstile",
  hcaptcha: "hCaptcha",
};

// apps/web/src/app/[orgSlug]/projects/[projectSlug]/[envSlug]/hooks/hook-actions.tsx (PortalSettingsForm).
export const PORTAL_THEME_LABELS: Record<HookPortalSettingsResponse["theme"], string> = {
  system: "Follow the user's system",
  light: "Light",
  dark: "Dark",
};
