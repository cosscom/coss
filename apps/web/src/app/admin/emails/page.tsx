import { listEmailsForAdmin } from "@coss/email/admin";
import { findOrganizationForAdmin } from "@coss/tenancy/admin";
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
import { MailIcon, XIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { listHref, stringParam } from "@/components/admin/list-controls";
import { ScreeningVerdictBadge } from "@/components/admin/screening-verdict";
import { CursorPager } from "@/components/cursor-pager";
import { EmailStatusBadge, ModeBadge } from "@/components/email-badges";
import { EmptyState } from "@/components/empty-state";
import { FilterLinks } from "@/components/filter-links";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelBody } from "@/components/panel";
import { SearchForm } from "@/components/search-form";
import { formatDateTime, formatRelative } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Emails" };

const MODES = [
  { value: "live", label: "Live" },
  { value: "sandbox", label: "Sandbox" },
  { value: "all", label: "All" },
] as const;

const STATUSES = [
  { value: "all", label: "All" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "queued", label: "Queued" },
  { value: "scheduled", label: "Scheduled" },
  { value: "canceled", label: "Canceled" },
] as const;

/** Every organization's emails, newest first. Content is only shown on an email's own page. */
export default async function AdminEmailsPage({ searchParams }: PageProps<"/admin/emails">) {
  await requirePlatformAdmin();
  const search = await searchParams;
  const mode = MODES.find((option) => option.value === stringParam(search.mode)) ?? MODES[0];
  const status =
    STATUSES.find((option) => option.value === stringParam(search.status)) ?? STATUSES[0];
  const from = stringParam(search.from);
  const orgParam = stringParam(search.org);
  const before = stringParam(search.before) || undefined;
  const organization = orgParam ? await findOrganizationForAdmin(orgParam) : null;
  const now = new Date();

  const page =
    orgParam && !organization
      ? { items: [], nextCursor: null }
      : await listEmailsForAdmin({
          organizationId: organization?.id,
          mode: mode.value === "all" ? undefined : mode.value,
          status: status.value === "all" ? undefined : status.value,
          from: from || undefined,
          before,
        });

  const filters = {
    mode: mode.value === "live" ? undefined : mode.value,
    status: status.value === "all" ? undefined : status.value,
    from: from || undefined,
    org: orgParam || undefined,
  };
  const href = (overrides: Partial<Record<keyof typeof filters, string | undefined>>) =>
    listHref("/admin/emails", { ...filters, ...overrides });

  return (
    <div className="flex flex-col gap-6" data-page-width="full">
      <PageHeader
        description="Every organization's emails, newest first (kept 45 days). Open one to see its recipients, events and, audited, its content."
        title="Emails"
      />
      <div className="flex flex-wrap items-center gap-3">
        <FilterLinks
          options={MODES.map((option) => ({
            value: option.value,
            label: option.label,
            href: href({ mode: option.value === "live" ? undefined : option.value }),
          }))}
          value={mode.value}
        />
        <FilterLinks
          options={STATUSES.map((option) => ({
            value: option.value,
            label: option.label,
            href: href({ status: option.value === "all" ? undefined : option.value }),
          }))}
          value={status.value}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SearchForm
          action="/admin/emails"
          keep={{ ...filters, org: undefined }}
          name="org"
          placeholder="Organization id or slug"
          query={orgParam}
        />
        <SearchForm
          action="/admin/emails"
          keep={{ ...filters, from: undefined }}
          name="from"
          placeholder="From contains…"
          query={from}
        />
      </div>
      {orgParam ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Organization:</span>
          {organization ? (
            <Link
              className="font-medium hover:underline"
              href={`/admin/organizations/${organization.id}`}
            >
              {organization.name}
            </Link>
          ) : (
            <span>no organization “{orgParam}”</span>
          )}
          <Button
            aria-label="Clear the organization filter"
            render={<Link href={href({ org: undefined })} />}
            size="icon-xs"
            variant="ghost"
          >
            <XIcon />
          </Button>
        </div>
      ) : null}
      <Panel>
        {page.items.length === 0 ? (
          <PanelBody flush>
            <EmptyState
              compact
              description="No email matches these filters."
              icon={MailIcon}
              title="No emails"
            />
          </PanelBody>
        ) : (
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-right">Recipients</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Screening</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell
                    className="whitespace-nowrap text-muted-foreground"
                    title={formatDateTime(row.createdAt)}
                  >
                    {formatRelative(row.createdAt, now)}
                  </TableCell>
                  <TableCell>
                    <Link className="hover:underline" href={href({ org: row.organizationId })}>
                      {row.organizationName}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-64 truncate" title={row.from}>
                    {row.from}
                  </TableCell>
                  <TableCell className="max-w-96 truncate">
                    <Link className="font-medium hover:underline" href={`/admin/emails/${row.id}`}>
                      {row.subject}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.recipients}</TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-1">
                      <EmailStatusBadge status={row.status} />
                      {row.errorCode ? (
                        <Badge className="font-mono" variant="outline">
                          {row.errorCode}
                        </Badge>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ModeBadge mode={row.mode} />
                  </TableCell>
                  <TableCell>
                    {row.screening ? (
                      <ScreeningVerdictBadge
                        enforced={row.screening.enforced}
                        verdict={row.screening.verdict}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      <CursorPager
        newestHref={before ? href({}) : undefined}
        olderHref={
          page.nextCursor
            ? listHref("/admin/emails", { ...filters, before: page.nextCursor })
            : undefined
        }
        summary={`${page.items.length} emails`}
      />
    </div>
  );
}
