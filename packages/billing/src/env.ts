/** Billing env, for the apps' t3-env schemas (zod only; client-safe). */
import { z } from "zod";

/** The provider new billing accounts get (an admin can move one to `manual`). */
export const BILLING_PROVIDERS = ["fake", "stripe"] as const;

export const billingEnvShape = {
  BILLING_PROVIDER: z.enum(BILLING_PROVIDERS).default("fake"),
  // Required with BILLING_PROVIDER=stripe.
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  // The dashboard's webhook route only: verifies Stripe's signatures.
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
};

export type BillingEnv = {
  BILLING_PROVIDER: (typeof BILLING_PROVIDERS)[number];
  STRIPE_SECRET_KEY?: string | undefined;
  STRIPE_WEBHOOK_SECRET?: string | undefined;
};
