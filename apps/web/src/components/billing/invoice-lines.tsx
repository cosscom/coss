import type { DraftLine } from "@coss/billing/engine";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { formatCents, formatPeriodRange } from "@/lib/billing-format";

type Line = Pick<DraftLine, "kind" | "description" | "amountCents"> & {
  id?: string;
  periodStart?: Date;
  periodEnd?: Date;
  period?: DraftLine["period"];
};

/** An invoice's (or a preview's) lines with their total. */
export function InvoiceLinesTable(props: { lines: readonly Line[]; totalLabel?: string }) {
  const total = props.lines.reduce((sum, line) => sum + line.amountCents, 0n);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Description</TableHead>
          <TableHead>Period</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.lines.map((line, index) => {
          const start = line.periodStart ?? line.period?.start;
          const end = line.periodEnd ?? line.period?.end;
          return (
            <TableRow key={line.id ?? index}>
              <TableCell className={line.amountCents < 0n ? "text-muted-foreground" : undefined}>
                {line.description}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {start && end ? formatPeriodRange(start, end) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCents(line.amountCents)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-medium" colSpan={2}>
            {props.totalLabel ?? "Total"}
          </TableCell>
          <TableCell className="text-right font-medium tabular-nums">
            {formatCents(total)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
