import type { ReceivedSmsListResponse } from "@coss/companion";
import { listReceivedSms } from "@coss/sms";
import { cursorParam, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileReceivedSms } from "../wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/sms/received">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      sms: ["read"],
    });
    const page = await listReceivedSms({ ...scope, limit: 50, after: cursorParam(request) });
    return {
      data: page.data.map(toMobileReceivedSms),
      next_cursor: page.hasMore ? (page.data.at(-1)?.id ?? null) : null,
    } satisfies ReceivedSmsListResponse;
  },
);
