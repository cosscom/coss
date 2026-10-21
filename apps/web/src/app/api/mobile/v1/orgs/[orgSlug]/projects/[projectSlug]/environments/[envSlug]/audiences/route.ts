import type { AudiencesResponse } from "@coss/companion";
import { listAudiences } from "@coss/email";
import { cursorParam, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileAudience } from "../contacts/wire";

export const dynamic = "force-dynamic";

// The dashboard's audiences/page.tsx.
const PAGE_SIZE = 50;

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/audiences">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      contact: ["read"],
    });
    const page = await listAudiences(scope, { limit: PAGE_SIZE, after: cursorParam(request) });
    return {
      data: page.data.map(toMobileAudience),
      next_cursor: page.has_more ? (page.data.at(-1)?.id ?? null) : null,
    } satisfies AudiencesResponse;
  },
);
