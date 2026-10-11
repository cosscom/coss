/**
 * SSO trust rules shared by the Better Auth SSO plugin (`options.ts`), @coss/tenancy and the
 * dashboard. Server-only (reads the database); not client-safe.
 *
 * An organization's SSO provider may only sign in addresses on its own verified email domains:
 * the most specific non-failed email domain across all organizations that covers the address
 * (the rule `authorizeLiveSender` uses for sending) must be verified, belong to the provider's
 * organization and be one of the provider's domains.
 */
import type { SSOUserResolution, SSOUserResolutionInput } from "@better-auth/sso";
import { db } from "@coss/db";
import { ID_PREFIXES } from "@coss/db/id";
import * as schema from "@coss/db/schema";
import { and, eq, inArray, ne } from "drizzle-orm";

type Executor = Pick<typeof db, "select">;

/** Rejection codes `resolveSsoUser` returns; the plugin redirects with them as `?error=`. */
export const SSO_REJECTIONS = {
  domain: "email_domain_not_allowed",
  suspended: "organization_suspended",
  provider: "provider_not_found",
  scim: "scim_user_not_active",
} as const;

/**
 * The `providerId` of an organization's SSO provider (one per organization): derived from the
 * organization id, so the callback URLs to give the IdP are known before the provider is saved,
 * and stable across slug changes.
 */
export function ssoProviderIdFor(organizationId: string): string {
  const suffix = organizationId.slice(organizationId.lastIndexOf("_") + 1);
  return `${ID_PREFIXES.ssoConnection}_${suffix}`;
}

