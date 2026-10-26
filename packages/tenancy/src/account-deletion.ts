/**
 * A user deleting their own account. They leave the organizations they share with others (never
 * as their last owner), and the organizations they are the only member of are deleted with them
 * (`requestOrganizationDeletion`). The rest of their data cascades from the `user` row, except
 * what must move first: their personal API keys (deleted, never left without a binding) and the
 * SSO providers they registered (`sso_provider.user_id` cascades, which would drop the
 * organization's provider; handed to another owner instead).
 */
import { db, type Executor, schema } from "@coss/db";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { requestOrganizationDeletion } from "./deletion.ts";
import { TenancyError } from "./errors.ts";

const {
  apikey,
  environmentApiKey,
  member,
  organization,
  organizationSuspension,
  ssoProvider,
  user,
} = schema;

export type AccountDeletionOrganization = { id: string; name: string; slug: string };

export type AccountDeletionBlocker =
  /** The organization has other members and no other owner: transfer ownership first. */
  | { kind: "sole_owner"; organization: AccountDeletionOrganization }
  /** Suspended organizations keep their members until coss.com reviews them. */
  | { kind: "organization_suspended"; organization: AccountDeletionOrganization }
  | { kind: "platform_admin" };

export type AccountDeletionPlan = {
  /** Organizations the user is the only member of: deleted with the account. */
  deleteOrganizations: AccountDeletionOrganization[];
  /** Organizations shared with others: the user leaves them. */
  leaveOrganizations: AccountDeletionOrganization[];
  blockers: AccountDeletionBlocker[];
};

export type AccountDeletionResult = {
  deletedOrganizations: AccountDeletionOrganization[];
  leftOrganizations: AccountDeletionOrganization[];
  /** Personal API keys deleted with the account (each organization records them). */
  revokedKeys: { organizationId: string; id: string; name: string | null }[];
};

function hasRole(role: string | null, name: string): boolean {
  return (role ?? "").split(",").some((part) => part.trim() === name);
}

export async function planAccountDeletion(
  userId: string,
  executor: Executor = db,
): Promise<AccountDeletionPlan> {
  const [account] = await executor
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!account) throw new TenancyError("not_found", "Account not found.");

  const memberships = await executor
    .select({
      organization: { id: organization.id, name: organization.name, slug: organization.slug },
      role: member.role,
      suspended: sql<boolean>`${organizationSuspension.organizationId} is not null`,
      otherMembers: sql<number>`(select count(*)::int from ${member} m where m.organization_id = ${organization.id} and m.user_id <> ${userId})`,
      otherOwners: sql<number>`(select count(*)::int from ${member} m where m.organization_id = ${organization.id} and m.user_id <> ${userId} and 'owner' = any(string_to_array(replace(m.role, ' ', ''), ',')))`,
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .leftJoin(organizationSuspension, eq(organizationSuspension.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .orderBy(asc(organization.name));

  const plan: AccountDeletionPlan = {
    deleteOrganizations: [],
    leaveOrganizations: [],
    blockers: [],
  };
  if (hasRole(account.role, "admin")) plan.blockers.push({ kind: "platform_admin" });
  for (const row of memberships) {
    if (row.suspended) {
      plan.blockers.push({ kind: "organization_suspended", organization: row.organization });
    } else if (row.otherMembers === 0) {
      plan.deleteOrganizations.push(row.organization);
    } else if (hasRole(row.role, "owner") && row.otherOwners === 0) {
      plan.blockers.push({ kind: "sole_owner", organization: row.organization });
    } else {
      plan.leaveOrganizations.push(row.organization);
    }
  }
  return plan;
}

/**
 * Deletes the user's account in one transaction, re-planning under row locks so a membership
 * that changed since the user saw the plan is caught. Refuses (`TenancyError` "forbidden") while
 * anything blocks it, and for banned users (a deleted account could sign up again).
 */
export async function deleteUserAccount(input: {
  userId: string;
  email: string;
}): Promise<AccountDeletionResult> {
  return db.transaction(async (tx) => {
    const [account] = await tx
      .select({ banned: user.banned, banExpires: user.banExpires })
      .from(user)
      .where(eq(user.id, input.userId))
      .for("update")
      .limit(1);
    if (!account) throw new TenancyError("not_found", "Account not found.");
    if (account.banned && (!account.banExpires || account.banExpires > new Date())) {
      throw new TenancyError("forbidden", "This account can't be deleted. Contact support.");
    }
    // Locks the organizations (in id order) so members can't join or leave mid-deletion.
    const organizationIds = tx
      .select({ id: member.organizationId })
      .from(member)
      .where(eq(member.userId, input.userId));
    await tx
      .select({ id: organization.id })
      .from(organization)
      .where(inArray(organization.id, organizationIds))
      .orderBy(asc(organization.id))
      .for("update");

    const plan = await planAccountDeletion(input.userId, tx);
    if (plan.blockers.length > 0) {
      throw new TenancyError(
        "forbidden",
        "Something keeps this account from being deleted. Reload and try again.",
      );
    }

    for (const org of plan.deleteOrganizations) {
      await requestOrganizationDeletion(
        { organizationId: org.id, actor: { userId: input.userId, email: input.email } },
        tx,
      );
    }

    const keys = tx
      .select({ id: environmentApiKey.apiKeyId })
      .from(environmentApiKey)
      .where(eq(environmentApiKey.ownerUserId, input.userId));
    const revokedKeys = await tx
      .delete(apikey)
      .where(inArray(apikey.id, keys))
      .returning({ organizationId: apikey.referenceId, id: apikey.id, name: apikey.name });

    await handOverSsoProviders(tx, input.userId);

    await tx.delete(user).where(eq(user.id, input.userId));
    return {
      deletedOrganizations: plan.deleteOrganizations,
      leftOrganizations: plan.leaveOrganizations,
      revokedKeys,
    };
  });
}

/** Gives each SSO provider the user registered to another owner (then admin) of its org. */
async function handOverSsoProviders(tx: Executor, userId: string): Promise<void> {
  const providers = await tx
    .select({ id: ssoProvider.id, organizationId: ssoProvider.organizationId })
    .from(ssoProvider)
    .where(eq(ssoProvider.userId, userId));
  for (const provider of providers) {
    if (!provider.organizationId) continue;
    const candidates = await tx
      .select({ userId: member.userId, role: member.role })
      .from(member)
      .where(and(eq(member.organizationId, provider.organizationId), ne(member.userId, userId)))
      .orderBy(asc(member.createdAt));
    const next =
      candidates.find((candidate) => hasRole(candidate.role, "owner")) ??
      candidates.find((candidate) => hasRole(candidate.role, "admin")) ??
      candidates[0];
    if (next) {
      await tx
        .update(ssoProvider)
        .set({ userId: next.userId })
        .where(eq(ssoProvider.id, provider.id));
    }
  }
}
