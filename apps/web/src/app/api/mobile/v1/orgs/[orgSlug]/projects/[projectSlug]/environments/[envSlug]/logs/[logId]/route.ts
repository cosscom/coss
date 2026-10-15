import type { LogEntryResponse } from "@coss/companion";
import { getLogEntry, relatedLogEntries } from "@coss/logs";
import { apiKeyNames } from "@coss/tenancy";
import { MobileApiError, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileLogDetail, toMobileLogEntry } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/logs/[logId]">,
  ) => {
    const { logId, ...params } = await ctx.params;
    const { scope } = await requireMobileEnvironment(request, params, { log: ["read"] });
    const entry = await getLogEntry(scope, logId);
    if (!entry) throw new MobileApiError(404, "not_found", "Log line not found.");
    const [related, names] = await Promise.all([
      relatedLogEntries(scope, entry),
      entry.api_key_id
        ? apiKeyNames({ organizationId: scope.organizationId, ids: [entry.api_key_id] })
        : {},
    ]);
    return {
      entry: toMobileLogDetail(entry, names),
      related: related.filter((line) => line.id !== entry.id).map(toMobileLogEntry),
    } satisfies LogEntryResponse;
  },
);
