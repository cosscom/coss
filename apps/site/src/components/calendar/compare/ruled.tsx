import { Card } from "@coss/ui/components/card";
import { cn } from "@coss/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/calendar/ui/table";

/** A content card whose children meet its edge: tables, ruled lists. Clips without becoming a scroller. */
export function Panel({ className, ...props }: ComponentProps<typeof Card>) {
  return <Card className={cn("overflow-clip", className)} {...props} />;
}

/** Cells divided by hairlines: the card's own background shows through a 1px gap. */
export function PanelGrid({ className, ...props }: ComponentProps<typeof Card>) {
  return <Card className={cn("grid gap-px overflow-clip bg-border", className)} {...props} />;
}

export function PanelCell({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("h-full bg-card p-6", className)} {...props} />;
}

/* ui/table's prose variant in a card. Roles are explicit so a row can restack as a grid on a phone and still read as a table. */

export function RuledTable({
  caption,
  className,
  children,
}: {
  caption: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Panel>
      <Table variant="prose" role="table" className={className}>
        <TableCaption className="sr-only">{caption}</TableCaption>
        {children}
      </Table>
    </Panel>
  );
}

export function RuledHeader(props: ComponentProps<typeof TableHeader>) {
  return <TableHeader role="rowgroup" {...props} />;
}

export function RuledBody(props: ComponentProps<typeof TableBody>) {
  return <TableBody role="rowgroup" {...props} />;
}

export function RuledRow(props: ComponentProps<typeof TableRow>) {
  return <TableRow role="row" {...props} />;
}

export function RuledColumn(props: ComponentProps<typeof TableHead>) {
  return <TableHead role="columnheader" scope="col" {...props} />;
}

export function RuledRowHead(props: ComponentProps<typeof TableCell>) {
  return <TableCell role="rowheader" {...props} />;
}

export function RuledCell(props: ComponentProps<typeof TableCell>) {
  return <TableCell role="cell" {...props} />;
}
