import type { RiskSettingsResponse } from "@coss/companion";
import { getRiskSettings } from "@coss/risk";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileRiskSettings } from "./wire";

export const dynamic = "force-dynamic";

// The dashboard's risk/settings page.
export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/risk/settings">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      risk: ["read"],
    });
    return toMobileRiskSettings(await getRiskSettings(scope)) satisfies RiskSettingsResponse;
  },
);
