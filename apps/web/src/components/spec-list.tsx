import { cn } from "@coss/ui/lib/utils";
import type { ReactNode } from "react";

/**
 * Key/value rows in the style of coss.com's spec sheet: the label, a dotted leader and the value
 * on the right. Rows are ruled; `columns={2}` splits them in two columns from `md`. Use inside a
 * `PanelBody flush` (it pads itself).
 */
export function SpecList(props: { columns?: 1 | 2; className?: string; children: ReactNode }) {
  return (
    // -mt-px tucks the first row's rule under the card's edge.
    <dl
      className={cn(
        "-mt-px grid gap-x-12 px-5",
        props.columns === 2 && "md:grid-cols-2",
        props.className,
      )}
    >
      {props.children}
    </dl>
  );
}

export function SpecItem(props: {
  label: ReactNode;
  /** Mono for ids, addresses and measured values. */
  mono?: boolean;
  /** Stack the value under the label (long values: headers, tag lists). */
  stacked?: boolean;
  children: ReactNode;
}) {
  if (props.stacked) {
    return (
      <div className="flex flex-col gap-2 border-t py-3">
        <dt className="text-muted-foreground text-sm">{props.label}</dt>
        <dd
          className={cn("min-w-0 break-words text-sm", props.mono && "font-mono text-[0.8125rem]")}
        >
          {props.children}
        </dd>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 items-baseline gap-3 border-t py-3">
      <dt className="shrink-0 text-muted-foreground text-sm">{props.label}</dt>
      <span aria-hidden className="leader" />
      <dd
        className={cn(
          "flex min-w-0 flex-wrap items-center justify-end gap-1.5 text-right text-sm [overflow-wrap:anywhere]",
          props.mono && "font-mono text-[0.8125rem]",
        )}
      >
        {props.children}
      </dd>
    </div>
  );
}
