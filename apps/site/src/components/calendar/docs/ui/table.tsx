import type { ComponentProps } from "react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  Table as TablePrimitive,
  TableRow,
} from "@/components/calendar/ui/table";

/**
 * Markdown tables on the table primitive's prose variant. components.css stacks the rows when the
 * column is narrow, which drops the implicit table roles in some browsers — so they are spelled out.
 */
export const tableComponents = {
  table: (props: ComponentProps<"table">) => (
    <div className="docs-table not-prose">
      <TablePrimitive variant="prose" role="table" {...props} />
    </div>
  ),
  thead: (props: ComponentProps<"thead">) => <TableHeader role="rowgroup" {...props} />,
  tbody: (props: ComponentProps<"tbody">) => <TableBody role="rowgroup" {...props} />,
  tr: (props: ComponentProps<"tr">) => <TableRow role="row" {...props} />,
  th: (props: ComponentProps<"th">) => <TableHead role="columnheader" {...props} />,
  td: (props: ComponentProps<"td">) => <TableCell role="cell" {...props} />,
};
