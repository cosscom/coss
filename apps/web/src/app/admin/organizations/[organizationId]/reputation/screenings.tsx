import type { ContentScreeningRow } from "@coss/screening";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import Link from "next/link";
import { ScreeningVerdictBadge } from "@/components/admin/screening-verdict";
import { Panel, PanelBody, PanelDescription, PanelHeader, PanelTitle } from "@/components/panel";
import { formatDateTime } from "@/lib/format";

/** The organization's latest AI content screenings (platform admins only). */
export function ContentScreenings({ screenings }: { screenings: ContentScreeningRow[] }) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Content screening</PanelTitle>
        <PanelDescription>
          Latest screened live messages. Scores are the classifier's probability for the top
          category.
        </PanelDescription>
      </PanelHeader>
      {screenings.length === 0 ? (
        <PanelBody className="text-muted-foreground text-sm">No messages screened yet.</PanelBody>
      ) : (
        <Table variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Verdict</TableHead>
              <TableHead>Top category</TableHead>
              <TableHead>Model</TableHead>
              <TableHead className="text-right">Latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {screenings.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(row.createdAt)}
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
                    : `${row.topCategory} ${row.topScore?.toFixed(2)}`}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.model ?? row.classifier}
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.latencyMs} ms</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
