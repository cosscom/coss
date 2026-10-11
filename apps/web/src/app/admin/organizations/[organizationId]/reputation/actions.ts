"use server";

import {
  getOrganizationStanding,
  type ReputationPolicyOverrides,
  reinstateOrganization,
  suspendOrganization,
  updateReputationPolicy,
} from "@coss/reputation";
import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { requirePlatformAdminAction } from "@/lib/session";

/** The organization named by the form (platform admins act across organizations). */
async function organizationFromForm(formData: FormData): Promise<string> {
  const organizationId = formString(formData, "organizationId");
  if (!organizationId || !(await getOrganizationStanding(organizationId))) {
    throw new ActionError("Organization not found.");
  }
  return organizationId;
}

function requiredNote(formData: FormData): string {
  const note = formString(formData, "note");
  if (!note) throw new ActionError("Add a note explaining the decision.");
  if (note.length > 2000) throw new ActionError("Notes can be at most 2000 characters.");
  return note;
}

export async function reinstateOrganizationAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requirePlatformAdminAction();
    const organizationId = await organizationFromForm(formData);
    await reinstateOrganization({
      organizationId,
      adminUserId: admin.session.user.id,
      note: requiredNote(formData),
    });
    refresh();
    return null;
  });
}

export async function suspendOrganizationAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requirePlatformAdminAction();
    const organizationId = await organizationFromForm(formData);
    const event = await suspendOrganization({
      organizationId,
      trigger: "manual",
      actor: { kind: "admin", userId: admin.session.user.id },
      note: requiredNote(formData),
    });
    if (!event) throw new ActionError("This organization is already suspended.");
    refresh();
    return null;
  });
}

/** A percentage field as a rate (`"5"` → 0.05); `undefined` when empty (use the default). */
function percentField(formData: FormData, name: string): number | undefined {
  const value = formString(formData, name);
  if (!value) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new ActionError("Thresholds must be numbers.");
  return number / 100;
}

function integerField(formData: FormData, name: string): number | undefined {
  const value = formString(formData, name);
  if (!value) return undefined;
  const number = Number(value);
  if (!Number.isInteger(number))
    throw new ActionError("Volumes and windows must be whole numbers.");
  return number;
}

/** Saves the overrides (empty fields keep the default), or clears them with `reset`. */
export async function updatePolicyAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requirePlatformAdminAction();
    const organizationId = await organizationFromForm(formData);
    const reset = formString(formData, "intent") === "reset";
    const overrides: ReputationPolicyOverrides = {
      windowDays: integerField(formData, "windowDays"),
      bounceRate: {
        warning: percentField(formData, "bounceWarning"),
        suspend: percentField(formData, "bounceSuspend"),
        minimumRecipients: integerField(formData, "bounceMinimum"),
      },
      complaintRate: {
        warning: percentField(formData, "complaintWarning"),
        suspend: percentField(formData, "complaintSuspend"),
        minimumRecipients: integerField(formData, "complaintMinimum"),
      },
      countSimulatorRecipients: formData.get("countSimulatorRecipients") === "on" || undefined,
    };
    await updateReputationPolicy({
      organizationId,
      overrides: reset ? null : withoutEmpty(overrides),
      adminUserId: admin.session.user.id,
      note: formString(formData, "note") || null,
    });
    refresh();
    return null;
  });
}

/** Drops unset fields (and empty groups), so only real overrides are stored. */
function withoutEmpty(overrides: ReputationPolicyOverrides): ReputationPolicyOverrides | null {
  const clean = (value: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
  const result: Record<string, unknown> = clean({
    windowDays: overrides.windowDays,
    countSimulatorRecipients: overrides.countSimulatorRecipients,
  });
  for (const key of ["bounceRate", "complaintRate"] as const) {
    const group = clean(overrides[key] ?? {});
    if (Object.keys(group).length > 0) result[key] = group;
  }
  return Object.keys(result).length > 0 ? (result as ReputationPolicyOverrides) : null;
}
