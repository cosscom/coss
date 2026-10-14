import { listAdminAuditEvents } from "@coss/tenancy/admin";
import type { Metadata } from "next";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import { stringParam } from "@/components/admin/list-controls";
import { CursorPager } from "@/components/cursor-pager";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { requirePlatformAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Audit log · Admin" };

export default async function AdminAuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requirePlatformAdmin();
  const before = stringParam((await searchParams).before);
  const { events, nextBefore } = await listAdminAuditEvents({
    before: before || undefined,
    limit: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description="Every action taken from this console, newest first. Entries can't be edited or deleted."
        title="Audit log"
      />
      <Panel
        footer={
          before || nextBefore ? (
            <CursorPager
              newestHref={before ? "/admin/audit" : undefined}
              olderHref={nextBefore ? `/admin/audit?before=${nextBefore}` : undefined}
              summary={`${events.length} ${events.length === 1 ? "action" : "actions"}`}
            />
          ) : null
        }
      >
        <AuditLogTable events={events} />
      </Panel>
    </div>
  );
}
