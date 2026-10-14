import { cn } from "@coss/ui/lib/utils";
import type { ReactNode } from "react";

/**
 * The heading of a section page under an area's own `PageHeader` and tabs (a settings tab, a
 * billing sub-page): smaller than a page title, with the same description, meta and actions.
 */
export function SectionHeader(props: {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", props.className)}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="flex flex-wrap items-center gap-2 font-heading font-semibold text-lg tracking-[-0.01em]">
          {props.title}
        </h2>
        {props.description ? (
          <p className="max-w-2xl text-muted-foreground text-sm">{props.description}</p>
        ) : null}
        {props.meta ? (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-muted-foreground text-sm">
            {props.meta}
          </div>
        ) : null}
      </div>
      {props.actions ? (
        <div className="flex flex-wrap items-center gap-2">{props.actions}</div>
      ) : null}
    </div>
  );
}
