import { cn } from "@coss/ui/lib/utils";
import type { ReactNode } from "react";

export function Pin({ n, className }: { n: number | string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid size-5 shrink-0 place-items-center rounded-full bg-brand font-mono text-3xs font-semibold leading-none text-white tabular-nums",
        className,
      )}
    >
      {n}
    </span>
  );
}

/** `items` are joined with a middle dot that travels with the item after it, so a wrap never strands one; `children` is a single label. */
export function Eyebrow({
  index,
  items,
  children,
  className,
}: {
  index?: string;
  items?: ReactNode[];
  children?: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-2 font-mono text-xs text-muted-foreground",
        className,
      )}
    >
      {index && <span className="mr-1 text-brand-foreground tabular-nums">{index}</span>}
      {items
        ? items.map((item, i) => (
            <span key={i}>
              {i > 0 && (
                <span aria-hidden className="mr-2">
                  ·
                </span>
              )}
              {item}
            </span>
          ))
        : children != null && <span>{children}</span>}
    </p>
  );
}
