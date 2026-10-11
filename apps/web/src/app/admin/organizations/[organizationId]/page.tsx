import { getEmailTenant, listDomains } from "@coss/email";
import { listOrganizationMembers } from "@coss/tenancy";
import {
  getOrganizationForAdmin,
  getOrganizationSsoForAdmin,
  listAdminAuditEvents,
  listOrganizationApiKeysForAdmin,
} from "@coss/tenancy/admin";
import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import { Badge } from "@coss/ui/components/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@coss/ui/components/card";
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
import { OrganizationStatusBadge } from "@/components/admin/status-badges";
import { DomainStatusBadge } from "@/components/domain-badges";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/session";
import {
  disableOrganizationSsoAction,
  disableOrganizationSsoRequirementAction,
  revokeApiKeyAction,
  suspendOrganizationAction,
  unsuspendOrganizationAction,
} from "../../actions";

export const metadata: Metadata = { title: "Organization · Admin" };

export default async function AdminOrganizationPage({
  params,
}: PageProps<"/admin/organizations/[organizationId]">) {
  await requirePlatformAdmin();
  const { organizationId } = await params;
  const detail = await getOrganizationForAdmin(organizationId);
  if (!detail) notFound();
  const { organization, suspension } = detail;
  const [members, keys, domains, tenant, sso, { events }] = await Promise.all([
    listOrganizationMembers({ organizationId: organization.id }),
    listOrganizationApiKeysForAdmin(organization.id),
    listDomains({ organizationId: organization.id }),
    getEmailTenant(organization.id),
    getOrganizationSsoForAdmin(organization.id),
    listAdminAuditEvents({ organizationId: organization.id, limit: 25 }),
  ]);
  const fields = { organizationId: organization.id };

  return (
    <>
      <PageHeader
        actions={
          <Link
            className="text-sm underline"
            href={`/admin/organizations/${organizationId}/reputation`}
          >
            Sending reputation
          </Link>
        }
        description={
          <>
            /{organization.slug} · <code className="text-xs">{organization.id}</code> · created{" "}
            {formatDateTime(organization.createdAt)}
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-2">
            {organization.name}
            <OrganizationStatusBadge suspended={suspension !== null} />
          </span>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Suspension</CardTitle>
          <CardDescription>
            A suspended organization's API keys are refused with 403 organization_suspended, its
            webhook deliveries are held (they resume when lifted), and its dashboard is read-only.
            Members see that it is suspended, never the reason.
          </CardDescription>
          <CardAction>
            {suspension ? (
              <AdminActionDialog
                action={unsuspendOrganizationAction}
                description="API keys work again immediately and held webhook deliveries resume."
                fields={fields}
                reason="optional"
                submitLabel="Lift suspension"
                title={`Lift the suspension of ${organization.name}?`}
                triggerLabel="Lift suspension"
              />
            ) : (
              <AdminActionDialog
                action={suspendOrganizationAction}
                description="Its API keys stop working immediately, webhook deliveries are held, and members can only view the dashboard."
                destructive
                fields={fields}
                reason="required"
                reasonPlaceholder="e.g. Phishing reported by …"
                submitLabel="Suspend organization"
                title={`Suspend ${organization.name}?`}
                triggerLabel="Suspend"
              />
            )}
          </CardAction>
        </CardHeader>
        {suspension ? (
          <CardPanel>
            <Alert variant="error">
              <AlertTitle>Suspended {formatDateTime(suspension.createdAt)}</AlertTitle>
              <AlertDescription>
                <p>{suspension.reason}</p>
                <p>
                  By{" "}
                  {suspension.suspendedByUserId ? (
                    <Link
                      className="underline"
                      href={`/admin/users/${suspension.suspendedByUserId}`}
                    >
                      {suspension.suspendedByEmail ?? suspension.suspendedByUserId}
                    </Link>
                  ) : (
                    "a removed admin"
                  )}
                </p>
              </AlertDescription>
            </Alert>
          </CardPanel>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Single sign-on
            {sso?.requireSso ? <Badge variant="outline">required</Badge> : null}
          </CardTitle>
          <CardDescription>
            {sso
              ? `${sso.type === "saml" ? "SAML" : "OIDC"} provider ${sso.providerId} for ${sso.domains}: ${sso.domainVerified ? "enabled" : "disabled"}. When members are locked out because the identity provider broke, turn the requirement off; disable the provider if it is compromised. Owners can always sign in with their password.`
              : "No SSO provider."}
          </CardDescription>
          {sso ? (
            <CardAction className="flex flex-wrap gap-2">
              {sso.requireSso ? (
                <AdminActionDialog
                  action={disableOrganizationSsoRequirementAction}
                  description="Members can open the organization with any sign-in method again. SSO keeps working for those who can use it; the organization's owners can require it again."
                  fields={fields}
                  reason="required"
                  reasonPlaceholder="e.g. IdP outage, ticket #1234"
                  submitLabel="Stop requiring SSO"
                  title={`Stop requiring SSO for ${organization.name}?`}
                  triggerLabel="Stop requiring SSO"
                />
              ) : null}
              {sso.domainVerified ? (
                <AdminActionDialog
                  action={disableOrganizationSsoAction}
                  description="Nobody can sign in through this provider, and the SSO requirement is turned off. Its configuration is kept: saving it again in the organization's settings turns it back on."
                  destructive
                  fields={fields}
                  reason="required"
                  reasonPlaceholder="e.g. IdP compromised, reported in ticket #1234"
                  submitLabel="Disable SSO"
                  title={`Disable SSO for ${organization.name}?`}
                  triggerLabel="Disable SSO"
                />
              ) : null}
            </CardAction>
          ) : null}
        </CardHeader>
      </Card>

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    <Link className="hover:underline" href={`/admin/users/${member.user.id}`}>
                      {member.user.name}
                    </Link>
                  </TableCell>
                  <TableCell>{member.user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{member.role}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(member.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
          <CardDescription>
            Revoke a single key (e.g. one that leaked) without suspending the organization.
          </CardDescription>
        </CardHeader>
        <CardPanel className="p-2">
          {keys.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">No API keys.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Project / environment</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name ?? "—"}</TableCell>
                    <TableCell>
                      <code className="text-xs">{key.start ? `${key.start}…` : "—"}</code>
                    </TableCell>
                    <TableCell>
                      {key.project.name} / {key.environment.name}{" "}
                      <Badge variant={key.environment.mode === "live" ? "info" : "outline"}>
                        {key.environment.mode}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(key.lastRequest)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(key.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <AdminActionDialog
                        action={revokeApiKeyAction}
                        description="Requests using this key are rejected immediately. This can't be undone; the organization can create a new key."
                        destructive
                        fields={{ ...fields, keyId: key.id }}
                        reason="required"
                        reasonPlaceholder="e.g. Key published on GitHub"
                        submitLabel="Revoke key"
                        title={`Revoke “${key.name ?? key.start ?? key.id}”?`}
                        triggerLabel="Revoke"
                      />
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
          <CardTitle>Email</CardTitle>
          <CardDescription>
            Provider tenant:{" "}
            {tenant ? (
              <>
                <code className="text-xs">{tenant.tenantName}</code> ({tenant.provider}), sending{" "}
                {tenant.sendingStatus}
                {tenant.statusCause ? ` — ${tenant.statusCause}` : ""}
              </>
            ) : (
              "none yet (created with the first domain)"
            )}
          </CardDescription>
        </CardHeader>
        <CardPanel className="p-2">
          {domains.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">No domains.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">{domain.name}</TableCell>
                    <TableCell>
                      <DomainStatusBadge status={domain.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(domain.createdAt)}
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
          <CardDescription>Admin actions on this organization and its keys.</CardDescription>
        </CardHeader>
        <CardPanel className="p-2">
          <AuditLogTable events={events} />
        </CardPanel>
      </Card>
    </>
  );
}
