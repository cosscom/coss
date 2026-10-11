"use server";

import { ssoProviderIdFor, unverifiedSsoDomains } from "@coss/auth/sso";
import {
  getOrganizationSsoProvider,
  hasScimConnection,
  type SsoProviderType,
  setOrganizationSsoRequired,
  syncSsoDomainVerification,
  userHasPassword,
} from "@coss/tenancy";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { env } from "@/env";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { requireOrgPermission } from "@/lib/session";
import { discoverOidcEndpoints, httpsUrl, samlConfigFrom } from "@/lib/sso";

function formDomains(formData: FormData): string[] {
  const domains = formData
    .getAll("domains")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(domains)].sort();
}

/**
 * Creates or updates the organization's SSO provider through Better Auth (which re-checks that
 * the actor is an owner or admin), then marks it active when every domain is a verified email
 * domain of the organization. The provider's type can't change: remove it first.
 */
export async function saveSsoProviderAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { organization } = await requireOrgPermission(formString(formData, "orgSlug"), {
      sso: ["update"],
    });
    const type: SsoProviderType = formString(formData, "type") === "saml" ? "saml" : "oidc";
    const domains = formDomains(formData);
    if (domains.length === 0) throw new ActionError("Choose at least one domain.");
    const unverified = await unverifiedSsoDomains(organization.id, domains);
    if (unverified.length > 0) {
      throw new ActionError(
        `${unverified.join(", ")} isn't a verified domain of this organization.`,
      );
    }

    const existing = await getOrganizationSsoProvider({ organizationId: organization.id });
    if (existing && existing.type !== type) {
      throw new ActionError("Remove the current provider before switching protocols.");
    }
    const providerId = existing?.providerId ?? ssoProviderIdFor(organization.id);
    const domain = domains.join(",");
    const requestHeaders = await headers();

    if (type === "oidc") {
      const issuerValue = formString(formData, "oidcIssuer");
      const clientId = formString(formData, "oidcClientId");
      const clientSecret = formString(formData, "oidcClientSecret");
      if (!issuerValue || !clientId) throw new ActionError("Enter the issuer URL and client ID.");
      if (!existing && !clientSecret) throw new ActionError("Enter the client secret.");
      const discovered = await discoverOidcEndpoints(httpsUrl(issuerValue, "The issuer"));
      const oidcConfig = {
        clientId,
        ...(clientSecret ? { clientSecret } : {}),
        discoveryEndpoint: discovered.discoveryEndpoint,
        authorizationEndpoint: discovered.authorizationEndpoint,
        tokenEndpoint: discovered.tokenEndpoint,
        jwksEndpoint: discovered.jwksEndpoint,
        userInfoEndpoint: discovered.userInfoEndpoint,
        tokenEndpointAuthentication:
          discovered.tokenEndpointAuthentication === "client_secret_post"
            ? ("client_secret_post" as const)
            : ("client_secret_basic" as const),
        scopes: ["openid", "email", "profile"],
        pkce: true,
      };
      if (existing) {
        await auth.api.updateSSOProvider({
          headers: requestHeaders,
          body: { providerId, issuer: discovered.issuer, domain, oidcConfig },
        });
      } else {
        await auth.api.registerSSOProvider({
          headers: requestHeaders,
          body: {
            providerId,
            organizationId: organization.id,
            issuer: discovered.issuer,
            domain,
            oidcConfig: { ...oidcConfig, skipDiscovery: true },
          },
        });
      }
    } else {
      const samlConfig = samlConfigFrom(
        formData,
        env.BETTER_AUTH_URL,
        providerId,
        Boolean(existing),
      );
      if (existing) {
        await auth.api.updateSSOProvider({
          headers: requestHeaders,
          body: { providerId, issuer: samlConfig.issuer, domain, samlConfig },
        });
      } else {
        if (!("entryPoint" in samlConfig) || !samlConfig.entryPoint) {
          throw new ActionError("Paste the IdP metadata XML.");
        }
        await auth.api.registerSSOProvider({
          headers: requestHeaders,
          body: {
            providerId,
            organizationId: organization.id,
            issuer: samlConfig.issuer,
            domain,
            samlConfig: { ...samlConfig, entryPoint: samlConfig.entryPoint },
          },
        });
      }
    }

    await syncSsoDomainVerification({ organizationId: organization.id, providerId });
    refresh();
    return null;
  });
}

/**
 * Removes the provider. Better Auth also deletes every account linked to it, so members who only
 * used SSO sign in with "Forgot password" from then on. The SSO requirement is turned off.
 */
export async function deleteSsoProviderAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { organization } = await requireOrgPermission(formString(formData, "orgSlug"), {
      sso: ["update"],
    });
    const existing = await getOrganizationSsoProvider({ organizationId: organization.id });
    if (!existing) throw new ActionError("This organization has no SSO provider.");
    // Directory users sign in only through SSO: disconnect the directory first.
    if (await hasScimConnection({ organizationId: organization.id })) {
      throw new ActionError("Disconnect directory sync before removing the SSO provider.");
    }
    // Turned off first: without a provider, members could never satisfy it.
    await setOrganizationSsoRequired({ organizationId: organization.id, required: false });
    await auth.api.deleteSSOProvider({
      headers: await headers(),
      body: { providerId: existing.providerId },
    });
    refresh();
    return null;
  });
}

/**
 * Turns the SSO requirement on or off (owners only). Turning it on needs a working provider,
 * proven by the actor's own session coming from it, and a password on the actor's account, so
 * owners really have break-glass access if the IdP fails.
 */
export async function setSsoRequirementAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { organization, session, viaSso } = await requireOrgPermission(
      formString(formData, "orgSlug"),
      { sso: ["require"] },
    );
    const required = formString(formData, "required") === "true";
    if (required) {
      const provider = await getOrganizationSsoProvider({ organizationId: organization.id });
      if (!provider?.active) throw new ActionError("Set up an active SSO provider first.");
      if (!viaSso) {
        throw new ActionError("Sign in with SSO yourself first, to check that it works.");
      }
      if (!(await userHasPassword({ userId: session.user.id }))) {
        throw new ActionError(
          "Set a password for your account first (“Forgot password” on the sign-in page): owners use it if the identity provider fails.",
        );
      }
    }
    await setOrganizationSsoRequired({ organizationId: organization.id, required });
    refresh();
    return null;
  });
}
