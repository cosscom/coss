import { listSendersForAdmin } from "@coss/email/admin";
import { metricsSnapshot } from "@coss/reputation";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { SendIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { listHref, stringParam } from "@/components/admin/list-controls";
import { EmptyState } from "@/components/empty-state";
import { FilterLinks } from "@/components/filter-links";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelBody } from "@/components/panel";
import { formatRate, StandingBadge } from "@/components/reputation";
import { systemOrganizationId } from "@/lib/billing";
import { formatCompact, formatDateTime, formatRelative } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Sending" };

const WINDOWS = [
  { value: "24h", label: "24 hours", ms: 86_400_000 },
  { value: "7d", label: "7 days", ms: 7 * 86_400_000 },
  { value: "30d", label: "30 days", ms: 30 * 86_400_000 },
] as const;

/** Every organization that created emails in the window, the most live emails sent first. */
export default async function AdminSendingPage({ searchParams }: PageProps<"/admin/sending">) {
  await requirePlatformAdmin();
  const search = await searchParams;
  const window =
    WINDOWS.find((option) => option.value === stringParam(search.window)) ?? WINDOWS[1];
  const includeCoss = stringParam(search.coss) === "1";
  const now = new Date();
  const systemOrganization = await systemOrganizationId();
  const senders = await listSendersForAdmin({
    since: new Date(now.getTime() - window.ms),
    now,
    excludeOrganizationId: includeCoss ? null : systemOrganization,
    limit: 200,
  });
  const href = (params: { window?: string; coss?: boolean }) =>
    listHref("/admin/sending", {
      window:
        (params.window ?? window.value) === "7d" ? undefined : (params.window ?? window.value),
      coss: (params.coss ?? includeCoss) ? "1" : undefined,
    });

  return (
    <div className="flex flex-col gap-6" data-page-width="full">
      <PageHeader
        description="Organizations that created emails in the window, the most live emails sent first. Sandbox emails are never delivered."
        title="Sending"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterLinks
          options={WINDOWS.map((option) => ({
            value: option.value,
            label: option.label,
            href: href({ window: option.value }),
          }))}
          value={window.value}
        />
        {systemOrganization ? (
          <Button render={<Link href={href({ coss: !includeCoss })} />} size="sm" variant="ghost">
            {includeCoss ? "Hide COSS's own organization" : "Include COSS's own organization"}
          </Button>
        ) : null}
      </div>
      <Panel>
        {senders.length === 0 ? (
          <PanelBody flush>
            <EmptyState
              compact
              description={`No organization created an email in the last ${window.label}.`}
              icon={SendIcon}
              title="Nobody is sending"
            />
          </PanelBody>
        ) : (
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Domains</TableHead>
                <TableHead className="text-right">Live sent</TableHead>
                <TableHead className="text-right">Recipients</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="text-right">Sandbox</TableHead>
                <TableHead className="text-right">Bounces</TableHead>
                <TableHead className="text-right">Complaints</TableHead>
                <TableHead className="text-right">Screening</TableHead>
                <TableHead>Standing</TableHead>
                <TableHead>Last email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {senders.map((row) => {
                const checks = metricsSnapshot(row.standingMetrics)?.checks ?? [];
                const rate = (trigger: string) =>
                  formatRate(checks.find((check) => check.trigger === trigger)?.rate ?? null);
                return (
                  <TableRow key={row.organizationId}>
                    <TableCell>
                      <Link
                        className="font-medium hover:underline"
                        href={`/admin/organizations/${row.organizationId}`}
                      >
                        {row.name}
                      </Link>
                      {row.organizationId === systemOrganization ? (
                        <Badge className="ms-2" variant="secondary">
                          COSS
                        </Badge>
                      ) : null}
                      <div
                        className="text-muted-foreground text-xs"
                        title={formatDateTime(row.organizationCreatedAt)}
                      >
                        {row.slug} · created {formatRelative(row.organizationCreatedAt, now)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.ownerEmail ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.verifiedDomains}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      <Link
                        className="hover:underline"
                        href={listHref("/admin/emails", { org: row.organizationId })}
                      >
                        {formatCompact(row.liveSent)}
                      </Link>
                      {row.livePending > 0 ? (
                        <div className="text-muted-foreground text-xs">
                          +{formatCompact(row.livePending)} pending
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCompact(row.liveRecipients)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.liveFailed > 0 ? (
                        <Link
                          className="hover:underline"
                          href={listHref("/admin/emails", {
                            org: row.organizationId,
                            status: "failed",
                          })}
                        >
                          {formatCompact(row.liveFailed)}
                        </Link>
                      ) : (
                        0
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {formatCompact(row.sandbox)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{rate("bounce_rate")}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {rate("complaint_rate")}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.screeningBlocked > 0 ? (
                        <Badge variant="error">{row.screeningBlocked} blocked</Badge>
                      ) : row.screeningFlagged > 0 ? (
                        <Badge variant="warning">{row.screeningFlagged} flagged</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1">
                        <StandingBadge status={row.standingStatus} />
                        {row.deleting ? (
                          <Badge variant="error">deleting</Badge>
                        ) : row.suspended ? (
                          <Badge variant="error">account suspended</Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell
                      className="whitespace-nowrap text-muted-foreground"
                      title={formatDateTime(row.lastEmailAt)}
                    >
                      {formatRelative(row.lastEmailAt, now)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
