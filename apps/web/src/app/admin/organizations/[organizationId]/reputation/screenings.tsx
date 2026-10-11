import type { ContentScreeningRow } from "@coss/screening";
import { Badge } from "@coss/ui/components/badge";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { formatDateTime } from "@/lib/format";

function VerdictBadge({ row }: { row: ContentScreeningRow }) {
  const shadow = row.enforced ? "" : " (shadow)";
  if (row.verdict === "blocked") return <Badge variant="error">blocked{shadow}</Badge>;
  if (row.verdict === "flagged") return <Badge variant="warning">flagged{shadow}</Badge>;
  if (row.verdict === "error") return <Badge variant="outline">error</Badge>;
  return <Badge variant="success">clean</Badge>;
}

/** The organization's latest AI content screenings (platform admins only). */
export function ContentScreenings({ screenings }: { screenings: ContentScreeningRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content screening</CardTitle>
        <CardDescription>
          Latest screened live messages. Scores are the classifier's probability for the top
          category.
        </CardDescription>
      </CardHeader>
      <CardPanel className="p-2">
        {screenings.length === 0 ? (
          <p className="px-4 py-3 text-muted-foreground text-sm">No messages screened yet.</p>
        ) : (
          <Table>
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
                    <span className="font-mono text-xs">{row.subjectId}</span>
                    <span className="text-muted-foreground"> · #{row.sequence}</span>
                  </TableCell>
                  <TableCell>
                    <VerdictBadge row={row} />
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
      </CardPanel>
    </Card>
  );
}
