import { assignableOrgRoles, orgRoleCan } from "@coss/auth/permissions";
import { listOrganizationMembers, listPendingInvitations } from "@coss/tenancy";
import { Badge } from "@coss/ui/components/badge";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import { CancelInvitationButton } from "./cancel-invitation-button";
import { ChangeRoleDialog } from "./change-role-dialog";
import { InviteMemberForm } from "./invite-member-form";
import { TwoFactorRequirementForm } from "./two-factor-requirement";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({ params }: PageProps<"/[orgSlug]/members">) {
  const { orgSlug } = await params;
  const { session, organization, member } = await requireOrgMember(orgSlug);
  const [members, invitations] = await Promise.all([
    listOrganizationMembers({ organizationId: organization.id }),
    listPendingInvitations({ organizationId: organization.id }),
  ]);
  const canInvite = orgRoleCan(member.role, { invitation: ["create"] });
  const canCancelInvitations = orgRoleCan(member.role, { invitation: ["cancel"] });
  const canChangeRoles = orgRoleCan(member.role, { member: ["update"] });
  const canManageSecurity = orgRoleCan(member.role, { organization: ["update"] });
  const withoutTwoFactor = members.filter((row) => !row.user.twoFactorEnabled).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader description={`People with access to ${organization.name}.`} title="Members" />

      {canInvite ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite a member</CardTitle>
            <CardDescription>
              Admins can manage projects and API keys; members have read-only access.
            </CardDescription>
          </CardHeader>
          <CardPanel>
            <InviteMemberForm orgSlug={organization.slug} />
          </CardPanel>
        </Card>
      ) : null}

      {canManageSecurity ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Two-factor authentication
              {organization.requireTwoFactor ? <Badge variant="success">Required</Badge> : null}
            </CardTitle>
            <CardDescription>
              {organization.requireTwoFactor
                ? "Members must use an authenticator app to sign in. Anyone without one is asked to set it up before they can open this organization."
                : "Require every member to use an authenticator app when signing in with a password. Members without one are asked to set it up on their next visit."}{" "}
              {withoutTwoFactor > 0
                ? `${withoutTwoFactor} of ${members.length} member${members.length === 1 ? " doesn't" : "s don't"} have it yet.`
                : "Every member has it set up."}
            </CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col gap-3">
            {!organization.requireTwoFactor && !session.user.twoFactorEnabled ? (
              <p className="text-muted-foreground text-sm">
                <Link className="text-foreground underline" href="/settings">
                  Set up two-factor authentication
                </Link>{" "}
                for your own account before requiring it.
              </p>
            ) : null}
            <TwoFactorRequirementForm
              canRequire={Boolean(session.user.twoFactorEnabled)}
              orgSlug={organization.slug}
              required={organization.requireTwoFactor}
            />
          </CardPanel>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardPanel className="p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Two-factor</TableHead>
                <TableHead>Joined</TableHead>
                {canChangeRoles ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((row) => {
                const roles = assignableOrgRoles(member.role, row.role);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.user.name}
                      {row.user.id === session.user.id ? (
                        <span className="text-muted-foreground"> (you)</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{row.user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {row.user.twoFactorEnabled ? (
                        <Badge variant="success">on</Badge>
                      ) : (
                        <Badge variant={organization.requireTwoFactor ? "warning" : "outline"}>
                          off
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    {canChangeRoles ? (
                      <TableCell className="text-right">
                        {roles.length > 0 ? (
                          <ChangeRoleDialog
                            currentRole={row.role}
                            isSelf={row.id === member.id}
                            memberId={row.id}
                            memberName={row.user.name}
                            orgSlug={organization.slug}
                            roles={roles}
                          />
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
        </CardHeader>
        <CardPanel className="p-2">
          {invitations.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">No pending invitations.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  {canCancelInvitations ? (
                    <TableHead className="text-right">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{invitation.role ?? "member"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(invitation.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(invitation.expiresAt)}
                    </TableCell>
                    {canCancelInvitations ? (
                      <TableCell className="text-right">
                        <CancelInvitationButton
                          email={invitation.email}
                          invitationId={invitation.id}
                          orgSlug={organization.slug}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardPanel>
      </Card>
    </div>
  );
}
