import { listAdminAuditEvents } from "@coss/tenancy/admin";
import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import type { Metadata } from "next";
import Link from "next/link";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import { stringParam } from "@/components/admin/list-controls";
import { PageHeader } from "@/components/page-header";
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
    <>
      <PageHeader
        description="Every action taken from this console, newest first. Entries can't be edited or deleted."
        title="Audit log"
      />
      <Card>
        <CardPanel className="p-2">
          <AuditLogTable events={events} />
        </CardPanel>
      </Card>
      <div className="flex justify-end gap-2">
        {before ? (
          <Button render={<Link href="/admin/audit" />} size="sm" variant="outline">
            Newest
          </Button>
        ) : null}
        {nextBefore ? (
          <Button
            render={<Link href={`/admin/audit?before=${nextBefore}`} />}
            size="sm"
            variant="outline"
          >
            Older
          </Button>
        ) : null}
      </div>
    </>
  );
}
