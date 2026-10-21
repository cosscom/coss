import type { ContactPropertiesResponse } from "@coss/companion";
import { listContactPropertyRows } from "@coss/email";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileContactProperty } from "../wire";

export const dynamic = "force-dynamic";

// The dashboard's contacts/properties/page.tsx (at most 50 properties: no pages).
export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/contacts/properties">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      contact: ["read"],
    });
    const rows = await listContactPropertyRows(scope);
    return { data: rows.map(toMobileContactProperty) } satisfies ContactPropertiesResponse;
  },
);
