import type { MembersResponse } from "@coss/companion";
import {
  listOrganizationMembers,
  listPendingInvitations,
  listScimManagedUserIds,
} from "@coss/tenancy";
import { mobileRoute, requireMobileOrgMember } from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

// Like the dashboard's members page, every member may see the others.
export const GET = mobileRoute(
  async (request, ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/members">) => {
    const { organization, session } = await requireMobileOrgMember(
      request,
      (await ctx.params).orgSlug,
    );
    const organizationId = organization.id;
    const [members, invitations, directoryUserIds] = await Promise.all([
      listOrganizationMembers({ organizationId }),
      listPendingInvitations({ organizationId }),
      listScimManagedUserIds({ organizationId }),
    ]);
    return {
      members: members.map((member) => ({
        id: member.id,
        name: member.user.name,
        email: member.user.email,
        role: member.role,
        two_factor_enabled: member.user.twoFactorEnabled,
        directory:
          directoryUserIds.has(member.user.id) && !member.role.split(",").includes("owner"),
        you: member.user.id === session.user.id,
        joined_at: member.createdAt.toISOString(),
      })),
      invitations: invitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role ?? "member",
        created_at: invitation.createdAt.toISOString(),
        expires_at: invitation.expiresAt.toISOString(),
      })),
      require_two_factor: organization.requireTwoFactor,
    } satisfies MembersResponse;
  },
);
