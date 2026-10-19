import type { SmsListResponse, SmsStatus } from "@coss/companion";
import { listSmsPage } from "@coss/sms";
import { cursorParam, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileSmsSummary } from "./wire";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const STATUSES: readonly SmsStatus[] = [
  "queued",
  "scheduled",
  "sent",
  "delivered",
  "undelivered",
  "failed",
  "canceled",
];

/** `status=failed,undelivered`: the known statuses named; none (or only unknown ones) is every status. */
function statusParam(value: string | null): SmsStatus[] | undefined {
  const statuses = (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is SmsStatus => STATUSES.includes(part as SmsStatus));
  return statuses.length > 0 ? statuses : undefined;
}

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/sms">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      sms: ["read"],
    });
    const page = await listSmsPage({
      ...scope,
      limit: PAGE_SIZE,
      status: statusParam(new URL(request.url).searchParams.get("status")),
      after: cursorParam(request),
    });
    return {
      data: page.data.map(toMobileSmsSummary),
      next_cursor: page.hasMore ? (page.data.at(-1)?.id ?? null) : null,
    } satisfies SmsListResponse;
  },
);
