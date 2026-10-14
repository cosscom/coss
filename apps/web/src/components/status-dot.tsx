import { cn } from "@coss/ui/lib/utils";
import type { ReactNode } from "react";

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

const DOT: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground/56",
};

/** A status as a coloured dot and its label; `pulse` marks something live. */
export function StatusDot(props: {
  tone: StatusTone;
  pulse?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", props.className)}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          DOT[props.tone],
          props.pulse && "motion-safe:animate-pulse",
        )}
      />
      {props.children}
    </span>
  );
}
