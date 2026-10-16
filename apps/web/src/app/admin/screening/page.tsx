import { listScreeningsForAdmin, type ScreeningVerdict } from "@coss/screening";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { ScanSearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { listHref, stringParam } from "@/components/admin/list-controls";
import { ScreeningVerdictBadge } from "@/components/admin/screening-verdict";
import { CursorPager } from "@/components/cursor-pager";
import { EmptyState } from "@/components/empty-state";
import { FilterLinks } from "@/components/filter-links";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelBody } from "@/components/panel";
import { formatDateTime, formatRelative } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Screening" };

type View = { value: string; label: string; verdicts: ScreeningVerdict[] };

const ATTENTION: View = {
  value: "attention",
  label: "Flagged & blocked",
  verdicts: ["flagged", "blocked"],
};

const VIEWS: View[] = [
  ATTENTION,
  { value: "blocked", label: "Blocked", verdicts: ["blocked"] },
  { value: "error", label: "Errors", verdicts: ["error"] },
  { value: "all", label: "All", verdicts: [] },
];

/** AI content screening verdicts of every organization, newest first. */
export default async function AdminScreeningPage({ searchParams }: PageProps<"/admin/screening">) {
  await requirePlatformAdmin();
  const search = await searchParams;
  const view = VIEWS.find((option) => option.value === stringParam(search.view)) ?? ATTENTION;
  const before = stringParam(search.before) || undefined;
  const page = await listScreeningsForAdmin({ verdicts: view.verdicts, before });
  const now = new Date();
  const viewParam = view.value === "attention" ? undefined : view.value;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description="Sampled live messages scored by the content classifier. Blocked messages fail and suspend their organization's sending (unless the policy is in shadow mode)."
        title="Screening"
      />
      <FilterLinks
        options={VIEWS.map((option) => ({
          value: option.value,
          label: option.label,
          href: listHref("/admin/screening", {
            view: option.value === "attention" ? undefined : option.value,
          }),
        }))}
        value={view.value}
      />
      <Panel>
        {page.items.length === 0 ? (
          <PanelBody flush>
            <EmptyState
              compact
              description="Nothing screened matches this view."
              icon={ScanSearchIcon}
              title="No screenings"
            />
          </PanelBody>
        ) : (
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Verdict</TableHead>
                <TableHead>Top category</TableHead>
                <TableHead>Model</TableHead>
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
                    <Link
                      className="font-medium hover:underline"
                      href={`/admin/organizations/${row.organizationId}/reputation`}
                    >
                      {row.organizationName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {row.product === "email" ? (
                      <Link
                        className="font-mono text-xs hover:underline"
                        href={`/admin/emails/${row.subjectId}`}
                      >
                        {row.subjectId}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs">{row.subjectId}</span>
                    )}
                    <span className="text-muted-foreground"> · #{row.sequence}</span>
                  </TableCell>
                  <TableCell>
                    <ScreeningVerdictBadge enforced={row.enforced} verdict={row.verdict} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {row.verdict === "error"
                      ? (row.errorMessage ?? "—")
                      : `${row.topCategory ?? "—"} ${row.topScore?.toFixed(2) ?? ""}`}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.model ?? row.classifier}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      <CursorPager
        newestHref={before ? listHref("/admin/screening", { view: viewParam }) : undefined}
        olderHref={
          page.nextCursor
            ? listHref("/admin/screening", { view: viewParam, before: page.nextCursor })
            : undefined
        }
        summary={`${page.items.length} screenings`}
      />
    </div>
  );
}
