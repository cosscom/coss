import { PLAN_KEYS, PLANS } from "@coss/billing/catalog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { CheckIcon, MinusIcon } from "lucide-react";
import { planRows } from "@/lib/billing-text";

function Value({ value }: { value: string }) {
  if (value === "Yes") {
    return (
      <>
        <CheckIcon aria-hidden className="size-4" />
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (value === "—") {
    return (
      <>
        <MinusIcon aria-hidden className="size-4 text-muted-foreground/64" />
        <span className="sr-only">Not included</span>
      </>
    );
  }
  return value;
}

/**
 * Every plan's limits and features (the same rows as the billing guide's table). Narrow screens
 * scroll the table sideways with the row labels pinned.
 */
export function PlanComparison() {
  return (
    <Table className="min-w-[44rem] table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="sticky left-0 z-10 w-1/5 bg-background">
            <span className="sr-only">Plan</span>
          </TableHead>
          {PLAN_KEYS.map((key) => (
            <TableHead className="text-foreground" key={key}>
              {PLANS[key].name}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {planRows().map((row) => (
          <TableRow key={row.label}>
            <TableHead
              className="sticky left-0 z-10 h-auto whitespace-normal bg-background py-3 font-normal"
              scope="row"
            >
              {row.label}
            </TableHead>
            {row.values.map((value, index) => (
              <TableCell className="whitespace-normal py-3 leading-snug" key={PLAN_KEYS[index]}>
                <Value value={value} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
