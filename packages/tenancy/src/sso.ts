/**
 * Organization SSO (Better Auth's SSO plugin owns the `sso_provider` rows and the sign-in flow).
 * Providers are registered and updated through `auth.api.*` by the dashboard; these helpers read
 * them, keep `domainVerified` in step with the organization's verified email domains and hold
 * the organization's SSO requirement. Trust rules: `@coss/auth/sso`.
 */
import { parseSsoDomains, unverifiedSsoDomains } from "@coss/auth/sso";
import { db, type Executor, schema } from "@coss/db";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

const { account, member, organization, session, ssoProvider, user } = schema;

/** Better Auth's provider id for email + password accounts. */
const CREDENTIAL_PROVIDER_ID = "credential";

export type SsoProviderType = "oidc" | "saml";

export type OrganizationSsoProvider = {
  id: string;
  /** Public id, in the callback URLs (`/api/auth/sso/callback/<providerId>`). */
  providerId: string;
  type: SsoProviderType;
  issuer: string;
  domains: string[];
  /** Domains that are no longer verified email domains of the organization. */
  unverifiedDomains: string[];
  /** Sign-in works: `domainVerified` is set and every domain is still verified. */
  active: boolean;
  /** Set by the last save; cleared by a platform admin disabling the provider. */
  domainVerified: boolean;
  oidc: { clientId: string; discoveryEndpoint: string | null } | null;
  saml: { entryPoint: string; idpEntityId: string | null; usesMetadata: boolean } | null;
};

function parseJson(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** The organization's SSO provider (one per organization), without secrets. */
export async function getOrganizationSsoProvider(input: {
  organizationId: string;
}): Promise<OrganizationSsoProvider | null> {
  const [row] = await db
    .select()
    .from(ssoProvider)
    .where(eq(ssoProvider.organizationId, input.organizationId))
    .orderBy(asc(ssoProvider.id))
    .limit(1);
  if (!row) return null;
  const domains = parseSsoDomains(row.domain);
  const unverified = await unverifiedSsoDomains(input.organizationId, domains);
  const oidc = parseJson(row.oidcConfig);
  const saml = parseJson(row.samlConfig);
  const idpMetadata = (saml?.idpMetadata ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    providerId: row.providerId,
    type: saml ? "saml" : "oidc",
    issuer: row.issuer,
    domains,
    unverifiedDomains: unverified,
    domainVerified: row.domainVerified === true,
    active: row.domainVerified === true && unverified.length === 0,
    oidc: oidc
      ? {
          clientId: stringOrNull(oidc.clientId) ?? "",
          discoveryEndpoint: stringOrNull(oidc.discoveryEndpoint),
        }
      : null,
    saml: saml
      ? {
          entryPoint: stringOrNull(saml.entryPoint) ?? "",
          idpEntityId: stringOrNull(idpMetadata.entityID),
          usesMetadata: typeof idpMetadata.metadata === "string",
        }
      : null,
  };
}

/**
 * Sets the provider's `domainVerified` from the organization's email domains (true only when
 * every provider domain is a verified email domain of the organization) and returns the domains
 * that are not. Called after each save: the plugin resets the flag whenever domains change.
 */
export async function syncSsoDomainVerification(input: {
  organizationId: string;
  providerId: string;
}): Promise<{ unverifiedDomains: string[] }> {
  const [row] = await db
    .select({ domain: ssoProvider.domain })
    .from(ssoProvider)
    .where(
      and(
        eq(ssoProvider.providerId, input.providerId),
        eq(ssoProvider.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!row) return { unverifiedDomains: [] };
  const unverified = await unverifiedSsoDomains(input.organizationId, parseSsoDomains(row.domain));
  await db
    .update(ssoProvider)
    .set({ domainVerified: unverified.length === 0 })
    .where(
      and(
        eq(ssoProvider.providerId, input.providerId),
        eq(ssoProvider.organizationId, input.organizationId),
      ),
    );
  return { unverifiedDomains: unverified };
}

/**
 * Turns the organization's SSO requirement on or off. The dashboard checks the actor (an owner
 * signed in through the provider, with a password for break-glass access) first.
 */
export async function setOrganizationSsoRequired(input: {
  organizationId: string;
  required: boolean;
}): Promise<void> {
  await db
    .update(organization)
    .set({ requireSso: input.required })
    .where(eq(organization.id, input.organizationId));
}

/** The user's organizations that require SSO, by name. */
export async function listOrganizationsRequiringSso(input: {
  userId: string;
}): Promise<{ name: string; slug: string }[]> {
  return db
    .select({ name: organization.name, slug: organization.slug })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(and(eq(member.userId, input.userId), eq(organization.requireSso, true)))
    .orderBy(asc(organization.name));
}

/** Whether the user can sign in with a password (break-glass access for owners). */
export async function userHasPassword(input: { userId: string }): Promise<boolean> {
  const [row] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, input.userId), eq(account.providerId, CREDENTIAL_PROVIDER_ID)))
    .limit(1);
  return Boolean(row);
}

/** Owners of the organization who have no password (no break-glass access), by email. */
export async function listOwnersWithoutPassword(input: {
  organizationId: string;
}): Promise<{ userId: string; email: string }[]> {
  return db
    .select({ userId: user.id, email: user.email })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(
      and(
        eq(member.organizationId, input.organizationId),
        sql`'owner' = any(string_to_array(${member.role}, ','))`,
        sql`not exists (select 1 from ${account} where ${account.userId} = ${user.id} and ${account.providerId} = ${CREDENTIAL_PROVIDER_ID})`,
      ),
    )
    .orderBy(asc(user.email));
}

/** Members of the organization linked to its SSO provider (by member id). */
export async function listSsoLinkedMemberIds(input: {
  organizationId: string;
  providerId: string;
}): Promise<Set<string>> {
  const rows = await db
    .select({ memberId: member.id })
    .from(member)
    .innerJoin(account, eq(account.userId, member.userId))
    .where(
      and(
        eq(member.organizationId, input.organizationId),
        eq(account.providerId, input.providerId),
      ),
    );
  return new Set(rows.map((row) => row.memberId));
}

/**
 * Signs out every session an SSO provider created, once the provider is removed or disabled: they
 * would otherwise keep counting as signed in through the organization's IdP (for its SSO and
 * two-factor requirements), even for a provider registered later under the same derived id.
 * Returns how many were revoked.
 */
export async function revokeSsoProviderSessions(
  input: { providerIds: string[] },
  executor: Executor = db,
): Promise<number> {
  if (input.providerIds.length === 0) return 0;
  const revoked = await executor
    .delete(session)
    .where(inArray(session.ssoProviderId, input.providerIds))
    .returning({ id: session.id });
  return revoked.length;
}
