import { Skeleton } from "@coss/ui/components/skeleton";
import { cn } from "@coss/ui/lib/utils";
import type { CSSProperties, ReactNode } from "react";
import { Mono } from "@/components/calendar/site/section";

/** Controls on the left, results on the right, from `lg`. */
export const TOOL_SPLIT = "lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:divide-x lg:divide-y-0";

/** Nothing here clips: content that outgrows a pane shows up as page overflow instead of vanishing. */
export function ToolCard({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      data-tool-card
      style={style}
      className={cn("grid grid-cols-1 divide-y rounded-xl border bg-card", className)}
    >
      {children}
    </div>
  );
}

export function PaneStack({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 grid-cols-1 divide-y">{children}</div>;
}

export function Pane({
  label,
  action,
  className,
  children,
}: {
  label?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("min-w-0 p-6", className)}>
      {label && (
        <div className="mb-3 flex min-h-7 items-center justify-between gap-3">
          <h2 className="flex">
            <Mono>{label}</Mono>
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const LIST = "grid gap-x-8 gap-y-1.5 sm:grid-cols-2";

/** `pending` holds the rows' space until the client clock is known. */
export function Occurrences({
  dates,
  pending,
  slots,
  empty,
}: {
  dates: Date[];
  pending: boolean;
  slots: number;
  empty: string;
}) {
  if (pending) {
    return (
      <div aria-hidden className={LIST}>
        {Array.from({ length: slots }, (_, i) => (
          <Skeleton key={i} className="h-5 w-40" />
        ))}
      </div>
    );
  }
  if (dates.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ol className={LIST}>
      {dates.map((d, i) => (
        <li
          key={d.toISOString()}
          className="flex items-baseline gap-3 font-mono text-sm tabular-nums"
        >
          <span className="w-5 shrink-0 text-right text-muted-foreground">{i + 1}</span>
          <span>{DATE_FMT.format(d)}</span>
        </li>
      ))}
    </ol>
  );
}

export const occurrencesLabel = (count: number, pending: boolean) =>
  pending || count === 0
    ? "the next occurrences, from today"
    : count === 1
      ? "the next occurrence, from today"
      : `the next ${count} occurrences, from today`;