/** A provider's domains (the plugin stores them comma-separated), lower-cased. */
export function parseSsoDomains(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

/** The domain part of an address, lower-cased (`null` when it has none). */
export function emailDomainOf(email: string): string | null {
  const at = email.lastIndexOf("@");
  const domain =
    at < 0
      ? ""
      : email
          .slice(at + 1)
          .trim()
          .toLowerCase();
  return domain || null;
}

/** Every suffix of `name` that is a valid domain (`a.b.c` → `a.b.c`, `b.c`). */
function domainSuffixes(name: string): string[] {
  const labels = name.split(".");
  return labels.slice(0, -1).map((_, index) => labels.slice(index).join("."));
}

/**
 * The provider domain that lets `organizationId`'s provider sign in `email`, or null: the most
 * specific non-failed email domain covering the address must be verified, belong to the
 * organization and be listed on the provider.
 */
export async function ssoDomainForEmail(
  input: { organizationId: string; providerDomains: readonly string[]; email: string },
  executor: Executor = db,
): Promise<string | null> {
  const emailDomain = emailDomainOf(input.email);
  if (!emailDomain) return null;
  const candidates = await executor
    .select({
      name: schema.domain.name,
      organizationId: schema.domain.organizationId,
      status: schema.domain.status,
    })
    .from(schema.domain)
    .where(
      and(
        inArray(schema.domain.name, domainSuffixes(emailDomain)),
        ne(schema.domain.status, "failed"),
      ),
    );
  const match = candidates.sort((a, b) => b.name.length - a.name.length)[0];
  if (
    !match ||
    match.organizationId !== input.organizationId ||
    match.status !== "verified" ||
    !input.providerDomains.includes(match.name)
  ) {
    return null;
  }
  return match.name;
}

/** The domains in `domains` that are not verified email domains of `organizationId`. */
export async function unverifiedSsoDomains(
  organizationId: string,
  domains: readonly string[],
  executor: Executor = db,
): Promise<string[]> {
  if (domains.length === 0) return [];
  const verified = await executor
    .select({ name: schema.domain.name })
    .from(schema.domain)
    .where(
      and(
        eq(schema.domain.organizationId, organizationId),
        inArray(schema.domain.name, [...domains]),
        eq(schema.domain.status, "verified"),
      ),
    );
  const names = new Set(verified.map((row) => row.name));
  return domains.filter((name) => !names.has(name));
}

/**
 * The plugin's `resolveUser`: runs on every SSO sign-in, before any user, account, membership or
 * session is written. Refuses addresses outside the organization's verified domains (an IdP
 * must not create or take over accounts on other domains), users a connected directory doesn't
 * list as active (`scimBlocksSsoSignIn`) and new members of suspended organizations (the
 * plugin's provisioning bypasses the organization hooks).
 */
export async function resolveSsoUser(input: SSOUserResolutionInput): Promise<SSOUserResolution> {
  const [provider] = await db
    .select({
      organizationId: schema.ssoProvider.organizationId,
      domain: schema.ssoProvider.domain,
    })
    .from(schema.ssoProvider)
    .where(eq(schema.ssoProvider.providerId, input.providerId))
    .limit(1);
  if (!provider?.organizationId) return { action: "reject", code: SSO_REJECTIONS.provider };
  const organizationId = provider.organizationId;
  const email = input.providerUser.email.toLowerCase();
  const domain = await ssoDomainForEmail({
    organizationId,
    providerDomains: parseSsoDomains(provider.domain),
    email,
  });
  if (!domain) {
    return {
      action: "reject",
      code: SSO_REJECTIONS.domain,
      message: "This address is not on a verified domain of the organization.",
    };
  }
  if (await scimBlocksSsoSignIn(organizationId, email)) {
    return {
      action: "reject",
      code: SSO_REJECTIONS.scim,
      message: "Your organization's directory doesn't give you access to this organization.",
    };
  }
  const [suspension] = await db
    .select({ organizationId: schema.organizationSuspension.organizationId })
    .from(schema.organizationSuspension)
    .where(eq(schema.organizationSuspension.organizationId, organizationId))
    .limit(1);
  if (suspension) {
    const [membership] = await db
      .select({ id: schema.member.id })
      .from(schema.member)
      .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
      .where(and(eq(schema.member.organizationId, organizationId), eq(schema.user.email, email)))
      .limit(1);
    if (!membership) {
      return {
        action: "reject",
        code: SSO_REJECTIONS.suspended,
        message: "This organization is suspended.",
      };
    }
  }
  return { action: "continue" };
}

/** Better Auth stores several roles comma-separated. */
export function isOwnerRole(role: string): boolean {
  return role.split(",").includes("owner");
}

/** The organization's live (not decommissioned) managed SCIM connection ids. */
export async function liveScimConnectionIds(organizationId: string): Promise<string[]> {
  const rows = await db
    .select({ connectionId: schema.scimManagedConnection.connectionId })
    .from(schema.scimManagedConnection)
    .where(
      and(
        eq(schema.scimManagedConnection.provisioningDomainId, organizationId),
        eq(schema.scimManagedConnection.status, "active"),
      ),
    );
  return rows.map((row) => row.connectionId);
}

/**
 * Whether SSO sign-in to `organizationId` is refused for `email` because the directory doesn't
 * list the user as active: while a directory is connected, only its active users (and existing
 * owners, who aren't managed by it) sign in through SSO. Matched by the account's address, not the
 * IdP subject — Entra's OIDC `sub` is pairwise and never equals the SCIM externalId.
 */
export async function scimBlocksSsoSignIn(organizationId: string, email: string): Promise<boolean> {
  const connectionIds = await liveScimConnectionIds(organizationId);
  if (connectionIds.length === 0) return false;
  const [account] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);
  if (!account) return true;
  const [owner] = await db
    .select({ role: schema.member.role })
    .from(schema.member)
    .where(
      and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, account.id)),
    )
    .limit(1);
  if (owner && isOwnerRole(owner.role)) return false;
  const [active] = await db
    .select({ id: schema.scimUser.id })
    .from(schema.scimUser)
    .where(
      and(
        eq(schema.scimUser.userId, account.id),
        eq(schema.scimUser.provisioningDomainId, organizationId),
        inArray(schema.scimUser.connectionId, connectionIds),
        eq(schema.scimUser.active, true),
      ),
    )
    .limit(1);
  return active === undefined;
}

const SSO_SIGN_IN_PATHS = ["/sso/callback/:providerId", "/sso/saml2/sp/acs/:providerId"];

/** The provider id when a session is being created by an SSO callback (OIDC) or ACS (SAML). */
export function ssoProviderIdOfPath(
  path: string | undefined,
  params: Record<string, unknown> | undefined,
): string | null {
  const providerId = params?.providerId;
  if (!path || typeof providerId !== "string") return null;
  const matches = SSO_SIGN_IN_PATHS.some(
    (template) => path === template || path === template.replace(":providerId", providerId),
  );
  return matches ? providerId : null;
}
