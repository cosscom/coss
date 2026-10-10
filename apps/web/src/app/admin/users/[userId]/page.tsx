import {
  getUserForAdmin,
  listAdminAuditEvents,
  listUserMembershipsForAdmin,
  listUserSessionsForAdmin,
} from "@coss/tenancy/admin";
import { Badge } from "@coss/ui/components/badge";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import { Field, FieldLabel } from "@coss/ui/components/field";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
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
import { notFound } from "next/navigation";
import { AdminActionDialog } from "@/components/admin/admin-action-dialog";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import {
  OrganizationStatusBadge,
  PlatformRoleBadge,
  UserStatusBadge,
} from "@/components/admin/status-badges";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/session";
import {
  banUserAction,
  impersonateUserAction,
  revokeUserSessionAction,
  revokeUserSessionsAction,
  setUserRoleAction,
  unbanUserAction,
} from "../../actions";

export const metadata: Metadata = { title: "User · Admin" };

const BAN_DURATIONS = [
  { value: "", label: "Permanently" },
  { value: "1d", label: "For 1 day" },
  { value: "7d", label: "For 7 days" },
  { value: "30d", label: "For 30 days" },
];

function Detail(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{props.label}</dt>
      <dd className="text-sm">{props.children}</dd>
    </div>
  );
}

export default async function AdminUserPage({ params }: PageProps<"/admin/users/[userId]">) {
  // Every admin page checks itself: Next renders the layout and the page in parallel, so the
  // layout's check alone would not keep this page's data out of the response.
  const { actor } = await requirePlatformAdmin();
  const { userId } = await params;
  const user = await getUserForAdmin(userId);
  if (!user) notFound();
  const [memberships, sessions, { events }] = await Promise.all([
    listUserMembershipsForAdmin(user.id),
    listUserSessionsForAdmin(user.id),
    listAdminAuditEvents({ target: { type: "user", id: user.id }, limit: 25 }),
  ]);
  const isSelf = user.id === actor.userId;
  const isAdmin = (user.role ?? "").split(",").some((role) => role.trim() === "admin");
  const ownedOrganizations = memberships.filter((m) => m.role.split(",").includes("owner"));
  const fields = { userId: user.id };

  return (
    <>
      <PageHeader
        description={user.email}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {user.name}
            <PlatformRoleBadge role={user.role} />
            <UserStatusBadge banned={user.banned} />
          </span>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardPanel>
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Detail label="User id">
              <code className="text-xs">{user.id}</code>
            </Detail>
            <Detail label="Created">{formatDateTime(user.createdAt)}</Detail>
            <Detail label="Email">
              {user.emailVerified ? "Verified" : <Badge variant="warning">unverified</Badge>}
            </Detail>
            <Detail label="Active sessions">{sessions.length}</Detail>
            {user.banned ? (
              <>
                <Detail label="Ban reason">{user.banReason ?? "—"}</Detail>
                <Detail label="Ban expires">
                  {user.banExpires ? formatDateTime(user.banExpires) : "Never"}
                </Detail>
              </>
            ) : null}
          </dl>
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Controls</CardTitle>
          <CardDescription>
            {isSelf
              ? "This is your account. Another admin has to change it."
              : "Every action asks for a reason and is recorded in the audit log."}
          </CardDescription>
        </CardHeader>
        {isSelf ? null : (
          <CardPanel className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {user.banned ? (
                <AdminActionDialog
                  action={unbanUserAction}
                  description={`${user.email} will be able to sign in again.`}
                  fields={fields}
                  reason="optional"
                  submitLabel="Unban"
                  title="Unban this user?"
                  triggerLabel="Unban"
                />
              ) : (
                <AdminActionDialog
                  action={banUserAction}
                  description={`${user.email} is signed out everywhere and can't sign in. Their organizations' API keys keep working; suspend an organization to stop those.`}
                  destructive
                  fields={fields}
                  reason="required"
                  reasonPlaceholder="e.g. Spam complaints from …"
                  submitLabel="Ban user"
                  title="Ban this user?"
                  triggerLabel="Ban"
                >
                  <Field>
                    <FieldLabel>Duration</FieldLabel>
                    <Select defaultValue="" items={BAN_DURATIONS} name="duration">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {BAN_DURATIONS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </Field>
                </AdminActionDialog>
              )}
              <AdminActionDialog
                action={setUserRoleAction}
                description={
                  isAdmin
                    ? `${user.email} loses access to this console.`
                    : `${user.email} gets full access to this console: every user and organization.`
                }
                destructive={!isAdmin}
                fields={{ ...fields, role: isAdmin ? "user" : "admin" }}
                reason="optional"
                submitLabel={isAdmin ? "Remove admin" : "Make admin"}
                title={isAdmin ? "Remove platform admin?" : "Make platform admin?"}
                triggerLabel={isAdmin ? "Remove admin" : "Make admin"}
              />
              <AdminActionDialog
                action={impersonateUserAction}
                description={`You'll browse the dashboard as ${user.email} for up to an hour. You can't create live API keys while impersonating.`}
                disabled={user.banned || isAdmin}
                fields={fields}
                reason="required"
                reasonPlaceholder="e.g. Support ticket #1234"
                submitLabel="Impersonate"
                title="Impersonate this user?"
                triggerLabel="Impersonate"
              />
              <AdminActionDialog
                action={revokeUserSessionsAction}
                description={`Signs ${user.email} out on every device.`}
                disabled={sessions.length === 0}
                fields={fields}
                reason="optional"
                submitLabel="Sign out everywhere"
                title="Revoke every session?"
                triggerLabel="Revoke all sessions"
              />
            </div>
            {user.banned && ownedOrganizations.length > 0 ? (
              <p className="text-muted-foreground text-sm">
                This user owns {ownedOrganizations.length} organization
                {ownedOrganizations.length === 1 ? "" : "s"}. A ban doesn't stop their API keys:
                open one below to suspend it if it should stop sending.
              </p>
            ) : null}
            {isAdmin ? (
              <p className="text-muted-foreground text-sm">
                Admins can't be impersonated; remove the admin role first.
              </p>
            ) : null}
          </CardPanel>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
        </CardHeader>
        <CardPanel className="p-2">
          {memberships.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">Not a member of any organization.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.map((membership) => (
                  <TableRow key={membership.memberId}>
                    <TableCell className="font-medium">
                      <Link
                        className="hover:underline"
                        href={`/admin/organizations/${membership.organization.id}`}
                      >
                        {membership.organization.name}
                      </Link>{" "}
                      <span className="text-muted-foreground">/{membership.organization.slug}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{membership.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <OrganizationStatusBadge suspended={membership.suspended} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(membership.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
        </CardHeader>
        <CardPanel className="p-2">
          {sessions.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">No active sessions.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>IP address</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(session.createdAt)}
                      {session.impersonatedBy ? (
                        <Badge className="ms-2" variant="warning">
                          impersonation
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(session.expiresAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {session.ipAddress ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-72 truncate text-muted-foreground">
                      {session.userAgent ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {isSelf ? null : (
                        <AdminActionDialog
                          action={revokeUserSessionAction}
                          description="Signs this device out."
                          fields={{ ...fields, sessionId: session.id }}
                          reason="optional"
                          submitLabel="Revoke session"
                          title="Revoke this session?"
                          triggerLabel="Revoke"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin activity</CardTitle>
          <CardDescription>Admin actions taken on this user, newest first.</CardDescription>
        </CardHeader>
        <CardPanel className="p-2">
          <AuditLogTable events={events} />
        </CardPanel>
      </Card>
    </>
  );
}
