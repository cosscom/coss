import { orgAccess } from "@coss/auth/org-access";
import { type OrgPermissions, orgRoleCan } from "@coss/auth/permissions";
import { db, schema } from "@coss/db";
import { and, eq, gt, isNull, ne, or, sql } from "drizzle-orm";
import { type ApnsEnvironment, PUSH_KIND_CATEGORY, type PushKind } from "./schemas.ts";

const { member, organization, pushDevice, session, ssoProvider, user } = schema;

/** Who hears about each kind: members whose role can act on it (the emails' audience for the rest). */
const AUDIENCE: Record<PushKind, OrgPermissions> = {
  reputation_warning: { organization: ["update"] },
  reputation_suspended: { organization: ["update"] },
  billing_payment_failed: { billing: ["read"] },
  billing_hold_placed: { billing: ["read"] },
  webhook_endpoint_disabled: { webhook: ["update"] },
  hook_endpoint_disabled: { hook: ["update"] },
  log_drain_disabled: { logDrain: ["update"] },
  risk_review: { risk: ["feedback"] },
};

export type PushTarget = {
  deviceId: string;
  token: string;
  apnsEnvironment: ApnsEnvironment;
};

/**
 * The devices a notification goes to: app sessions of the organization's members that are
 * unexpired and not impersonated, of unbanned users who can act on it, with its category on, and
 * that the organization's SSO and two-factor requirements let in (as `requireMobileOrgMember`).
 */
export async function pushTargets(input: {
  organizationId: string;
  kind: PushKind;
  now: Date;
}): Promise<PushTarget[]> {
  const rows = await db
    .select({
      deviceId: pushDevice.id,
      token: pushDevice.token,
      apnsEnvironment: pushDevice.apnsEnvironment,
      role: member.role,
      slug: organization.slug,
      requireSso: organization.requireSso,
      requireTwoFactor: organization.requireTwoFactor,
      organizationSsoProviderId: sql<string | null>`(
        select ${ssoProvider.providerId} from ${ssoProvider}
        where ${ssoProvider.organizationId} = ${organization.id}
        order by ${ssoProvider.id} limit 1
      )`,
      sessionSsoProviderId: session.ssoProviderId,
      twoFactorEnabled: user.twoFactorEnabled,
    })
    .from(pushDevice)
    .innerJoin(session, eq(session.id, pushDevice.sessionId))
    .innerJoin(user, eq(user.id, pushDevice.userId))
    .innerJoin(
      member,
      and(eq(member.userId, pushDevice.userId), eq(member.organizationId, input.organizationId)),
    )
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(
      and(
        gt(session.expiresAt, input.now),
        isNull(session.impersonatedBy),
        or(isNull(user.banned), ne(user.banned, true)),
        sql`${pushDevice.categories} @> ARRAY[${PUSH_KIND_CATEGORY[input.kind]}]::text[]`,
      ),
    )
    .orderBy(pushDevice.id);

  return rows
    .filter(
      (row) =>
        orgRoleCan(row.role, AUDIENCE[input.kind]) &&
        orgAccess(
          {
            organization: {
              slug: row.slug,
              requireSso: row.requireSso ?? false,
              requireTwoFactor: row.requireTwoFactor ?? false,
            },
            member: { role: row.role },
            ssoProviderId: row.organizationSsoProviderId,
          },
          {
            session: { ssoProviderId: row.sessionSsoProviderId, impersonatedBy: null },
            user: { twoFactorEnabled: row.twoFactorEnabled },
          },
        ).kind === "allowed",
    )
    .map(({ deviceId, token, apnsEnvironment }) => ({ deviceId, token, apnsEnvironment }));
}
