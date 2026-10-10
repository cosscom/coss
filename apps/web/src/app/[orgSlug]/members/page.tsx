import { assignableOrgRoles, canRemoveOrgMember } from "@coss/auth/permissions";
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
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import { CancelInvitationButton } from "./cancel-invitation-button";
import { ChangeRoleDialog } from "./change-role-dialog";
import { InviteMemberForm } from "./invite-member-form";
import { RemoveMemberButton } from "./remove-member-button";
import { ResendInvitationButton } from "./resend-invitation-button";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({ params }: PageProps<"/[orgSlug]/members">) {
  const { orgSlug } = await params;
  const { organization, member, can } = await requireOrgMember(orgSlug);
  const [members, invitations] = await Promise.all([
    listOrganizationMembers({ organizationId: organization.id }),
    listPendingInvitations({ organizationId: organization.id }),
  ]);
  const canInvite = can({ invitation: ["create"] });
  const canCancelInvitations = can({ invitation: ["cancel"] });
  const canChangeRoles = can({ member: ["update"] });
  const canRemoveMembers = can({ member: ["delete"] });
  const canManageMembers = canChangeRoles || canRemoveMembers;
  const canManageInvitations = canInvite || canCancelInvitations;

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
                {canManageMembers ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((row) => {
                const roles = assignableOrgRoles(member.role, row.role);
                const isSelf = row.id === member.id;
                // Leaving (removing yourself) lives on the settings page.
                const removable = !isSelf && canRemoveOrgMember(member.role, row.role);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.user.name}
                      {isSelf ? <span className="text-muted-foreground"> (you)</span> : null}
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
                    {canManageMembers ? (
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {roles.length > 0 ? (
                            <ChangeRoleDialog
                              currentRole={row.role}
                              isSelf={isSelf}
                              memberId={row.id}
                              memberName={row.user.name}
                              orgSlug={organization.slug}
                              roles={roles}
                            />
                          ) : null}
                          {removable ? (
                            <RemoveMemberButton
                              memberId={row.id}
                              memberName={row.user.name}
                              orgName={organization.name}
                              orgSlug={organization.slug}
                            />
                          ) : null}
                        </div>
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
                  {canManageInvitations ? (
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
                    {canManageInvitations ? (
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {canInvite ? (
                            <ResendInvitationButton
                              invitationId={invitation.id}
                              orgSlug={organization.slug}
                            />
                          ) : null}
                          {canCancelInvitations ? (
                            <CancelInvitationButton
                              email={invitation.email}
                              invitationId={invitation.id}
                              orgSlug={organization.slug}
                            />
                          ) : null}
                        </div>
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
