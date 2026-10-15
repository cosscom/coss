import type { LogEntry, LogRange, LogSource, Page } from "@coss/companion";
import { queryLogs } from "@coss/logs";
import { type LogFilters, parseLogQuery } from "@coss/logs/query";
import { cursorParam, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileLogEntry } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

const RANGES: Record<LogRange, number> = { "1h": 3_600_000, "24h": 86_400_000, "7d": 604_800_000 };
const SOURCES: readonly LogSource[] = ["api", "email", "webhook", "risk"];

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/logs">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      log: ["read"],
    });
    const search = new URL(request.url).searchParams;
    const range = (search.get("range") ?? "24h") as LogRange;
    const now = Date.now();
    const filters: LogFilters = parseLogQuery(search.get("q")?.slice(0, 500) ?? "");
    const source = search.get("source") as LogSource | null;
    if (source && SOURCES.includes(source)) filters.sources = [source];
    const list = await queryLogs({
      ...scope,
      from: new Date(now - (RANGES[range] ?? RANGES["24h"])),
      to: new Date(now + 60_000),
      filters,
      limit: 50,
      after: cursorParam(request),
    });
    return {
      data: list.data.map(toMobileLogEntry),
      next_cursor: list.has_more ? (list.data.at(-1)?.id ?? null) : null,
    } satisfies Page<LogEntry>;
  },
);
