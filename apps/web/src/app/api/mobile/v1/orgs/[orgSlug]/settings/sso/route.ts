import { orgAccess } from "@coss/auth/org-access";
import { ssoProviderIdFor } from "@coss/auth/sso";
import type { SsoSettingsResponse } from "@coss/companion";
import {
  getOrganizationSsoProvider,
  listOrganizationMembers,
  listOwnersWithoutPassword,
  listSsoLinkedMemberIds,
  userHasPassword,
} from "@coss/tenancy";
import { env } from "@/env";
import { planHas } from "@/lib/billing";
import { mobileRoute, requireMobileOrgMember, requireMobilePermission } from "@/lib/mobile-api";
import { ssoUrls } from "@/lib/sso";
import { toMobileSsoProvider, toMobileSsoSetup } from "../wire";

export const dynamic = "force-dynamic";

// The dashboard's SSO tab (apps/web/src/app/[orgSlug]/settings/sso/page.tsx), read server-side:
// Better Auth's SSO provider routes stay disabled over HTTP.
export const GET = mobileRoute(
  async (request, ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/settings/sso">) => {
    const context = await requireMobileOrgMember(request, (await ctx.params).orgSlug);
    requireMobilePermission(context, { sso: ["read"] });
    const { organization, session, can } = context;
    const organizationId = organization.id;
    const canUpdate = can({ sso: ["update"] });
    const canRequire = can({ sso: ["require"] });
    const access = orgAccess(context, session);
    const viaSso = access.kind === "allowed" && access.viaSso;

    const [provider, members] = await Promise.all([
      getOrganizationSsoProvider({ organizationId }),
      listOrganizationMembers({ organizationId }),
    ]);
    const providerId = provider?.providerId ?? ssoProviderIdFor(organizationId);
    const [linked, ownersWithoutPassword, hasPassword, planAllows] = await Promise.all([
      provider ? listSsoLinkedMemberIds({ organizationId, providerId }) : new Set<string>(),
      canRequire ? listOwnersWithoutPassword({ organizationId }) : [],
      canRequire ? userHasPassword({ userId: session.user.id }) : false,
      provider ? true : planHas(organizationId, "sso"),
    ]);

    return {
      provider: provider ? toMobileSsoProvider(provider, linked.size) : null,
      members: members.length,
      required: organization.requireSso,
      plan_allows: planAllows,
      setup: canUpdate
        ? toMobileSsoSetup(ssoUrls(env.BETTER_AUTH_URL, providerId), provider)
        : null,
      requirement: canRequire
        ? {
            active_provider: Boolean(provider?.active),
            signed_in_with_sso: viaSso,
            has_password: hasPassword,
            owners_without_password: ownersWithoutPassword.map((owner) => owner.email),
          }
        : null,
    } satisfies SsoSettingsResponse;
  },
);
