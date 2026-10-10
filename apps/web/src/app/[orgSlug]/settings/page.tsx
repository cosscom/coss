import { listOrganizationMembers } from "@coss/tenancy";
import { Badge } from "@coss/ui/components/badge";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/page-header";
import { requireOrgMember } from "@/lib/session";
import { LeaveOrganizationButton } from "./leave-organization-button";
import { OrganizationForm } from "./organization-form";
import { TwoFactorRequirementForm } from "./two-factor-requirement";

export const metadata: Metadata = { title: "Organization settings" };

export default async function OrganizationSettingsPage({
  params,
}: PageProps<"/[orgSlug]/settings">) {
  const { orgSlug } = await params;
  const { organization, member, can, suspended, session } = await requireOrgMember(orgSlug);
  const canUpdate = can({ organization: ["update"] });
  const members = await listOrganizationMembers({ organizationId: organization.id });
  const isOwner = member.role.split(",").includes("owner");
  const owners = members.filter((row) => row.role.split(",").includes("owner")).length;
  // Mirrors Better Auth, which refuses to let the last owner leave.
  const lastOwner = isOwner && owners <= 1;
  const withoutTwoFactor = members.filter((row) => !row.user.twoFactorEnabled).length;
  const hasTwoFactor = Boolean(session.user.twoFactorEnabled);

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
          <CardTitle className="flex items-center gap-2">
            Two-factor authentication
            {organization.requireTwoFactor ? <Badge variant="success">Required</Badge> : null}
          </CardTitle>
          <CardDescription>
            {organization.requireTwoFactor
              ? "Members must use an authenticator app to sign in with a password. Anyone without one is asked to set it up before they can open this organization."
              : "Require every member to use an authenticator app when signing in with a password. Members without one are asked to set it up on their next visit."}{" "}
            {withoutTwoFactor > 0
              ? `${withoutTwoFactor} of ${members.length} member${members.length === 1 ? " doesn't" : "s don't"} have it yet.`
              : "Every member has it set up."}
          </CardDescription>
        </CardHeader>
        {canUpdate ? (
          <CardPanel className="flex flex-col gap-3">
            {!organization.requireTwoFactor && !hasTwoFactor ? (
              <p className="text-muted-foreground text-sm">
                <Link className="text-foreground underline" href="/settings">
                  Set up two-factor authentication
                </Link>{" "}
                for your own account before requiring it.
              </p>
            ) : null}
            <TwoFactorRequirementForm
              canRequire={hasTwoFactor}
              orgSlug={organization.slug}
              required={organization.requireTwoFactor}
            />
          </CardPanel>
        ) : null}
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
        {lastOwner || suspended ? null : (
          <CardPanel>
            <LeaveOrganizationButton orgName={organization.name} orgSlug={organization.slug} />
          </CardPanel>
        )}
      </Card>
    </div>
  );
}
