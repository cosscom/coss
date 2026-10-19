import { HIGH_RISK_SMS_COUNTRIES } from "@coss/sms";
import { listSmsRegistrationsForAdmin, listSmsSendersForAdmin } from "@coss/sms/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { MessageSquareIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelBody, PanelDescription, PanelHeader, PanelTitle } from "@/components/panel";
import { RegistrationStatusDot } from "@/components/sms-badges";
import { formatDateTime } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/session";
import { UnlockCountriesForm } from "./unlock-form";

export const metadata: Metadata = { title: "SMS" };

const WEEK_MS = 7 * 86_400_000;

/** Carrier registrations across organizations, and who sent live SMS in the last week. */
export default async function AdminSmsPage() {
  await requirePlatformAdmin();
  const [registrations, senders] = await Promise.all([
    listSmsRegistrationsForAdmin({ limit: 200 }),
    listSmsSendersForAdmin({ since: new Date(Date.now() - WEEK_MS) }),
  ]);
  return (
    <div className="flex flex-col gap-6" data-page-width="full">
      <PageHeader
        description="Carrier registrations (US A2P 10DLC, toll-free verification) and live SMS by organization. Message text is never shown here."
        title="SMS"
      />
      <Panel>
        <PanelHeader>
          <PanelTitle>Registrations</PanelTitle>
        </PanelHeader>
        {registrations.length === 0 ? (
          <PanelBody flush>
            <EmptyState compact icon={MessageSquareIcon} title="No registrations yet" />
          </PanelBody>
        ) : (
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      className="hover:underline"
                      href={`/admin/organizations/${row.organizationId}`}
                    >
                      {row.organizationName}
                    </Link>
                  </TableCell>
                  <TableCell>{row.legalName}</TableCell>
                  <TableCell>{row.kind === "us_10dlc" ? "10DLC" : "Toll-free"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <RegistrationStatusDot status={row.status as "approved"} />
                      {row.rejectionReason ? (
                        <span className="max-w-80 text-muted-foreground text-xs">
                          {row.rejectionReason}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.step ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.submittedAt ? formatDateTime(row.submittedAt.toISOString()) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      <Panel>
        <PanelHeader>
          <PanelTitle>Unlock high-risk countries</PanelTitle>
          <PanelDescription>
            For an organization by id, e.g. before its first live message.
          </PanelDescription>
        </PanelHeader>
        <PanelBody>
          <UnlockCountriesForm unlocked={[]} />
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader>
          <PanelTitle>Live SMS, last 7 days</PanelTitle>
          <PanelDescription>
            High-risk countries ({HIGH_RISK_SMS_COUNTRIES.join(", ")}) can only be allowed by an
            organization once unlocked here, with a reason (admin audit log).
          </PanelDescription>
        </PanelHeader>
        {senders.length === 0 ? (
          <PanelBody flush>
            <EmptyState compact icon={MessageSquareIcon} title="No live SMS this week" />
          </PanelBody>
        ) : (
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead className="text-right">Messages</TableHead>
                <TableHead className="text-right">Segments</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead>Allowed countries</TableHead>
                <TableHead>Unlocked high-risk countries</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {senders.map((row) => (
                <TableRow key={row.organizationId}>
                  <TableCell>
                    <Link
                      className="hover:underline"
                      href={`/admin/organizations/${row.organizationId}`}
                    >
                      {row.organizationName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.live}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.segments}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.failed}</TableCell>
                  <TableCell className="max-w-60 truncate text-xs">
                    {row.allowedCountries.join(", ")}
                  </TableCell>
                  <TableCell>
                    <UnlockCountriesForm
                      organizationId={row.organizationId}
                      unlocked={row.unlockedCountries}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
