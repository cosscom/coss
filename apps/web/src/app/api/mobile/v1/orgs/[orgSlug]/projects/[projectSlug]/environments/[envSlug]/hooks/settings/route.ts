import type { HookPortalSettingsResponse } from "@coss/companion";
import { getHookPortalSettings } from "@coss/hooks";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileHookPortalSettings } from "./wire";

export const dynamic = "force-dynamic";

// The dashboard's hooks/settings page. It holds no secret (origins, name, color, theme), so
// reading it takes `hook:read`; the dashboard asks for `hook:update` because the page is the form.
export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/hooks/settings">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      hook: ["read"],
    });
    return toMobileHookPortalSettings(
      await getHookPortalSettings(scope),
    ) satisfies HookPortalSettingsResponse;
  },
);
