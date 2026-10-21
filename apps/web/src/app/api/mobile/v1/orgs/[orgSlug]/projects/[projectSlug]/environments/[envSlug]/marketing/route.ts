import type { MarketingSettingsResponse } from "@coss/companion";
import { getMarketingSettingsRow } from "@coss/email";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMarketingSettings } from "./wire";

export const dynamic = "force-dynamic";

// The dashboard's marketing/page.tsx (`marketingPage`: `contact:read`).
export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/marketing">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      contact: ["read"],
    });
    return {
      settings: toMarketingSettings(await getMarketingSettingsRow(scope)),
    } satisfies MarketingSettingsResponse;
  },
);
