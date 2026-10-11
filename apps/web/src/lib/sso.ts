import "server-only";
import { lookup } from "node:dns/promises";
import { isPublicRoutableHost } from "@better-auth/core/utils/host";
import { DiscoveryError, discoverOIDCConfig } from "@better-auth/sso";
import { ActionError } from "./actions";

/**
 * URLs an organization gives its identity provider. Better Auth serves them under /api/auth on
 * the dashboard origin; the SAML entity ID is the SP metadata URL.
 */
export function ssoUrls(baseUrl: string, providerId: string) {
  const auth = `${baseUrl.replace(/\/+$/, "")}/api/auth`;
  const metadata = `${auth}/sso/saml2/sp/metadata?providerId=${encodeURIComponent(providerId)}`;
  return {
    oidcRedirectUri: `${auth}/sso/callback/${providerId}`,
    samlAcsUrl: `${auth}/sso/saml2/sp/acs/${providerId}`,
    samlEntityId: metadata,
    samlMetadataUrl: metadata,
  };
}

function isPublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && isPublicRoutableHost(url.hostname);
  } catch {
    return false;
  }
}

/** Refuses hosts that resolve to private addresses (best effort, like Better Auth's own check). */
async function assertResolvesPublic(url: string): Promise<void> {
  const { hostname } = new URL(url);
  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new ActionError(`Couldn't resolve ${hostname}.`);
  }
  if (!addresses.every(({ address }) => isPublicRoutableHost(address))) {
    throw new ActionError(`${hostname} isn't reachable on the public internet.`);
  }
}

/**
 * Reads the IdP's OpenID configuration. Better Auth's own discovery only accepts IdPs listed in
 * `trustedOrigins` (which also allows redirects to them); we accept any public HTTPS issuer
 * instead and register the provider with the discovered endpoints (`skipDiscovery`). Better
 * Auth re-checks the token, userinfo and JWKS endpoints before every server-side fetch.
 */
export async function discoverOidcEndpoints(issuer: string) {
  if (!isPublicHttpsUrl(issuer)) {
    throw new ActionError("The issuer must be a public https:// URL.");
  }
  await assertResolvesPublic(issuer);
  try {
    const config = await discoverOIDCConfig({ issuer, isTrustedOrigin: isPublicHttpsUrl });
    return {
      issuer: config.issuer,
      discoveryEndpoint: config.discoveryEndpoint,
      authorizationEndpoint: config.authorizationEndpoint,
      tokenEndpoint: config.tokenEndpoint,
      jwksEndpoint: config.jwksEndpoint,
      userInfoEndpoint: config.userInfoEndpoint,
      tokenEndpointAuthentication: config.tokenEndpointAuthentication,
    };
  } catch (error) {
    if (error instanceof DiscoveryError) {
      throw new ActionError(
        `Couldn't read the identity provider's configuration: ${error.message}`,
      );
    }
    throw error;
  }
}

const SAML_REDIRECT_BINDING = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect";

/**
 * The IdP's single sign-on URL (HTTP-Redirect binding, else the first) from its metadata XML.
 * Better Auth signs in with the metadata itself; its schema still wants the URL as `entryPoint`.
 */
export function samlEntryPointFromMetadata(metadata: string): string | null {
  const services = [...metadata.matchAll(/<(?:\w+:)?SingleSignOnService\b([^>]*)>/g)].map(
    (match) => match[1] ?? "",
  );
  const attribute = (attributes: string, name: string) =>
    new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(attributes)?.[1] ?? null;
  const preferred =
    services.find((attributes) => attribute(attributes, "Binding") === SAML_REDIRECT_BINDING) ??
    services[0];
  const location = preferred ? attribute(preferred, "Location") : null;
  if (!location) return null;
  try {
    return new URL(location).toString();
  } catch {
    return null;
  }
}
