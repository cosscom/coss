import type { ContentStorageResponse } from "@coss/companion";
import { getStorageSettings } from "@coss/email";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

// The dashboard's content-storage/page.tsx, read-only.
export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/content-storage">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      environment: ["read"],
    });
    const settings = await getStorageSettings(scope);
    return {
      content_storage: settings.contentStorage,
      updated_at: settings.updatedAt?.toISOString() ?? null,
    } satisfies ContentStorageResponse;
  },
);
