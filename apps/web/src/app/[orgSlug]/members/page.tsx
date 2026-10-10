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
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import { CancelInvitationButton } from "./cancel-invitation-button";
import { ChangeRoleDialog } from "./change-role-dialog";
import { InviteMemberForm } from "./invite-member-form";

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
