import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";
import { GRID_FRAGMENT_SLOT, GridFragment } from "./grid-fragment";

/** The 4:04 page body, without chrome. `actions` replaces the default "Back to today". */
export function NotFoundContent({
  actions,
  className,
}: {
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center",
        className,
      )}
    >
      <h1 className="font-heading leading-none tracking-tight">
        <span className="sr-only">404 — page not found</span>
        <span aria-hidden className="inline-flex items-center text-8xl font-semibold sm:text-9xl">
          4:04
        </span>
      </h1>
      <p className="max-w-sm text-balance text-muted-foreground">
        This page isn&apos;t on the calendar. It may have been moved, declined, or never scheduled
        in the first place.
      </p>
      <GridFragment now="4:04">
        <div
          className={cn(
            GRID_FRAGMENT_SLOT,
            "-bottom-px rounded-t-md border border-b-0 border-dashed bg-muted/50 px-3 py-1.5",
          )}
        >
          <span className="text-xs font-medium text-muted-foreground line-through">This page</span>
          <span className="block text-3xs text-muted-foreground">
            4:04 PM — whenever · declined by the server
          </span>
        </div>
      </GridFragment>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {actions ?? <Button render={<Link href="/calendar" />}>Back to today</Button>}
      </div>
    </div>
  );
}
