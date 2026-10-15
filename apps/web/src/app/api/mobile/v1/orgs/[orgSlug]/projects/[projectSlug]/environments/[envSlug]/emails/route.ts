import type { EmailListResponse, EmailStatus } from "@coss/companion";
import { listEmailsPage } from "@coss/email";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileEmailSummary } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const STATUSES: readonly EmailStatus[] = ["queued", "sent", "failed", "scheduled", "canceled"];

function isStatus(value: string | null): value is EmailStatus {
  return STATUSES.includes(value as EmailStatus);
}

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/emails">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      email: ["read"],
    });
    const search = new URL(request.url).searchParams;
    const status = search.get("status");
    const page = await listEmailsPage({
      ...scope,
      limit: PAGE_SIZE,
      status: isStatus(status) ? [status] : undefined,
      query: search.get("query")?.trim() || undefined,
      before: search.get("before") || undefined,
    });
    return {
      data: page.items.map(toMobileEmailSummary),
      next_cursor: page.nextCursor,
    } satisfies EmailListResponse;
  },
);
