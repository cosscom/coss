/**
 * Push notification wire schemas and catalog (snake_case). Plain zod, no database imports:
 * `@coss/push/schemas` is safe to load anywhere.
 */
import { z } from "zod";

/** What a person can turn on or off per device. */
export const PUSH_CATEGORIES = ["reputation", "billing", "endpoints", "risk_reviews"] as const;
export type PushCategory = (typeof PUSH_CATEGORIES)[number];

export const PUSH_KINDS = [
  "reputation_warning",
  "reputation_suspended",
  "billing_payment_failed",
  "billing_hold_placed",
  "webhook_endpoint_disabled",
  "hook_endpoint_disabled",
  "log_drain_disabled",
  "risk_review",
] as const;
export type PushKind = (typeof PUSH_KINDS)[number];

export const PUSH_KIND_CATEGORY: Record<PushKind, PushCategory> = {
  reputation_warning: "reputation",
  reputation_suspended: "reputation",
  billing_payment_failed: "billing",
  billing_hold_placed: "billing",
  webhook_endpoint_disabled: "endpoints",
  hook_endpoint_disabled: "endpoints",
  log_drain_disabled: "endpoints",
  risk_review: "risk_reviews",
};

export const APNS_ENVIRONMENTS = ["production", "sandbox"] as const;
export type ApnsEnvironment = (typeof APNS_ENVIRONMENTS)[number];

const categories = z.array(z.enum(PUSH_CATEGORIES)).max(PUSH_CATEGORIES.length);

export const registerPushDeviceSchema = z.strictObject({
  // An APNs device token, hex-encoded (32 bytes today; Apple says not to rely on the length).
  token: z
    .string()
    .regex(/^[0-9a-fA-F]{64,200}$/)
    .transform((token) => token.toLowerCase()),
  apns_environment: z.enum(APNS_ENVIRONMENTS),
  categories: categories.optional(),
});
export type RegisterPushDeviceRequest = z.input<typeof registerPushDeviceSchema>;

export const updatePushCategoriesSchema = z.strictObject({ categories });
export type UpdatePushCategoriesRequest = z.input<typeof updatePushCategoriesSchema>;
