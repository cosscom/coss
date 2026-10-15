import type { TrackingSettings } from "@coss/companion";
import { getTrackingSettings } from "@coss/email";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/tracking">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      environment: ["read"],
    });
    const settings = await getTrackingSettings(scope);
    return {
      default: settings.default && {
        opens: settings.default.opens,
        clicks: settings.default.clicks,
        updated_at: settings.default.updatedAt.toISOString(),
      },
      categories: settings.categories.flatMap((rule) =>
        rule.category === null
          ? []
          : [
              {
                category: rule.category,
                opens: rule.opens,
                clicks: rule.clicks,
                updated_at: rule.updatedAt.toISOString(),
              },
            ],
      ),
    } satisfies TrackingSettings;
  },
);
