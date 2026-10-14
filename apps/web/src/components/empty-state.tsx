import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coss/ui/components/empty";
import { cn } from "@coss/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Nothing to show yet: an icon tile on the drafting grid, a title, what would appear here, and
 * (optionally) the one action that fills it. `compact` fits inside a panel.
 */
export function EmptyState(props: {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const Icon = props.icon;
  return (
    <Empty
      className={cn(
        "drafting-grid rounded-[inherit]",
        props.compact ? "gap-4 py-10 md:py-12" : "py-16 md:py-24",
        props.className,
      )}
    >
      <EmptyHeader>
        <EmptyMedia className={props.compact ? "mb-4" : undefined} variant="icon">
          <Icon strokeWidth={1.75} />
        </EmptyMedia>
        <EmptyTitle className={props.compact ? "text-base" : "text-lg"}>{props.title}</EmptyTitle>
        {props.description ? <EmptyDescription>{props.description}</EmptyDescription> : null}
      </EmptyHeader>
      {props.action ? <EmptyContent>{props.action}</EmptyContent> : null}
    </Empty>
  );
}
