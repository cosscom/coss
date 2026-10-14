import { cn } from "@coss/ui/lib/utils";
import type { ReactNode, Ref } from "react";

/* A static replica of the package's event block: the same tint and accent-bar pairs as its event palette. */

export type MiniEventColor = "blue" | "violet" | "amber" | "emerald";

const COLORS: Record<MiniEventColor, { tint: string; bar: string }> = {
  blue: { tint: "bg-blue-500/12 dark:bg-blue-400/16", bar: "bg-blue-500 dark:bg-blue-400" },
  violet: {
    tint: "bg-violet-500/12 dark:bg-violet-400/16",
    bar: "bg-violet-500 dark:bg-violet-400",
  },
  amber: { tint: "bg-amber-500/14 dark:bg-amber-400/16", bar: "bg-amber-500 dark:bg-amber-400" },
  emerald: {
    tint: "bg-emerald-500/12 dark:bg-emerald-400/16",
    bar: "bg-emerald-500 dark:bg-emerald-400",
  },
};

export function MiniEvent({
  color,
  title,
  time,
  inline = false,
  roomy = false,
  className,
  children,
  ref,
  ...rest
}: {
  color: MiniEventColor;
  title: string;
  time?: string;
  /** title and time share one line, the way the calendar sets a half-hour block */
  inline?: boolean;
  /** the calendar's type sizes for a block an hour or taller */
  roomy?: boolean;
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
} & React.HTMLAttributes<HTMLDivElement>) {
  const c = COLORS[color];
  return (
    <div {...rest} ref={ref} className={cn("rounded-md py-1 pr-2 pl-2.5", c.tint, className)}>
      <span aria-hidden className={cn("absolute inset-y-1 left-1 w-0.75 rounded-full", c.bar)} />
      {inline ? (
        <span className="block truncate text-xs">
          <span className="font-medium">{title}</span>
          {time && <span className="ml-1.5">{time}</span>}
        </span>
      ) : (
        <>
          <span className={cn("block truncate font-medium", roomy ? "text-sm" : "text-xs")}>
            {title}
          </span>
          {time && (
            <span className={cn("block truncate text-foreground", roomy ? "text-2xs" : "text-3xs")}>
              {time}
            </span>
          )}
        </>
      )}
      {children}
    </div>
  );
}
