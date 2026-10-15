import type { Page, RiskListEntry } from "@coss/companion";
import { listRiskListEntries } from "@coss/risk";
import { ListRiskListEntriesQuery } from "@coss/risk/schemas";
import {
  cursorParam,
  MobileApiError,
  mobileRoute,
  requireMobileEnvironment,
} from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/risk/lists">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      riskList: ["read"],
    });
    const list = new URL(request.url).searchParams.get("list") ?? undefined;
    const query = ListRiskListEntriesQuery.safeParse({
      list,
      limit: 50,
      after: cursorParam(request),
    });
    if (!query.success) throw new MobileApiError(400, "invalid_request", "Invalid page.");
    const entries = await listRiskListEntries(scope, query.data);
    return {
      data: entries.data.map(({ id, list, type, value, note, expires_at, created_at }) => ({
        id,
        list,
        type,
        value,
        note,
        expires_at,
        created_at,
      })),
      next_cursor: entries.has_more ? (entries.data.at(-1)?.id ?? null) : null,
    } satisfies Page<RiskListEntry>;
  },
);
