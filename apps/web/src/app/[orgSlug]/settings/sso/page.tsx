import { ssoProviderIdFor } from "@coss/auth/sso";
import { listDomains } from "@coss/email";
import {
  getOrganizationSsoProvider,
  listOrganizationMembers,
  listOwnersWithoutPassword,
  listSsoLinkedMemberIds,
  userHasPassword,
} from "@coss/tenancy";
import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import { Badge } from "@coss/ui/components/badge";
import { CircleCheckIcon, CircleIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CopyValue } from "@/components/copy-value";
import { SettingsNote, SettingsPage, SettingsRow, SettingsSection } from "@/components/settings";
import { StatusDot } from "@/components/status-dot";
import { env } from "@/env";
import { planHas } from "@/lib/billing";
import { requireOrgMember } from "@/lib/session";
import { ssoUrls } from "@/lib/sso";
import { DeleteSsoProviderButton, SsoProviderForm, SsoRequirementRow } from "./sso-forms";

export const metadata: Metadata = { title: "Single sign-on" };

function SetupValue({ label, value }: { label: string; value: string }) {
  return (
    <SettingsRow label={label} stacked>
      <CopyValue value={value} />
    </SettingsRow>
  );
}

/** One precondition of requiring SSO: a check once it holds, an open circle until then. */
function Requirement({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      {done ? (
        <CircleCheckIcon aria-label="Done" className="mt-0.5 size-4 shrink-0 text-success" />
      ) : (
        <CircleIcon
          aria-label="To do"
          className="mt-0.5 size-4 shrink-0 text-muted-foreground/64"
        />
      )}
      <span className={done ? "text-muted-foreground" : "text-foreground"}>{children}</span>
    </li>
  );
}

