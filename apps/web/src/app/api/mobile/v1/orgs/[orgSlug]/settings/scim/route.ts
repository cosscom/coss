import type { ScimSettingsResponse } from "@coss/companion";
import {
  getOrganizationScim,
  getOrganizationSsoProvider,
  listScimEvents,
  listScimGroupRoles,
} from "@coss/tenancy";
import { env } from "@/env";
import { planHas } from "@/lib/billing";
import { mobileRoute, requireMobileOrgMember, requireMobilePermission } from "@/lib/mobile-api";
import {
  toMobileScimDirectory,
  toMobileScimEvent,
  toMobileScimGroupRole,
  toMobileScimTokens,
} from "../wire";

export const dynamic = "force-dynamic";

// The dashboard's directory sync tab (apps/web/src/app/[orgSlug]/settings/scim/page.tsx), read
// server-side: tokens never leave coss.com (only their dates).
export const GET = mobileRoute(
  async (request, ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/settings/scim">) => {
    const context = await requireMobileOrgMember(request, (await ctx.params).orgSlug);
    requireMobilePermission(context, { scim: ["read"] });
    const organizationId = context.organization.id;
    const canUpdate = context.can({ scim: ["update"] });

    const [scim, provider, mappings, events] = await Promise.all([
      getOrganizationScim({ organizationId }),
      getOrganizationSsoProvider({ organizationId }),
      listScimGroupRoles({ organizationId }),
      listScimEvents({ organizationId }),
    ]);
    const planAllows = scim ? true : await planHas(organizationId, "scim");

    return {
      directory: scim ? toMobileScimDirectory(scim) : null,
      plan_allows: planAllows,
      sso_active: Boolean(provider?.active),
      can_update: canUpdate,
      base_url: canUpdate ? `${env.BETTER_AUTH_URL}/api/auth/scim/v2` : null,
      tokens: scim && canUpdate ? toMobileScimTokens(scim) : [],
      group_roles: mappings.map(toMobileScimGroupRole),
      events: scim ? events.map(toMobileScimEvent) : [],
    } satisfies ScimSettingsResponse;
  },
);
