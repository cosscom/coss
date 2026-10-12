import { listOrgAuditEvents, orgAuditCsvHeader, orgAuditCsvRow } from "@coss/logs";
import type { NextRequest } from "next/server";
import { auditFiltersFrom, requireAuditAccess } from "../audit-data";

const PAGE_SIZE = 1000;
const MAX_ROWS = 100_000;

/** The audit log (with the page's filters) as CSV, newest first. */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/[orgSlug]/settings/audit/export">,
) {
  const { orgSlug } = await ctx.params;
  const { organization, planAllows } = await requireAuditAccess(orgSlug);
  if (!planAllows) {
    return new Response("The audit log is available on the Pro plan and above.\n", { status: 402 });
  }
  const filters = auditFiltersFrom(request.nextUrl.searchParams);
  const encoder = new TextEncoder();
  let before: string | undefined;
  let exported = 0;
  let headerSent = false;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!headerSent) {
        headerSent = true;
        controller.enqueue(encoder.encode(orgAuditCsvHeader()));
        return;
      }
      if (exported >= MAX_ROWS) return controller.close();
      const page = await listOrgAuditEvents({
        organizationId: organization.id,
        filters,
        before,
        limit: PAGE_SIZE,
      });
      if (page.events.length > 0) {
        controller.enqueue(encoder.encode(page.events.map(orgAuditCsvRow).join("")));
      }
      exported += page.events.length;
      if (!page.nextBefore) return controller.close();
      before = page.nextBefore;
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-${organization.slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
