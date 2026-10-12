"use server";

import {
  cancelScheduledChange,
  collectInvoiceNow,
  getBillingAccount,
  isPlanKey,
  PLANS,
  parseDollarsToCents,
  paymentPortalSession,
  paymentSetupSession,
  scheduleDowngrade,
  startUpgrade,
  updateSpendControls,
} from "@coss/billing";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { env } from "@/env";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { billingRuntime, systemOrganizationId } from "@/lib/billing";
import { downgradeBlockers } from "@/lib/billing-preflight";
import { requireOrgPermission } from "@/lib/session";

function billingUrl(orgSlug: string, query?: Record<string, string>): string {
  const url = new URL(`/${orgSlug}/settings/billing`, env.BETTER_AUTH_URL);
  for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);
  return url.toString();
}

export type UpgradeOutcome =
  | { status: "active" | "processing" }
  | { status: "requires_action"; url: string | null };

/**
 * Upgrades now: a prorated invoice for the rest of the month, charged at once. Without a payment
 * method, the customer first adds one on the provider's page and comes back (`?setup=`), where
 * the billing page collects the invoice.
 */
export async function upgradePlanAction(
  _previous: ActionResult<UpgradeOutcome> | null,
  formData: FormData,
): Promise<ActionResult<UpgradeOutcome>> {
  let checkout = null as string | null;
  const result = await runAction(async (): Promise<UpgradeOutcome> => {
    const { organization, session } = await requireOrgPermission(formString(formData, "orgSlug"), {
      billing: ["update"],
    });
    const plan = formString(formData, "plan");
    if (!isPlanKey(plan)) throw new ActionError("Choose a plan.");
    const runtime = billingRuntime();
    const { contract, invoice } = await startUpgrade({
      organizationId: organization.id,
      plan,
      userId: session.user.id,
      defaultProvider: runtime.defaultProvider,
    });
    await recordAudit(session, {
      organizationId: organization.id,
      action: "billing.plan_upgrade_started",
      target: { type: "billing_contract", id: contract.id, label: PLANS[plan].name },
      metadata: { plan, invoice_id: invoice?.id ?? null },
    });
    if (!invoice || invoice.status === "paid") {
      refresh();
      return { status: "active" };
    }
    const account = await getBillingAccount(organization.id);
    if (!account?.paymentMethod) {
      const setup = await paymentSetupSession({
        organizationId: organization.id,
        defaultProvider: runtime.defaultProvider,
        providers: runtime.providers,
        returnUrl: billingUrl(organization.slug, { upgrade: invoice.id }),
        cancelUrl: billingUrl(organization.slug),
      });
      if (setup) {
        checkout = setup.url;
        return { status: "processing" };
      }
    }
    const collected = await collectInvoiceNow(invoice.id, {
      providers: runtime.providers,
      dashboardUrl: env.BETTER_AUTH_URL,
      systemOrganizationId: await systemOrganizationId(),
    });
    refresh();
    switch (collected?.state) {
      case "paid":
        return { status: "active" };
      case "requires_action":
        return { status: "requires_action", url: collected.hostedUrl };
      case "failed":
        throw new ActionError(
          `The payment failed: ${collected.error} Update your payment method and try again.`,
        );
      default:
        return { status: "processing" };
    }
  });
  // Outside `runAction`: `redirect()` throws to navigate.
  if (checkout) redirect(checkout);
  return result;
}

/** Downgrades (or cancels to Free) at the end of the billing period. */
export async function downgradePlanAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { organization, session } = await requireOrgPermission(formString(formData, "orgSlug"), {
      billing: ["update"],
    });
    const plan = formString(formData, "plan");
    if (!isPlanKey(plan)) throw new ActionError("Choose a plan.");
    const { at } = await scheduleDowngrade({
      organizationId: organization.id,
      plan,
      defaultProvider: billingRuntime().defaultProvider,
      preflight: downgradeBlockers,
      userId: session.user.id,
    });
    await recordAudit(session, {
      organizationId: organization.id,
      action: plan === "free" ? "billing.plan_canceled" : "billing.plan_downgraded",
      target: { type: "billing_plan", id: plan, label: PLANS[plan].name },
      metadata: { plan, effective_at: at.toISOString() },
    });
    refresh();
    return null;
  });
}

