import "server-only";
import { unpaidInvoiceCount } from "@coss/billing";
import {
  type AccountDeletionBlocker,
  type AccountDeletionOrganization,
  type AccountDeletionPlan,
  deleteUserAccount,
  planAccountDeletion,
} from "@coss/tenancy";
import { recordUserAudit } from "./audit";

export type AccountBlocker =
  | AccountDeletionBlocker
  /** An organization deleted with the account must not leave invoices behind (as in settings). */
  | { kind: "unpaid_invoices"; organization: AccountDeletionOrganization };

export type AccountPlan = Omit<AccountDeletionPlan, "blockers"> & { blockers: AccountBlocker[] };

/** One sentence per blocker, shared by the dashboard and the iOS app. */
export function blockerMessage(blocker: AccountBlocker): string {
  switch (blocker.kind) {
    case "sole_owner":
      return `You're the only owner of ${blocker.organization.name}. Make another member an owner, or delete the organization, first.`;
    case "organization_suspended":
      return `${blocker.organization.name} is suspended. Contact support to delete your account.`;
    case "unpaid_invoices":
      return `${blocker.organization.name} has open invoices to settle first. Contact support if you need help.`;
    case "platform_admin":
      return "Platform admins can't delete their account. Ask another admin to remove your admin role first.";
  }
}

/** What deleting the account would do now, and what keeps it from happening. */
export async function accountDeletionPlan(userId: string): Promise<AccountPlan> {
  const plan: AccountPlan = await planAccountDeletion(userId);
  for (const organization of plan.deleteOrganizations) {
    if ((await unpaidInvoiceCount(organization.id)) > 0) {
      plan.blockers.push({ kind: "unpaid_invoices", organization });
    }
  }
  return plan;
}

export class AccountDeletionBlocked extends Error {
  constructor(readonly blockers: AccountBlocker[]) {
    super(blockers.map(blockerMessage).join(" "));
  }
}

/**
 * Deletes the user's account (`deleteUserAccount`) and records it in the audit log of every
 * organization it touched; organizations deleted with it lose their log anyway. The caller has
 * already checked the session is the user's own and recent.
 */
export async function deleteAccount(actor: { id: string; email: string }): Promise<void> {
  const plan = await accountDeletionPlan(actor.id);
  if (plan.blockers.length > 0) throw new AccountDeletionBlocked(plan.blockers);
  const result = await deleteUserAccount({ userId: actor.id, email: actor.email });
  for (const organization of result.leftOrganizations) {
    await recordUserAudit(actor, {
      organizationId: organization.id,
      action: "member.left",
      target: { type: "user", id: actor.id, label: actor.email },
      metadata: { reason: "account_deleted" },
    });
  }
  for (const key of result.revokedKeys) {
    await recordUserAudit(actor, {
      organizationId: key.organizationId,
      action: "api_key.revoked",
      target: { type: "api_key", id: key.id, label: key.name },
      metadata: { reason: "account_deleted" },
    });
  }
}
