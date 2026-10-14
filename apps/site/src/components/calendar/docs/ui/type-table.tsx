import { cn } from "@coss/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import { TEXT_LINK } from "@/components/calendar/site/text-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/calendar/ui/table";
import { Chip } from "./pin";

export interface TypeNode {
  description?: ReactNode;
  type: ReactNode;
  typeDescription?: ReactNode;
  typeDescriptionLink?: string;
  default?: ReactNode;
  /** renders `name?` */
  optional?: boolean;
  deprecated?: boolean;
  parameters?: { name: string; description: ReactNode }[];
  returns?: ReactNode;
}

/** backtick spans in a plain-string description become inline code */
export function inline(text: ReactNode): ReactNode {
  if (typeof text !== "string") return text;
  return text.split(/(`[^`]+`)/).map((part, i) =>
    part.startsWith("`") ? (
      <code key={i} className="docs-inline-code">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}

export function TypeTable({
  type,
  label = "prop",
  id,
  className,
  ...props
}: ComponentProps<"div"> & {
  type: Record<string, TypeNode>;
  /** first column's header: what each row names */
  label?: string;
}) {
  return (
    <div id={id} {...props} className={cn("docs-table docs-typetable not-prose", className)}>
      <Table variant="prose" role="table">
        <TableHeader role="rowgroup">
          <TableRow role="row">
            <TableHead role="columnheader">{label}</TableHead>
            <TableHead role="columnheader">type · description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody role="rowgroup">
          {Object.entries(type).map(([name, item]) => (
            <TableRow
              key={name}
              role="row"
              id={id ? `${id}-${name}` : undefined}
              className="scroll-m-28"
            >
              <TableHead
                role="rowheader"
                scope="row"
                className="w-48 font-mono font-normal text-foreground"
              >
                <code className={cn(item.deprecated && "text-muted-foreground line-through")}>
                  {name}
                  {item.optional && <span className="text-muted-foreground">?</span>}
                </code>
              </TableHead>
              <TableCell role="cell">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {item.typeDescriptionLink ? (
                    <a
                      href={item.typeDescriptionLink}
                      className={cn(TEXT_LINK, "font-mono text-xs")}
                    >
                      {item.type}
                    </a>
                  ) : (
                    <code className="font-mono text-xs text-muted-foreground">{item.type}</code>
                  )}
                  {item.default != null && item.default !== "" && (
                    <Chip>
                      default&nbsp;<span className="text-foreground">{item.default}</span>
                    </Chip>
                  )}
                </div>
                {item.description && (
                  <p className="mt-1 text-muted-foreground">{inline(item.description)}</p>
                )}
                {item.typeDescription && (
                  <p className="mt-1.5 font-mono text-xs">{item.typeDescription}</p>
                )}
                {item.parameters && item.parameters.length > 0 && (
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    {item.parameters.map((p) => (
                      <div key={p.name} className="contents">
                        <dt className="font-mono text-xs text-foreground">{p.name}</dt>
                        <dd>{inline(p.description)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {item.returns && (
                  <p className="mt-1.5">
                    <span className="font-mono text-xs">returns</span> {inline(item.returns)}
                  </p>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
