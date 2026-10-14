import {
  hasScimConnection,
  listOrganizationMembers,
  readOrganizationApiVersion,
} from "@coss/tenancy";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { versioning } from "@coss/versioning";
import type { Metadata } from "next";
import Link from "next/link";
import { CopyValue } from "@/components/copy-value";
import { Panel, PanelBody, PanelRow } from "@/components/panel";
import { RetentionPolicyCard } from "@/components/retention-policy";
import { StatusDot } from "@/components/status-dot";
import { requireOrgMember } from "@/lib/session";
import { UpgradeApiVersionButton } from "./api-version-form";
import { DeleteOrganizationButton } from "./delete-organization-button";
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
  const canDelete = can({ organization: ["delete"] });
  const canReadSso = can({ sso: ["read"] });
  const canReadScim = can({ scim: ["read"] });
  const members = await listOrganizationMembers({ organizationId: organization.id });
  const isOwner = member.role.split(",").includes("owner");
  const owners = members.filter((row) => row.role.split(",").includes("owner")).length;
  // Mirrors Better Auth, which refuses to let the last owner leave.
  const lastOwner = isOwner && owners <= 1;
  const withoutTwoFactor = members.filter((row) => !row.user.twoFactorEnabled).length;
  const hasTwoFactor = Boolean(session.user.twoFactorEnabled);
  const [pinnedApiVersion, scimConnected] = await Promise.all([
    readOrganizationApiVersion({ organizationId: organization.id }),
    canReadScim ? hasScimConnection({ organizationId: organization.id }) : false,
  ]);
  const apiVersionChanges = pinnedApiVersion
    ? versioning
        .changesBetween(pinnedApiVersion, versioning.latest)
        .map(({ version, title, description }) => ({ version, title, description }))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <Panel
        description={
          canUpdate
            ? "The organization's name and the first segment of every dashboard URL."
            : "Only owners and admins can change these."
        }
        title="General"
      >
        <PanelBody>
          <OrganizationForm
            disabled={!canUpdate}
            name={organization.name}
            orgSlug={organization.slug}
          />
        </PanelBody>
      </Panel>

      <Panel title="Security">
        <PanelBody flush>
          <PanelRow
            description={
              <>
                {organization.requireTwoFactor
                  ? "Members must use an authenticator app to sign in with a password. Anyone without one is asked to set it up before they can open this organization (signing in with this organization's SSO counts instead)."
                  : "Require every member to use an authenticator app when signing in with a password. Members without one are asked to set it up on their next visit (signing in with this organization's SSO counts instead)."}{" "}
                {withoutTwoFactor > 0
                  ? `${withoutTwoFactor} of ${members.length} member${members.length === 1 ? " doesn't" : "s don't"} have it yet.`
                  : "Every member has it set up."}
              </>
            }
            label={
              <span className="flex items-center gap-2">
                Two-factor authentication
                {organization.requireTwoFactor ? (
                  <Badge variant="outline">
                    <StatusDot tone="success">Required</StatusDot>
                  </Badge>
                ) : null}
              </span>
            }
          >
            {canUpdate ? (
              <>
                {!organization.requireTwoFactor && !hasTwoFactor ? (
                  <p className="text-muted-foreground text-sm">
                    <Link
                      className="text-foreground underline underline-offset-4"
                      href="/settings/security"
                    >
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
              </>
            ) : (
              <span className="text-muted-foreground text-sm">
                {organization.requireTwoFactor ? "Required" : "Not required"}
              </span>
            )}
          </PanelRow>
          {canReadSso ? (
            <PanelRow
              description="Let members sign in through your identity provider with OpenID Connect or SAML, and optionally require it."
              label="Single sign-on"
            >
              <div className="flex flex-wrap items-center gap-3">
                <StatusDot tone={organization.requireSso ? "success" : "neutral"}>
                  {organization.requireSso ? "Required" : "Optional"}
                </StatusDot>
                <Button
                  render={<Link href={`/${organization.slug}/settings/sso`} />}
                  size="sm"
                  variant="outline"
                >
                  Configure
                </Button>
              </div>
            </PanelRow>
          ) : null}
          {canReadScim ? (
            <PanelRow
              description="Let your identity provider add and remove members, and set admins from its groups, over SCIM."
              label="Directory sync"
            >
              <div className="flex flex-wrap items-center gap-3">
                <StatusDot tone={scimConnected ? "success" : "neutral"}>
                  {scimConnected ? "Connected" : "Not connected"}
                </StatusDot>
                <Button
                  render={<Link href={`/${organization.slug}/settings/scim`} />}
                  size="sm"
                  variant="outline"
                >
                  Configure
                </Button>
              </div>
            </PanelRow>
          ) : null}
        </PanelBody>
      </Panel>

      <Panel title="API">
        <PanelBody flush>
          <PanelRow
            description={
              <>
                API requests without a <code className="font-mono">Coss-Version</code> header use
                this version. The SDK always sends the version it was built for.{" "}
                {pinnedApiVersion === null
                  ? `It is set to the latest version (${versioning.latest}) on your first API request.`
                  : null}
              </>
            }
            label="API version"
          >
            <div className="flex flex-wrap items-center gap-3">
              <code className="font-mono text-sm">{pinnedApiVersion ?? versioning.latest}</code>
              {pinnedApiVersion === null || pinnedApiVersion === versioning.latest ? (
                <Badge variant="outline">
                  <StatusDot tone="success">Latest</StatusDot>
                </Badge>
              ) : null}
              {canUpdate && pinnedApiVersion !== null && pinnedApiVersion < versioning.latest ? (
                <UpgradeApiVersionButton
                  changes={apiVersionChanges}
                  latest={versioning.latest}
                  orgSlug={organization.slug}
                />
              ) : null}
            </div>
          </PanelRow>
          <PanelRow description="Include it when you contact support." label="Organization ID">
            <CopyValue value={organization.id} />
          </PanelRow>
        </PanelBody>
      </Panel>

      <RetentionPolicyCard />

      <Panel className="border-destructive/24" title="Danger zone">
        <PanelBody flush>
          <PanelRow
            description={
              lastOwner
                ? "You're the only owner. Make another member an owner before you leave."
                : "Remove yourself from this organization."
            }
            label="Leave organization"
          >
            {lastOwner || suspended ? null : (
              <LeaveOrganizationButton orgName={organization.name} orgSlug={organization.slug} />
            )}
          </PanelRow>
          {isOwner ? (
            <PanelRow
              description={
                suspended
                  ? "A suspended organization can't be deleted. Contact support."
                  : "Permanently delete this organization with its projects, emails, domains, suppression lists and webhooks. Members lose access and API keys stop working immediately."
              }
              label="Delete organization"
            >
              {canDelete ? (
                <DeleteOrganizationButton orgName={organization.name} orgSlug={organization.slug} />
              ) : null}
            </PanelRow>
          ) : null}
        </PanelBody>
      </Panel>
    </div>
  );
}
