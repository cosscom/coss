import { getAdminOverview, listAdminAuditEvents } from "@coss/tenancy/admin";
import { Button } from "@coss/ui/components/button";
import { Card, CardAction, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import type { Metadata } from "next";
import Link from "next/link";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import { PageHeader } from "@/components/page-header";
import { requirePlatformAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Admin" };

function Stat(props: { label: string; value: number; href: string }) {
  return (
    <Link className="rounded-xl border p-4 transition-colors hover:bg-accent/50" href={props.href}>
      <p className="text-muted-foreground text-sm">{props.label}</p>
      <p className="font-heading font-semibold text-2xl tabular-nums">{props.value}</p>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  await requirePlatformAdmin();
  const [overview, { events }] = await Promise.all([
    getAdminOverview(),
    listAdminAuditEvents({ limit: 10 }),
  ]);

  return (
    <>
      <PageHeader description="Users, organizations and every admin action." title="Overview" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat href="/admin/users" label="Users" value={overview.users} />
        <Stat href="/admin/users?status=banned" label="Banned users" value={overview.bannedUsers} />
        <Stat href="/admin/users?status=admin" label="Platform admins" value={overview.admins} />
        <Stat href="/admin/organizations" label="Organizations" value={overview.organizations} />
        <Stat
          href="/admin/organizations?status=suspended"
          label="Suspended organizations"
          value={overview.suspendedOrganizations}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent admin actions</CardTitle>
          <CardAction>
            <Button render={<Link href="/admin/audit" />} size="sm" variant="outline">
              Full audit log
            </Button>
          </CardAction>
        </CardHeader>
        <CardPanel className="p-2">
          <AuditLogTable events={events} />
        </CardPanel>
      </Card>
    </>
  );
}
