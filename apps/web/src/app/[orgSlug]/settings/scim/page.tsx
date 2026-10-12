import {
  getOrganizationScim,
  getOrganizationSsoProvider,
  listScimEvents,
  listScimGroupRoles,
  type ScimEvent,
} from "@coss/tenancy";
import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import { Badge } from "@coss/ui/components/badge";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/page-header";
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description={
          <>
            Let your identity provider (Okta, Microsoft Entra ID, JumpCloud…) add, update and remove
            members over SCIM 2.0.{" "}
            <Link className="underline" href={`/${organization.slug}/settings`}>
              Back to settings
            </Link>
          </>
        }
        title="Directory sync"
      />

      {!scim && !(await planHas(organization.id, "scim")) ? (
        <Alert variant="info">
          <AlertTitle>Directory sync is part of the Enterprise plan</AlertTitle>
          <AlertDescription>
            Upgrade to set it up.{" "}
            <Link className="underline" href={`/${organization.slug}/settings/billing/plans`}>
              Compare plans
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      {!scim && !ssoActive ? (
        <Alert variant="info">
          <AlertTitle>Set up single sign-on first</AlertTitle>
          <AlertDescription>
            People your directory provisions sign in through your SSO provider, and only addresses
            on its domains can be provisioned.{" "}
            <Link className="underline" href={`/${organization.slug}/settings/sso`}>
              Configure SSO
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Directory
            {scim ? (
              <Badge variant={scim.status === "active" ? "success" : "warning"}>
                {scim.status === "active" ? "Connected" : "Disconnecting"}
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            {scim
              ? `Connected ${dateFormat.format(scim.createdAt)} · ${scim.activeUsers} active user${scim.activeUsers === 1 ? "" : "s"}, ${scim.inactiveUsers} deactivated · ${scim.groups} group${scim.groups === 1 ? "" : "s"}.`
              : "Active directory users become members (or admins, through the group mappings below). Deactivating or deleting a user removes them from this organization and ends their SSO sessions here. While a directory is connected, only its active users can sign in with SSO; owners are never changed."}
          </CardDescription>
        </CardHeader>
        {canUpdate ? (
          <CardPanel className="flex flex-col gap-4">
            <ScimConnectionControls
              canConnect={ssoActive}
              orgSlug={organization.slug}
              status={scim?.status ?? "none"}
            />
          </CardPanel>
        ) : null}
      </Card>

      {canUpdate ? (
        <Card>
          <CardHeader>
            <CardTitle>Values for your identity provider</CardTitle>
            <CardDescription>
              In your identity provider's SCIM provisioning settings, use this base URL and a bearer
              token from below. Users are matched by their primary email address (or userName when
              they have no email).
            </CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col gap-1">
            <span className="font-medium text-sm">SCIM base URL</span>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1 font-mono text-xs">
                {baseUrl}
              </code>
              <CopyButton value={baseUrl} />
            </div>
          </CardPanel>
        </Card>
      ) : null}

      {scim && canUpdate ? (
        <Card>
          <CardHeader>
            <CardTitle>Tokens</CardTitle>
            <CardDescription>
              Up to two tokens work at a time, so you can replace one without a gap: create a new
              token, update your identity provider, then revoke the old one.
            </CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col gap-4">
            {scim.credentials.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No working token. Create one to resume syncing.
              </p>
            ) : (
              <ul className="flex flex-col divide-y rounded-lg border">
                {scim.credentials.map((credential) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
                    key={credential.credentialId}
                  >
                    <div className="flex flex-col gap-0.5 text-sm">
                      <span className="flex items-center gap-2">
                        Created {dateFormat.format(credential.createdAt)}
                        {credential.status === "expired" ? (
                          <Badge variant="warning">Expired</Badge>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {credential.status === "expired" ? "Expired" : "Expires"}{" "}
                        {dateFormat.format(credential.expiresAt)} ·{" "}
                        {credential.lastUsedAt
                          ? `last used ${dateTimeFormat.format(credential.lastUsedAt)}`
                          : "never used"}
                      </span>
                    </div>
                    {credential.status === "active" ? (
                      <RevokeScimTokenButton
                        credentialId={credential.credentialId}
                        orgSlug={organization.slug}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <CreateScimTokenForm
              disabled={scim.status !== "active" || activeTokens >= 2}
              orgSlug={organization.slug}
            />
          </CardPanel>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Group roles</CardTitle>
          <CardDescription>
            Members of a directory group mapped to admin become admins; everyone else is a member.
            Group names are matched without regard to case. Saving applies the mappings to every
            directory user at once.
          </CardDescription>
        </CardHeader>
        <CardPanel>
          <ScimGroupRolesForm
            disabled={!canUpdate}
            mappings={mappings}
            orgSlug={organization.slug}
          />
        </CardPanel>
      </Card>

      {scim && events.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardPanel>
            <ul className="flex flex-col gap-2 text-sm">
              {events.map((event) => (
                <li className="flex flex-wrap justify-between gap-2" key={event.sequence}>
                  <span>
                    {eventLabel(event)}
                    <span className="text-muted-foreground">
                      {" "}
                      · {event.actorEmail ?? "COSS support"}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {dateTimeFormat.format(event.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </CardPanel>
        </Card>
      ) : null}
    </div>
  );
}