export default async function SingleSignOnPage({ params }: PageProps<"/[orgSlug]/settings/sso">) {
  const { orgSlug } = await params;
  const { organization, can, session, viaSso } = await requireOrgMember(orgSlug);
  if (!can({ sso: ["read"] })) notFound();
  const canUpdate = can({ sso: ["update"] });
  const canRequire = can({ sso: ["require"] });

  const [provider, domains, members] = await Promise.all([
    getOrganizationSsoProvider({ organizationId: organization.id }),
    listDomains({ organizationId: organization.id }),
    listOrganizationMembers({ organizationId: organization.id }),
  ]);
  const providerId = provider?.providerId ?? ssoProviderIdFor(organization.id);
  const urls = ssoUrls(env.BETTER_AUTH_URL, providerId);
  const verifiedDomains = domains.filter((row) => row.status === "verified").map((row) => row.name);
  const domainOptions = [...new Set([...verifiedDomains, ...(provider?.domains ?? [])])].sort();
  const [linked, ownersWithoutPassword, hasPassword] = await Promise.all([
    provider
      ? listSsoLinkedMemberIds({ organizationId: organization.id, providerId })
      : new Set<string>(),
    canRequire ? listOwnersWithoutPassword({ organizationId: organization.id }) : [],
    canRequire ? userHasPassword({ userId: session.user.id }) : false,
  ]);
  const type = provider?.type;

  return (
    <SettingsPage>
      {provider && !provider.active ? (
        <Alert variant="warning">
          <AlertTitle>SSO is not active</AlertTitle>
          <AlertDescription>
            {provider.unverifiedDomains.length > 0
              ? `${provider.unverifiedDomains.join(", ")} ${provider.unverifiedDomains.length === 1 ? "is" : "are"} no longer verified. Verify ${provider.unverifiedDomains.length === 1 ? "it" : "them"} again under Domains, or remove ${provider.unverifiedDomains.length === 1 ? "it" : "them"} from the provider and save.`
              : "COSS support disabled this provider. Check its configuration and save it to turn it back on."}
            {organization.requireSso
              ? " Members can't open this organization until it works again; owners still can."
              : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <SettingsSection
        action={
          provider ? (
            <Badge variant="outline">
              <StatusDot tone={provider.active ? "success" : "warning"}>
                {provider.active ? "Active" : "Inactive"}
              </StatusDot>
            </Badge>
          ) : null
        }
        description={
          provider
            ? `${type === "saml" ? "SAML 2.0" : "OpenID Connect"} · ${provider.domains.join(", ")} · ${linked.size} of ${members.length} member${members.length === 1 ? "" : "s"} signed in with SSO so far.`
            : "Let members sign in through Okta, Microsoft Entra ID, Google Workspace or any OpenID Connect or SAML 2.0 provider. People at your verified domains join as members the first time they sign in."
        }
        title="Identity provider"
      >
        {!provider && !(await planHas(organization.id, "sso")) ? (
          <SettingsNote>
            Single sign-on is part of the Scale plan.{" "}
            <Link
              className="text-foreground underline underline-offset-4"
              href={`/${organization.slug}/settings/billing/plans`}
            >
              Compare plans
            </Link>
          </SettingsNote>
        ) : null}
        {canUpdate ? (
          <SsoProviderForm
            current={
              provider
                ? {
                    type: provider.type,
                    domains: provider.domains,
                    oidc: provider.oidc
                      ? { issuer: provider.issuer, clientId: provider.oidc.clientId }
                      : null,
                    saml: provider.saml,
                  }
                : null
            }
            domainOptions={domainOptions}
            orgSlug={organization.slug}
          />
        ) : (
          <SettingsNote>Only owners and admins can change the identity provider.</SettingsNote>
        )}
      </SettingsSection>

      {canUpdate ? (
        <SettingsSection
          description="Create an application in your identity provider with these values."
          title="Values for your identity provider"
        >
          {type !== "saml" ? (
            <SetupValue label="OpenID Connect redirect URI" value={urls.oidcRedirectUri} />
          ) : null}
          {type !== "oidc" ? (
            <>
              <SetupValue label="SAML ACS URL" value={urls.samlAcsUrl} />
              <SetupValue label="SAML entity ID (audience)" value={urls.samlEntityId} />
              {provider ? (
                <SetupValue label="SAML metadata URL" value={urls.samlMetadataUrl} />
              ) : null}
            </>
          ) : null}
        </SettingsSection>
      ) : null}

      <SettingsSection
        action={
          organization.requireSso ? (
            <Badge variant="outline">
              <StatusDot tone="success">Required</StatusDot>
            </Badge>
          ) : null
        }
        description="SSO sign-ins also satisfy the organization's two-factor requirement: your identity provider is responsible for multi-factor authentication."
        title="Require SSO"
      >
        {canRequire ? (
          <>
            <SsoRequirementRow
              canRequire={Boolean(provider?.active) && viaSso && hasPassword}
              description={
                organization.requireSso
                  ? "Members and admins must sign in with SSO to open this organization. Owners can still use their password in an emergency."
                  : "Make SSO the only way members and admins can open this organization. Owners keep password access in case the identity provider fails."
              }
              orgSlug={organization.slug}
              required={organization.requireSso}
            />
            {!organization.requireSso ? (
              <SettingsNote>
                <p className="mb-2.5">Before you can require it:</p>
                <ul className="flex flex-col gap-2">
                  <Requirement done={Boolean(provider?.active)}>
                    Set up an active identity provider.
                  </Requirement>
                  <Requirement done={viaSso}>
                    Sign in with SSO yourself.{" "}
                    {viaSso ? null : (
                      <Link
                        className="underline underline-offset-4"
                        href={`/sso?org=${organization.slug}`}
                      >
                        Sign in now
                      </Link>
                    )}
                  </Requirement>
                  <Requirement done={hasPassword}>
                    Have a password on your account, for break-glass access (use “Forgot password”
                    on the sign-in page to set one).
                  </Requirement>
                </ul>
              </SettingsNote>
            ) : null}
            {ownersWithoutPassword.length > 0 ? (
              <SettingsNote>
                Without a password, these owners have no break-glass access:{" "}
                {ownersWithoutPassword.map((owner) => owner.email).join(", ")}.
              </SettingsNote>
            ) : null}
          </>
        ) : (
          <SettingsRow
            description="Only owners can change this."
            label="Require SSO for members and admins"
          >
            <span className="text-muted-foreground">
              {organization.requireSso ? "Required" : "Not required"}
            </span>
          </SettingsRow>
        )}
      </SettingsSection>

      {canUpdate && provider ? (
        <SettingsSection title="Remove provider" tone="danger">
          <SettingsRow
            description="Turns SSO off, deletes every account's link to it and signs out everyone who signed in with it."
            label="Remove the SSO provider"
          >
            <DeleteSsoProviderButton orgSlug={organization.slug} />
          </SettingsRow>
        </SettingsSection>
      ) : null}
    </SettingsPage>
  );
}
