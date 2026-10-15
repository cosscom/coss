import type { Page, ReceivedEmailSummary } from "@coss/companion";
import { listReceivedEmails } from "@coss/email";
import { cursorParam, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileReceivedSummary } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/received">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      email: ["read"],
    });
    const page = await listReceivedEmails({ ...scope, limit: 50, after: cursorParam(request) });
    return {
      data: page.data.map(toMobileReceivedSummary),
      next_cursor: page.hasMore ? (page.data.at(-1)?.id ?? null) : null,
    } satisfies Page<ReceivedEmailSummary>;
  },
);
