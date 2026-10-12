/** Builds the billing providers from validated env. One per process. Server-only. */
import type { ProviderName } from "./accounts.ts";
import type { BillingEnv } from "./env.ts";
import { FakeBillingProvider } from "./providers/fake.ts";
import { manualBillingProvider } from "./providers/manual.ts";
import type { BillingProviders } from "./providers/provider.ts";
import { StripeBillingProvider } from "./providers/stripe.ts";

export { type BillingEnv, billingEnvShape } from "./env.ts";

export type BillingRuntime = {
  /** The provider of new billing accounts. */
  defaultProvider: ProviderName;
  providers: BillingProviders;
  /** Set when Stripe is configured: verifies webhook signatures. */
  stripe: StripeBillingProvider | null;
};

export function createBillingRuntime(
  env: BillingEnv,
  opts: { fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response> } = {},
): BillingRuntime {
  if (env.BILLING_PROVIDER === "stripe" && !env.STRIPE_SECRET_KEY) {
    throw new Error("BILLING_PROVIDER=stripe requires STRIPE_SECRET_KEY.");
  }
  const stripe = env.STRIPE_SECRET_KEY
    ? new StripeBillingProvider({
        secretKey: env.STRIPE_SECRET_KEY,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
        fetch: opts.fetch,
      })
    : null;
  return {
    defaultProvider: env.BILLING_PROVIDER,
    providers: {
      fake: new FakeBillingProvider({ log: process.env.NODE_ENV !== "test" }),
      manual: manualBillingProvider,
      ...(stripe ? { stripe } : {}),
    },
    stripe,
  };
}
