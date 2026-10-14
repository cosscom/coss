import { Card } from "@coss/ui/components/card";
import { cn } from "@coss/ui/lib/utils";
import type { ReactNode } from "react";

/** A slice of the week grid at 4 PM with the now line at 4:04. `children` is the event, positioned by the caller. */
export function GridFragment({
  now = "now",
  children,
  className,
}: {
  now?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("w-full max-w-sm overflow-clip text-left", className)}>
      <div className="relative h-36">
        <div className="absolute inset-x-0 top-8 border-t" />
        <div className="absolute inset-x-0 top-24 border-t" />
        <span className="absolute top-8 left-2 -translate-y-1/2 bg-card px-1 text-3xs font-medium text-muted-foreground">
          4 PM
        </span>
        <span className="absolute top-24 left-2 -translate-y-1/2 bg-card px-1 text-3xs font-medium text-muted-foreground">
          5 PM
        </span>
        {children}
        <div className="absolute inset-x-0 top-11.25">
          <div className="absolute right-0 left-12 h-px bg-brand" />
          <div className="absolute top-1/2 left-12 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand" />
          <span className="absolute -top-0.5 right-2 -translate-y-full text-3xs font-semibold text-brand-foreground">
            {now}
          </span>
        </div>
      </div>
    </Card>
  );
}

/** Where an event sits inside the fragment: starts at 4:04. Add a height or bottom. */
export const GRID_FRAGMENT_SLOT = "absolute top-11.5 right-4 left-14";
