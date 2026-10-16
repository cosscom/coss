import {
  getOrganizationScim,
  getOrganizationSsoProvider,
  listScimEvents,
  listScimGroupRoles,
  type ScimEvent,
} from "@coss/tenancy";
import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import { Badge } from "@coss/ui/components/badge";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyValue } from "@/components/copy-value";
import { SettingsNote, SettingsPage, SettingsRow, SettingsSection } from "@/components/settings";
import { StatusDot } from "@/components/status-dot";
import { env } from "@/env";
import { planHas } from "@/lib/billing";
import { requireOrgMember } from "@/lib/session";
import {
  CreateScimTokenForm,
  RevokeScimTokenButton,
  ScimConnectionControls,
  ScimGroupRolesForm,
} from "./scim-forms";

export const metadata: Metadata = { title: "Directory sync" };

const EVENT_LABELS: Record<string, string> = {
  "connection.created": "Connected the directory",
  "credential.issued": "Created a token",
  "credential.rotated": "Created a token",
  "credential.revoked": "Revoked a token",
  "connection.decommissioning": "Started disconnecting the directory",
  "connection.decommissioned": "Disconnected the directory",
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

function eventLabel(event: ScimEvent): string {
  return EVENT_LABELS[event.type] ?? event.type;
}

export default async function DirectorySyncPage({ params }: PageProps<"/[orgSlug]/settings/scim">) {
  const { orgSlug } = await params;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ scim: ["read"] })) notFound();
  const canUpdate = can({ scim: ["update"] });

  const [scim, provider, mappings, events] = await Promise.all([
    getOrganizationScim({ organizationId: organization.id }),
    getOrganizationSsoProvider({ organizationId: organization.id }),
    listScimGroupRoles({ organizationId: organization.id }),
    listScimEvents({ organizationId: organization.id }),
  ]);
  const baseUrl = `${env.BETTER_AUTH_URL}/api/auth/scim/v2`;
  const ssoActive = Boolean(provider?.active);
  const activeTokens = scim?.credentials.filter((c) => c.status === "active").length ?? 0;

  const needsPlan = !scim && !(await planHas(organization.id, "scim"));
  const needsSso = !scim && !ssoActive;

  return (
    <SettingsPage>
      {scim?.status === "decommissioning" ? (
        <Alert variant="warning">
          <AlertTitle>Disconnecting</AlertTitle>
          <AlertDescription>
            The directory's tokens no longer work, but some of its users are still being released.
            Continue disconnecting to finish.
          </AlertDescription>
        </Alert>
      ) : null}

      {scim && scim.deactivatedOwners.length > 0 ? (
        <Alert variant="warning">
          <AlertTitle>Owners deactivated in your directory</AlertTitle>
          <AlertDescription>
            Directory sync never changes owners, so{" "}
            {scim.deactivatedOwners.map((owner) => owner.email).join(", ")}{" "}
            {scim.deactivatedOwners.length === 1 ? "is" : "are"} still{" "}
            {scim.deactivatedOwners.length === 1 ? "an owner" : "owners"}. Remove or demote them on
            the Members page if they should no longer have access.
          </AlertDescription>
        </Alert>
      ) : null}

      <SettingsSection
        action={
          scim ? (
            <Badge variant="outline">
              <StatusDot tone={scim.status === "active" ? "success" : "warning"}>
                {scim.status === "active" ? "Connected" : "Disconnecting"}
              </StatusDot>
            </Badge>
          ) : null
        }
        description={
          scim
            ? `Connected ${dateFormat.format(scim.createdAt)} · ${scim.activeUsers} active user${scim.activeUsers === 1 ? "" : "s"}, ${scim.inactiveUsers} deactivated · ${scim.groups} group${scim.groups === 1 ? "" : "s"}.`
            : "Let your identity provider (Okta, Microsoft Entra ID, JumpCloud…) add, update and remove members over SCIM 2.0. Active users become members, or admins through the group roles below; deactivating or deleting one removes them and ends their SSO sessions here. Owners are never changed."
        }
        title="Directory"
      >
        {needsPlan || needsSso ? (
          <SettingsNote>
            <ul className="flex flex-col gap-1.5">
              {needsPlan ? (
                <li>
                  Directory sync is part of the Enterprise plan.{" "}
                  <Link
                    className="text-foreground underline underline-offset-4"
                    href={`/${organization.slug}/settings/billing/plans`}
                  >
                    Compare plans
                  </Link>
                </li>
              ) : null}
              {needsSso ? (
                <li>
                  Set up single sign-on first: people your directory provisions sign in through it,
                  and only addresses on its domains can be provisioned.{" "}
                  <Link
                    className="text-foreground underline underline-offset-4"
                    href={`/${organization.slug}/settings/sso`}
                  >
                    Configure SSO
                  </Link>
                </li>
              ) : null}
            </ul>
          </SettingsNote>
        ) : null}
        {canUpdate ? (
          <ScimConnectionControls
            canConnect={ssoActive}
            orgSlug={organization.slug}
            status={scim?.status ?? "none"}
          />
        ) : scim ? null : (
          <SettingsNote>Only owners and admins can connect a directory.</SettingsNote>
        )}
      </SettingsSection>

      {canUpdate ? (
        <SettingsSection
          description="Users are matched by their primary email address (or userName when they have no email)."
          title="Values for your identity provider"
        >
          <SettingsRow
            description="In your identity provider's SCIM provisioning settings, use this base URL and a bearer token from below."
            label="SCIM base URL"
            stacked
          >
            <CopyValue value={baseUrl} />
          </SettingsRow>
        </SettingsSection>
      ) : null}

      {scim && canUpdate ? (
        <SettingsSection
          description="Up to two tokens work at a time, so you can replace one without a gap: create a new token, update your identity provider, then revoke the old one."
          title="Tokens"
        >
          {scim.credentials.length === 0 ? (
            <SettingsNote>No working token. Create one to resume syncing.</SettingsNote>
          ) : (
            scim.credentials.map((credential) => (
              <SettingsRow
                description={`${credential.status === "expired" ? "Expired" : "Expires"} ${dateFormat.format(credential.expiresAt)} · ${
                  credential.lastUsedAt
                    ? `last used ${dateTimeFormat.format(credential.lastUsedAt)}`
                    : "never used"
                }`}
                key={credential.credentialId}
                label={
                  <>
                    Created {dateFormat.format(credential.createdAt)}
                    {credential.status === "expired" ? (
                      <Badge variant="outline">
                        <StatusDot tone="warning">Expired</StatusDot>
                      </Badge>
                    ) : null}
                  </>
                }
              >
                {credential.status === "active" ? (
                  <RevokeScimTokenButton
                    credentialId={credential.credentialId}
                    orgSlug={organization.slug}
                  />
                ) : null}
              </SettingsRow>
            ))
          )}
          <CreateScimTokenForm
            disabled={scim.status !== "active" || activeTokens >= 2}
            orgSlug={organization.slug}
          />
        </SettingsSection>
      ) : null}

      <SettingsSection
        description="Members of a directory group mapped to admin become admins; everyone else is a member. Group names are matched without regard to case. Saving applies the mappings to every directory user at once."
        title="Group roles"
      >
        <ScimGroupRolesForm disabled={!canUpdate} mappings={mappings} orgSlug={organization.slug} />
      </SettingsSection>

      {scim && events.length > 0 ? (
        <SettingsSection title="Recent activity">
          <ul className="flex flex-col text-sm">
            {events.map((event) => (
              <li
                className="flex flex-wrap items-baseline justify-between gap-2 border-t px-5 py-3"
                key={event.sequence}
              >
                <span>
                  {eventLabel(event)}
                  <span className="text-muted-foreground">
                    {" "}
                    · {event.actorEmail ?? "coss.com support"}
                  </span>
                </span>
                <span className="font-mono text-muted-foreground text-xs">
                  {dateTimeFormat.format(event.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </SettingsSection>
      ) : null}
    </SettingsPage>
  );
}
