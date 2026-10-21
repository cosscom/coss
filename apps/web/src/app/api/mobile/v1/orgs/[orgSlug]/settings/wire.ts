import type { ScimSettingsResponse, SsoSettingsResponse } from "@coss/companion";
import type {
  OrganizationScim,
  OrganizationSsoProvider,
  ScimEvent,
  ScimGroupRole,
} from "@coss/tenancy";

/** The provider as the app shows it: names and URLs only, never a secret or certificate. */
export function toMobileSsoProvider(
  provider: OrganizationSsoProvider,
  linkedMembers: number,
): NonNullable<SsoSettingsResponse["provider"]> {
  return {
    type: provider.type,
    domains: provider.domains,
    unverified_domains: provider.unverifiedDomains,
    active: provider.active,
    oidc: provider.oidc ? { issuer: provider.issuer, client_id: provider.oidc.clientId } : null,
    saml: provider.saml
      ? { sso_url: provider.saml.entryPoint, idp_entity_id: provider.saml.idpEntityId }
      : null,
    linked_members: linkedMembers,
  };
}

/** The values the dashboard lists for the identity provider, by protocol (`settings/sso/page.tsx`). */
export function toMobileSsoSetup(
  urls: {
    oidcRedirectUri: string;
    samlAcsUrl: string;
    samlEntityId: string;
    samlMetadataUrl: string;
  },
  provider: OrganizationSsoProvider | null,
): NonNullable<SsoSettingsResponse["setup"]> {
  const type = provider?.type;
  return {
    oidc_redirect_uri: type !== "saml" ? urls.oidcRedirectUri : null,
    saml_acs_url: type !== "oidc" ? urls.samlAcsUrl : null,
    saml_entity_id: type !== "oidc" ? urls.samlEntityId : null,
    saml_metadata_url: type !== "oidc" && provider ? urls.samlMetadataUrl : null,
  };
}

// apps/web/src/app/[orgSlug]/settings/scim/page.tsx
const SCIM_EVENT_LABELS: Record<string, string> = {
  "connection.created": "Connected the directory",
  "credential.issued": "Created a token",
  "credential.rotated": "Created a token",
  "credential.revoked": "Revoked a token",
  "connection.decommissioning": "Started disconnecting the directory",
  "connection.decommissioned": "Disconnected the directory",
};

/** The connection without its tokens: counts and the latest token use. */
export function toMobileScimDirectory(
  scim: OrganizationScim,
): NonNullable<ScimSettingsResponse["directory"]> {
  const lastUsed = scim.credentials
    .map((credential) => credential.lastUsedAt?.getTime() ?? 0)
    .reduce((latest, time) => Math.max(latest, time), 0);
  return {
    status: scim.status,
    connected_at: scim.createdAt.toISOString(),
    active_users: scim.activeUsers,
    inactive_users: scim.inactiveUsers,
    groups: scim.groups,
    last_sync_at: lastUsed > 0 ? new Date(lastUsed).toISOString() : null,
    deactivated_owners: scim.deactivatedOwners.map((owner) => owner.email),
  };
}

/** A token's dates and status: never its id or value. */
export function toMobileScimTokens(scim: OrganizationScim): ScimSettingsResponse["tokens"] {
  return scim.credentials.flatMap((credential) =>
    credential.status === "active" || credential.status === "expired"
      ? [
          {
            status: credential.status,
            created_at: credential.createdAt.toISOString(),
            expires_at: credential.expiresAt.toISOString(),
            last_used_at: credential.lastUsedAt?.toISOString() ?? null,
          },
        ]
      : [],
  );
}

export function toMobileScimGroupRole(
  row: ScimGroupRole,
): ScimSettingsResponse["group_roles"][number] {
  return { group: row.groupName, role: row.role };
}

export function toMobileScimEvent(event: ScimEvent): ScimSettingsResponse["events"][number] {
  return {
    id: event.sequence,
    label: SCIM_EVENT_LABELS[event.type] ?? event.type,
    actor: event.actorEmail ?? "coss.com support",
    created_at: event.createdAt.toISOString(),
  };
}
