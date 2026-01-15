import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { GripVerticalIcon } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

interface ListItemProps {
  labelColorLight?: string;
  labelColorDark?: string;
  children: ReactNode;
  className?: string;
  sortableRef?: (node: HTMLElement | null) => void;
  sortableStyle?: CSSProperties;
  sortableDragging?: boolean;
  sortableDraggingAny?: boolean;
  sortableOverPosition?: "first" | "last" | null;
}

export function ListItem({
  labelColorLight,
  labelColorDark,
  children,
  className,
  sortableRef,
  sortableStyle,
  sortableDragging,
  sortableDraggingAny,
  sortableOverPosition,
}: ListItemProps) {
  const hasLabelColor = labelColorLight || labelColorDark;
  const isSortable = sortableRef !== undefined;
  const labelStyle = hasLabelColor
    ? ({
        "--event-label-dark": labelColorDark || "transparent",
        "--event-label-light": labelColorLight || "transparent",
      } as CSSProperties)
    : undefined;

  const style =
    labelStyle || sortableStyle
      ? { ...labelStyle, ...sortableStyle }
      : undefined;

  const dataDragging = sortableDraggingAny
    ? sortableDragging
      ? "true"
      : "false"
    : undefined;

  return (
    <div
      className={cn(
        "relative flex transition-colors first:not-data-[dragging=true]:rounded-t-[calc(var(--radius-xl)-1px)] last:not-data-[dragging=true]:rounded-b-[calc(var(--radius-xl)-1px)] has-[[data-slot=list-item-title]:hover]:bg-[color-mix(in_srgb,var(--color-background),var(--color-black)_2%)] dark:has-[[data-slot=list-item-title]_a:hover]:bg-[color-mix(in_srgb,var(--color-background),var(--color-white)_2%)]",
        isSortable &&
          "z-(--index) translate-y-(--translate-y) before:absolute before:inset-0 before:rounded-[inherit] data-[dragging=false]:opacity-64 data-[dragging=false]:transition-transform data-[over-position=first]:before:rounded-t-[calc(var(--radius-xl)-1px)] data-[over-position=last]:before:rounded-b-[calc(var(--radius-xl)-1px)] data-[dragging=true]:before:bg-popover data-[dragging=true]:before:shadow-[inset_0_1px_0_var(--color-input),inset_0_-1px_0_var(--color-input)]",
        className,
      )}
      data-dragging={dataDragging}
      data-over-position={sortableOverPosition ?? undefined}
      data-slot="list-item"
      ref={sortableRef}
      style={style}
    >
      {hasLabelColor && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 start-0 w-8 overflow-hidden in-[[data-slot=list-item]:not([data-dragging=true]):first-child,[data-over-position=first]]:rounded-t-[calc(var(--radius-xl)-1px)] in-[[data-slot=list-item]:last-child:not([data-dragging=true]),[data-over-position=last]]:rounded-b-[calc(var(--radius-xl)-1px)] before:absolute before:inset-y-0 before:start-0 before:w-0.5 before:bg-(--event-label-light) dark:before:bg-(--event-label-dark)"
        />
      )}
      <div className="flex flex-1 items-center justify-between gap-4 px-6 py-4">
        {children}
      </div>
    </div>
  );
}

interface ListItemDragHandleProps {
  className?: string;
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
}

export function ListItemDragHandle({
  className,
  listeners,
  attributes,
}: ListItemDragHandleProps) {
  return (
    <Button
      aria-label="Drag to reorder"
      className={cn(
        "after:-inset-2 -translate-y-1/2 -ms-3 absolute start-0 top-1/2 z-1 cursor-grab bg-popover! in-[[data-slot=list-item]:has([data-slot=list-item-title]:hover)]:opacity-100 opacity-0 transition-[opacity,box-shadow] after:absolute hover:border-ring/80 hover:opacity-100 focus:opacity-100 active:cursor-grabbing",
        className,
      )}
      data-slot="list-item-drag-handle"
      size="icon-xs"
      variant="outline"
      {...listeners}
      {...attributes}
    >
      <GripVerticalIcon
        aria-hidden="true"
        className="not-in-[[data-slot=list-item-drag-handle]:hover]:opacity-48"
      />
    </Button>
  );
}

interface ListItemContentProps {
  children: ReactNode;
  className?: string;
}

export function ListItemContent({ children, className }: ListItemContentProps) {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-3", className)}>
      {children}
    </div>
  );
}

interface ListItemHeaderProps {
  children: ReactNode;
  className?: string;
}

export function ListItemHeader({ children, className }: ListItemHeaderProps) {
  return (
    <div className={cn("relative flex flex-col gap-1", className)}>
      {children}
    </div>
  );
}

interface ListItemTitleProps
  extends Omit<ComponentProps<typeof Link>, "className"> {
  children: ReactNode;
  className?: string;
}

export function ListItemTitle({
  children,
  className,
  ...linkProps
}: ListItemTitleProps) {
  return (
    <h2
      className={cn("font-medium sm:text-sm", className)}
      data-slot="list-item-title"
    >
      <Link className="before:absolute before:inset-0" {...linkProps}>
        {children}
      </Link>
    </h2>
  );
}

interface ListItemDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function ListItemDescription({
  children,
  className,
}: ListItemDescriptionProps) {
  return (
    <p
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="list-item-description"
    >
      {children}
    </p>
  );
}

interface ListItemBadgesProps {
  children: ReactNode;
  className?: string;
}

export function ListItemBadges({ children, className }: ListItemBadgesProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      data-slot="list-item-badges"
    >
      {children}
    </div>
  );
}

interface ListItemActionsProps {
  children: ReactNode;
  className?: string;
}

export function ListItemActions({ children, className }: ListItemActionsProps) {
  return (
    <div
      className={cn("relative flex items-center", className)}
      data-slot="list-item-actions"
    >
      {children}
    </div>
  );
}
