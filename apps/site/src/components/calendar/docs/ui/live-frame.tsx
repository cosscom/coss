import { cn } from "@coss/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import { LiveDot } from "./pin";

export function LiveFrame({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "@container not-prose my-6 overflow-hidden rounded-xl border bg-card shadow-sm",
        className,
      )}
    />
  );
}

export function StatusBar({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "flex min-h-9 flex-wrap items-stretch justify-between gap-x-4 border-b px-4 font-mono text-xs text-muted-foreground",
        className,
      )}
    />
  );
}

export function StatusText({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 py-2", className)}
    />
  );
}

export function Live({ children = "live" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-foreground">
      <LiveDot />
      {children}
    </span>
  );
}

export function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground">
      ·
    </span>
  );
}
