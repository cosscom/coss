/**
 * Payment methods: the hosted pages where customers add or manage them (the provider's), and
 * what the account keeps of the default one. Also the admin overview's cross-account reads.
 */
import { db, schema } from "@coss/db";
import { and, asc, eq, gt, inArray, isNotNull, lte, ne } from "drizzle-orm";
import {
  type BillingAccount,
  ensureBillingAccount,
  organizationLabel,
  type ProviderName,
} from "./accounts.ts";
import { BillingError } from "./errors.ts";
import { type BillingProviders, providerFor } from "./providers/provider.ts";

const { billingAccount, billingContract, billingHold } = schema;

/** The account with its provider customer created (and saved) if it had none. */
export async function ensureProviderCustomer(
  organizationId: string,
  defaultProvider: ProviderName,
  providers: BillingProviders,
): Promise<BillingAccount> {
  const account = await ensureBillingAccount(organizationId, defaultProvider);
  if (account.providerCustomerId) return account;
  const organization = await organizationLabel(organizationId);
  if (!organization) throw new BillingError("not_found", "The organization no longer exists.");
  const customerId = await providerFor(providers, account.provider).ensureCustomer(
    account,
    organization,
  );
  if (!customerId) return account;
  const [row] = await db
    .update(billingAccount)
    .set({ providerCustomerId: customerId })
    .where(eq(billingAccount.id, account.id))
    .returning();
  return row ?? account;
}

/** A hosted page to add a payment method (`null`: the account's provider has none, e.g. manual). */
export async function paymentSetupSession(input: {
  organizationId: string;
  defaultProvider: ProviderName;
  providers: BillingProviders;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ url: string } | null> {
  const account = await ensureProviderCustomer(
    input.organizationId,
    input.defaultProvider,
    input.providers,
  );
  const organization = await organizationLabel(input.organizationId);
  if (!organization) throw new BillingError("not_found", "The organization no longer exists.");
  const session = await providerFor(input.providers, account.provider).createSetupSession(
    account,
    organization,
    {
      returnUrl: input.returnUrl,
      cancelUrl: input.cancelUrl,
      methods: account.allowedPaymentMethods,
    },
  );
  return session ? { url: session.url } : null;
}

/** The customer came back from the setup page: its method becomes the default. */
export async function completePaymentSetup(input: {
  organizationId: string;
  defaultProvider: ProviderName;
  providers: BillingProviders;
  sessionId: string;
}): Promise<BillingAccount> {
  const account = await ensureBillingAccount(input.organizationId, input.defaultProvider);
  const method = await providerFor(input.providers, account.provider).completeSetup(
    account,
    input.sessionId,
  );
  if (!method) return account;
  const [row] = await db
    .update(billingAccount)
    .set({ paymentMethod: method })
    .where(eq(billingAccount.id, account.id))
    .returning();
  return row ?? account;
}

/** A hosted page to manage payment methods and billing details. */
export async function paymentPortalSession(input: {
  organizationId: string;
  defaultProvider: ProviderName;
  providers: BillingProviders;
  returnUrl: string;
}): Promise<{ url: string } | null> {
  const account = await ensureProviderCustomer(
    input.organizationId,
    input.defaultProvider,
    input.providers,
  );
  return providerFor(input.providers, account.provider).createPortalSession(account, {
    returnUrl: input.returnUrl,
  });
}

/** Refreshes the stored default payment method from the provider. */
export async function refreshPaymentMethod(input: {
  organizationId: string;
  defaultProvider: ProviderName;
  providers: BillingProviders;
}): Promise<BillingAccount> {
  const account = await ensureBillingAccount(input.organizationId, input.defaultProvider);
  const method = await providerFor(input.providers, account.provider).paymentMethod(account);
  const [row] = await db
    .update(billingAccount)
    .set({ paymentMethod: method })
    .where(eq(billingAccount.id, account.id))
    .returning();
  return row ?? account;
}

/** Accounts that need a look (admin overview): overdue, held, pending upgrades, terms ending soon. */
export async function billingAttention(now: Date = new Date()) {
  const soon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const [standing, holds, pending, ending] = await Promise.all([
    db
      .select()
      .from(billingAccount)
      .where(ne(billingAccount.status, "active"))
      .orderBy(asc(billingAccount.pastDueSince))
      .limit(100),
    db.select().from(billingHold).orderBy(asc(billingHold.createdAt)).limit(100),
    db
      .select()
      .from(billingContract)
      .where(eq(billingContract.status, "pending"))
      .orderBy(asc(billingContract.createdAt))
      .limit(100),
    db
      .select()
      .from(billingContract)
      .where(
        and(
          eq(billingContract.status, "confirmed"),
          inArray(billingContract.kind, ["sales", "internal"]),
          isNotNull(billingContract.termEnd),
          gt(billingContract.termEnd, now),
          lte(billingContract.termEnd, soon),
        ),
      )
      .orderBy(asc(billingContract.termEnd))
      .limit(100),
  ]);
  return { standing, holds, pending, ending };
}
