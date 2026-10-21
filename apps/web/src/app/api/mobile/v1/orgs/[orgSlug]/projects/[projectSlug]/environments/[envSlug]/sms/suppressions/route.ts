import type { MobileSmsSuppression, Page } from "@coss/companion";
import { listSmsSuppressions } from "@coss/sms";
import { cursorParam, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileSmsSuppression } from "./wire";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/sms/suppressions">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      smsSuppression: ["read"],
    });
    const page = await listSmsSuppressions({
      ...scope,
      limit: PAGE_SIZE,
      after: cursorParam(request),
    });
    return {
      data: page.data.map(toMobileSmsSuppression),
      next_cursor: page.hasMore ? (page.data.at(-1)?.id ?? null) : null,
    } satisfies Page<MobileSmsSuppression>;
  },
);
