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
import { RetentionPolicySection } from "@/components/retention-policy";
import { SettingsPage, SettingsRow, SettingsSection } from "@/components/settings";
import { StatusDot } from "@/components/status-dot";
import { requireOrgMember } from "@/lib/session";
import { UpgradeApiVersionButton } from "./api-version-form";
import { DeleteOrganizationButton } from "./delete-organization-button";
import { LeaveOrganizationButton } from "./leave-organization-button";
import { OrganizationForm } from "./organization-form";
import { TwoFactorRequirementRow } from "./two-factor-requirement";

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
    <SettingsPage>
      <SettingsSection
        description={canUpdate ? undefined : "Only owners and admins can change these."}
        title="General"
      >
        <OrganizationForm
          disabled={!canUpdate}
          name={organization.name}
          orgSlug={organization.slug}
        />
      </SettingsSection>

      <SettingsSection title="Security">
        <TwoFactorRequirementRow
          canRequire={hasTwoFactor}
          description={
            <>
              Members who sign in with a password must use an authenticator app. Signing in through
              this organization's SSO counts instead.{" "}
              {!organization.requireTwoFactor && !hasTwoFactor && canUpdate ? (
                <>
                  <Link
                    className="text-foreground underline underline-offset-4"
                    href="/settings/security"
                  >
                    Set it up for your own account
                  </Link>{" "}
                  before requiring it.
                </>
              ) : withoutTwoFactor > 0 ? (
                `${withoutTwoFactor} of ${members.length} member${members.length === 1 ? " doesn't" : "s don't"} have it yet.`
              ) : (
                "Every member has it set up."
              )}
            </>
          }
          disabled={!canUpdate}
          orgSlug={organization.slug}
          required={organization.requireTwoFactor}
        />
        {canReadSso ? (
          <SettingsRow
            description="Let members sign in through your identity provider with OpenID Connect or SAML."
            label="Single sign-on"
          >
            <StatusDot
              className="text-muted-foreground"
              tone={organization.requireSso ? "success" : "neutral"}
            >
              {organization.requireSso ? "Required" : "Optional"}
            </StatusDot>
            <Button
              render={<Link href={`/${organization.slug}/settings/sso`} />}
              size="sm"
              variant="outline"
            >
              Configure
            </Button>
          </SettingsRow>
        ) : null}
        {canReadScim ? (
          <SettingsRow
            description="Let your identity provider add and remove members over SCIM, and make admins from its groups."
            label="Directory sync"
          >
            <StatusDot
              className="text-muted-foreground"
              tone={scimConnected ? "success" : "neutral"}
            >
              {scimConnected ? "Connected" : "Not connected"}
            </StatusDot>
            <Button
              render={<Link href={`/${organization.slug}/settings/scim`} />}
              size="sm"
              variant="outline"
            >
              Configure
            </Button>
          </SettingsRow>
        ) : null}
      </SettingsSection>

      <SettingsSection title="API">
        <SettingsRow
          description={
            <>
              Requests without a <code className="font-mono text-[0.8125rem]">Coss-Version</code>{" "}
              header use this version. The SDK sends the version it was built for.
              {pinnedApiVersion === null ? " It is set on your first API request." : null}
            </>
          }
          label="API version"
        >
          <code className="font-mono text-[0.8125rem]">
            {pinnedApiVersion ?? versioning.latest}
          </code>
          {pinnedApiVersion === null || pinnedApiVersion === versioning.latest ? (
            <Badge variant="outline">
              <StatusDot tone="success">Latest</StatusDot>
            </Badge>
          ) : canUpdate ? (
            <UpgradeApiVersionButton
              changes={apiVersionChanges}
              latest={versioning.latest}
              orgSlug={organization.slug}
            />
          ) : null}
        </SettingsRow>
        <SettingsRow description="Include it when you contact support." label="Organization ID">
          <CopyValue value={organization.id} />
        </SettingsRow>
      </SettingsSection>

      <RetentionPolicySection />

      <SettingsSection title="Danger zone" tone="danger">
        <SettingsRow
          description={
            lastOwner
              ? "You're the only owner. Make another member an owner before you leave."
              : "Remove yourself from this organization. Someone will have to invite you back."
          }
          label="Leave organization"
        >
          {lastOwner || suspended ? null : (
            <LeaveOrganizationButton orgName={organization.name} orgSlug={organization.slug} />
          )}
        </SettingsRow>
        {isOwner ? (
          <SettingsRow
            description={
              suspended
                ? "A suspended organization can't be deleted. Contact support."
                : "Permanently delete its projects, emails, domains, suppression lists and webhooks. Members lose access and API keys stop working at once."
            }
            label="Delete organization"
          >
            {canDelete ? (
              <DeleteOrganizationButton orgName={organization.name} orgSlug={organization.slug} />
            ) : null}
          </SettingsRow>
        ) : null}
      </SettingsSection>
    </SettingsPage>
  );
}
