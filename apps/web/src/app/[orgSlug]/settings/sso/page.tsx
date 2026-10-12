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
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/page-header";
import { env } from "@/env";
import { planHas } from "@/lib/billing";
import { requireOrgMember } from "@/lib/session";
import { ssoUrls } from "@/lib/sso";
import { DeleteSsoProviderButton, SsoProviderForm, SsoRequirementForm } from "./sso-forms";

export const metadata: Metadata = { title: "Single sign-on" };

function SetupValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1 font-mono text-xs">
          {value}
        </code>
        <CopyButton value={value} />
      </div>
    </div>
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
    <div className="flex flex-col gap-6">
      <PageHeader
        description={
          <>
            Let members sign in through your identity provider (Okta, Microsoft Entra ID, Google
            Workspace…).{" "}
            <Link className="underline" href={`/${organization.slug}/settings`}>
              Back to settings
            </Link>
          </>
        }
        title="Single sign-on"
      />

      {!provider && !(await planHas(organization.id, "sso")) ? (
        <Alert variant="info">
          <AlertTitle>Single sign-on is part of the Scale plan</AlertTitle>
          <AlertDescription>
            Upgrade to set it up.{" "}
            <Link className="underline" href={`/${organization.slug}/settings/billing/plans`}>
              Compare plans
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Identity provider
            {provider ? (
              <Badge variant={provider.active ? "success" : "warning"}>
                {provider.active ? "Active" : "Inactive"}
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            {provider
              ? `${type === "saml" ? "SAML 2.0" : "OpenID Connect"} · ${provider.domains.join(", ")} · ${linked.size} of ${members.length} member${members.length === 1 ? "" : "s"} signed in with SSO so far.`
              : "Domains come from your verified email domains, so there is nothing more to verify. People with an address at those domains join this organization as members the first time they sign in."}
          </CardDescription>
        </CardHeader>
        {canUpdate ? (
          <CardPanel className="flex flex-col gap-6">
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
            {provider ? (
              <div>
                <DeleteSsoProviderButton orgSlug={organization.slug} />
              </div>
            ) : null}
          </CardPanel>
        ) : null}
      </Card>

      {canUpdate ? (
        <Card>
          <CardHeader>
            <CardTitle>Values for your identity provider</CardTitle>
            <CardDescription>
              Create an application in your identity provider with these values. Use OpenID Connect
              or SAML 2.0, whichever your provider supports best.
            </CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col gap-4">
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
          </CardPanel>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Require SSO
            {organization.requireSso ? <Badge variant="success">Required</Badge> : null}
          </CardTitle>
          <CardDescription>
            {organization.requireSso
              ? "Members and admins must sign in with SSO to open this organization. Owners can still use their password in an emergency."
              : "Make SSO the only way members and admins can open this organization. Owners keep password access in case the identity provider fails."}{" "}
            SSO sign-ins also satisfy the organization's two-factor requirement: your identity
            provider is responsible for multi-factor authentication.
          </CardDescription>
        </CardHeader>
        {canRequire ? (
          <CardPanel className="flex flex-col gap-3">
            {!organization.requireSso ? (
              <ul className="list-inside list-disc text-muted-foreground text-sm">
                <li className={provider?.active ? "line-through" : undefined}>
                  Set up an active identity provider.
                </li>
                <li className={viaSso ? "line-through" : undefined}>
                  Sign in with SSO yourself (
                  <Link
                    className="text-foreground underline"
                    href={`/sso?org=${organization.slug}`}
                  >
                    sign in now
                  </Link>
                  ).
                </li>
                <li className={hasPassword ? "line-through" : undefined}>
                  Have a password on your account, for break-glass access (use “Forgot password” on
                  the sign-in page to set one).
                </li>
              </ul>
            ) : null}
            {ownersWithoutPassword.length > 0 ? (
              <p className="text-muted-foreground text-sm">
                Without a password, these owners have no break-glass access:{" "}
                {ownersWithoutPassword.map((owner) => owner.email).join(", ")}.
              </p>
            ) : null}
            <SsoRequirementForm
              canRequire={Boolean(provider?.active) && viaSso && hasPassword}
              orgSlug={organization.slug}
              required={organization.requireSso}
            />
          </CardPanel>
        ) : null}
      </Card>
    </div>
  );
}
