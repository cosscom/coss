import { orgRoleCan } from "@coss/auth/permissions";
import { listOrganizationMembers } from "@coss/tenancy";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import type { Metadata } from "next";
import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/page-header";
import { requireOrgMember } from "@/lib/session";
import { LeaveOrganizationButton } from "./leave-organization-button";
import { OrganizationForm } from "./organization-form";

export const metadata: Metadata = { title: "Organization settings" };

export default async function OrganizationSettingsPage({
  params,
}: PageProps<"/[orgSlug]/settings">) {
  const { orgSlug } = await params;
  const { organization, member } = await requireOrgMember(orgSlug);
  const canUpdate = orgRoleCan(member.role, { organization: ["update"] });
  const members = await listOrganizationMembers({ organizationId: organization.id });
  const isOwner = member.role.split(",").includes("owner");
  const owners = members.filter((row) => row.role.split(",").includes("owner")).length;
  // Mirrors Better Auth, which refuses to let the last owner leave.
  const lastOwner = isOwner && owners <= 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader description={`Manage ${organization.name}.`} title="Settings" />

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            {canUpdate
              ? "The organization's name and the first segment of every dashboard URL."
              : "Only owners and admins can change these."}
          </CardDescription>
        </CardHeader>
        <CardPanel>
          <OrganizationForm
            disabled={!canUpdate}
            name={organization.name}
            orgSlug={organization.slug}
          />
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization ID</CardTitle>
          <CardDescription>Include it when you contact support.</CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-wrap items-center gap-3">
          <code className="rounded-md bg-muted px-2 py-1 font-mono text-sm">{organization.id}</code>
          <CopyButton value={organization.id} />
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leave organization</CardTitle>
          <CardDescription>
            {lastOwner
              ? "You're the only owner. Make another member an owner before you leave."
              : "Remove yourself from this organization."}
          </CardDescription>
        </CardHeader>
        {lastOwner ? null : (
          <CardPanel>
            <LeaveOrganizationButton orgName={organization.name} orgSlug={organization.slug} />
          </CardPanel>
        )}
      </Card>
    </div>
  );
}
