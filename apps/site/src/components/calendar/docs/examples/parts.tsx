"use client";

import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import { formatViewTitle, useIsClient, useKloq } from "kloq";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";

/** The strip an example hangs its controls and readouts on; same box as `Kloq.Toolbar`. */
export function Bar({
  edge = "bottom",
  className,
  ...props
}: ComponentProps<"div"> & { edge?: "top" | "bottom" }) {
  return (
    <div
      {...props}
      className={cn(
        "flex min-h-11 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 font-mono text-xs text-muted-foreground",
        edge === "bottom" ? "border-b" : "border-t",
        className,
      )}
    />
  );
}

export function Dot({ live, className, ...props }: ComponentProps<"span"> & { live?: boolean }) {
  return (
    <span
      aria-hidden
      {...props}
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        live ? "bg-brand motion-safe:animate-pulse" : "bg-border",
        className,
      )}
    />
  );
}

/** Previous / next / today for a calendar whose view is fixed. Must render inside `<Kloq>`. */
export function Nav({ locale }: { locale?: string }) {
  const k = useKloq();
  const isClient = useIsClient();
  return (
    <div className="flex min-w-0 items-center gap-1">
      <Button variant="ghost" size="icon-xs" aria-label="Previous" onClick={() => k.step(-1)}>
        <ChevronLeft />
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label="Next" onClick={() => k.step(1)}>
        <ChevronRight />
      </Button>
      <Button
        variant="ghost"
        size="xs"
        className={cn(k.atToday && "text-muted-foreground")}
        onClick={k.goToday}
      >
        Today
      </Button>
      <span className="ms-1 truncate text-sm font-medium text-foreground tabular-nums sm:text-xs">
        {isClient ? formatViewTitle(k.view, locale, { short: k.narrow }) : null}
      </span>
    </div>
  );
}
