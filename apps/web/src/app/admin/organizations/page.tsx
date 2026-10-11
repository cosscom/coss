import { listOrganizationStandings, metricsSnapshot, REPUTATION_STATUSES } from "@coss/reputation";
import type { ReputationStatus } from "@coss/reputation/schemas";
import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatRate, StandingBadge, triggerLabel } from "@/components/reputation";
import { formatDateTime } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Organizations" };

function isStatus(value: unknown): value is ReputationStatus {
  return typeof value === "string" && (REPUTATION_STATUSES as readonly string[]).includes(value);
}

/** Every organization with its reputation standing: suspended first, then warned. */
export default async function AdminOrganizationsPage({
  searchParams,
}: PageProps<"/admin/organizations">) {
  await requirePlatformAdmin();
  const { status: rawStatus } = await searchParams;
  const status = isStatus(rawStatus) ? rawStatus : undefined;
  const organizations = await listOrganizationStandings({ status, limit: 200 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          <div className="flex items-center gap-1">
            {[undefined, ...REPUTATION_STATUSES].map((value) => (
              <Button
                key={value ?? "all"}
                render={
                  <Link
                    href={value ? `/admin/organizations?status=${value}` : "/admin/organizations"}
                  />
                }
                size="sm"
                variant={value === status ? "secondary" : "ghost"}
              >
                {value ?? "all"}
              </Button>
            ))}
          </div>
        }
        description="The reputation guard warns and suspends organizations automatically; only platform admins reinstate them."
        title="Organizations"
      />
      <Card>
        <CardPanel className="p-2">
          {organizations.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">No organizations.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Standing</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Bounce rate</TableHead>
                  <TableHead className="text-right">Complaint rate</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead>Evaluated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map(({ organizationId, name, slug, standing }) => {
                  const checks = metricsSnapshot(standing?.metrics)?.checks ?? [];
                  const check = (trigger: string) =>
                    checks.find((candidate) => candidate.trigger === trigger);
                  return (
                    <TableRow key={organizationId}>
                      <TableCell>
                        <Link
                          className="font-medium hover:underline"
                          href={`/admin/organizations/${organizationId}`}
                        >
                          {name}
                        </Link>
                        <span className="ms-2 text-muted-foreground text-xs">{slug}</span>
                      </TableCell>
                      <TableCell>
                        <StandingBadge status={standing?.status ?? "good"} />
                      </TableCell>
                      <TableCell>{triggerLabel(standing?.reason ?? null)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatRate(check("bounce_rate")?.rate ?? null)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatRate(check("complaint_rate")?.rate ?? null)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {checks[0]?.volume ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(standing?.lastEvaluatedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardPanel>
      </Card>
    </div>
  );
}