/** Undoes a scheduled downgrade or cancellation. */
export async function cancelScheduledChangeAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { organization, session } = await requireOrgPermission(formString(formData, "orgSlug"), {
      billing: ["update"],
    });
    await cancelScheduledChange({
      organizationId: organization.id,
      defaultProvider: billingRuntime().defaultProvider,
    });
    await recordAudit(session, {
      organizationId: organization.id,
      action: "billing.plan_change_canceled",
    });
    refresh();
    return null;
  });
}

/** Sends the customer to the provider's page to add a payment method (it comes back with `?setup=`). */
export async function addPaymentMethodAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let url = null as string | null;
  const result = await runAction(async () => {
    const { organization } = await requireOrgPermission(formString(formData, "orgSlug"), {
      billing: ["update"],
    });
    const runtime = billingRuntime();
    const setup = await paymentSetupSession({
      organizationId: organization.id,
      defaultProvider: runtime.defaultProvider,
      providers: runtime.providers,
      returnUrl: billingUrl(organization.slug),
      cancelUrl: billingUrl(organization.slug),
    });
    if (!setup)
      throw new ActionError(
        "Your organization is invoiced directly. Contact billing to change how you pay.",
      );
    url = setup.url;
    return null;
  });
  if (url) redirect(url);
  return result;
}

/** Opens the provider's portal (payment methods, billing address, tax IDs). */
export async function managePaymentMethodsAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let url = null as string | null;
  const result = await runAction(async () => {
    const { organization } = await requireOrgPermission(formString(formData, "orgSlug"), {
      billing: ["update"],
    });
    const runtime = billingRuntime();
    const portal = await paymentPortalSession({
      organizationId: organization.id,
      defaultProvider: runtime.defaultProvider,
      providers: runtime.providers,
      returnUrl: billingUrl(organization.slug),
    });
    if (!portal)
      throw new ActionError(
        "Your organization is invoiced directly. Contact billing to change how you pay.",
      );
    url = portal.url;
    return null;
  });
  if (url) redirect(url);
  return result;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The spend limit, usage alerts and billing email (owners). */
export async function updateSpendControlsAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { organization, session } = await requireOrgPermission(formString(formData, "orgSlug"), {
      billing: ["update"],
    });
    const limitText = formString(formData, "spendLimit");
    const spendLimitCents = limitText === "" ? null : parseDollarsToCents(limitText);
    if (spendLimitCents === undefined || (limitText !== "" && spendLimitCents === null)) {
      throw new ActionError("Enter the spend limit in dollars, like 500 or 1,250.50.");
    }
    const thresholds = formString(formData, "alertThresholds")
      .split(",")
      .map((value) => value.trim().replace(/%$/, ""))
      .filter(Boolean)
      .map(Number);
    if (thresholds.some((value) => !Number.isInteger(value) || value < 1 || value > 1000)) {
      throw new ActionError("Alert thresholds are whole percentages, like 50, 80, 100.");
    }
    const billingEmail = formString(formData, "billingEmail");
    if (billingEmail && !EMAIL.test(billingEmail)) {
      throw new ActionError("Enter a valid billing email address.");
    }
    await updateSpendControls({
      organizationId: organization.id,
      defaultProvider: billingRuntime().defaultProvider,
      spendLimitCents,
      alertThresholds: thresholds,
      billingEmail: billingEmail || null,
    });
    await recordAudit(session, {
      organizationId: organization.id,
      action: "billing.spend_controls_updated",
      metadata: {
        spend_limit_cents: spendLimitCents?.toString() ?? null,
        alert_thresholds: thresholds,
        billing_email: billingEmail ? "set" : "owners",
      },
    });
    refresh();
    return null;
  });
}
