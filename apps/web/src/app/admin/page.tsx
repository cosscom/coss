import { getAdminOverview, listAdminAuditEvents } from "@coss/tenancy/admin";
import { Button } from "@coss/ui/components/button";
import { ArrowRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { Stat, StatRow } from "@/components/stat-row";
import { formatCompact } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminOverviewPage() {
  await requirePlatformAdmin();
  const [overview, { events }] = await Promise.all([
    getAdminOverview(),
    listAdminAuditEvents({ limit: 10 }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader description="Users, organizations and every admin action." title="Overview" />
      <StatRow className="md:grid-cols-3 lg:grid-cols-5">
        <Stat href="/admin/users" label="Users" value={formatCompact(overview.users)} />
        <Stat
          href="/admin/users?status=banned"
          label="Banned users"
          value={formatCompact(overview.bannedUsers)}
        />
        <Stat
          href="/admin/users?status=admin"
          label="Platform admins"
          value={formatCompact(overview.admins)}
        />
        <Stat
          href="/admin/organizations"
          label="Organizations"
          value={formatCompact(overview.organizations)}
        />
        <Stat
          className="max-md:col-span-2 md:max-lg:col-span-2"
          href="/admin/organizations?status=suspended"
          label="Suspended organizations"
          value={formatCompact(overview.suspendedOrganizations)}
        />
      </StatRow>
      <Panel
        action={
          <Button render={<Link href="/admin/audit" />} size="sm" variant="ghost">
            Full audit log
            <ArrowRightIcon />
          </Button>
        }
        title="Recent admin actions"
      >
        <AuditLogTable events={events} />
      </Panel>
    </div>
  );
}
