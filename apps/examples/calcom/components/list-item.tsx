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
  sortableListeners?: SyntheticListenerMap;
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
  sortableListeners,
}: ListItemProps) {
  const hasLabelColor = labelColorLight || labelColorDark;
  const isDraggable = Boolean(sortableListeners || sortableRef);
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

  return (
    <div
      className={cn(
        "after:-z-1 after:-inset-px after:pointer-event-none relative flex translate-y-(--translate-y) after:absolute after:rounded-[inherit] after:border after:border-border after:bg-background after:transition-[background-color,border-radius,inset,border] first:rounded-t-[calc(var(--radius-xl)-1px)] last:rounded-b-[calc(var(--radius-xl)-1px)] has-[[data-slot=list-item-title]:hover]:after:bg-[color-mix(in_srgb,var(--color-background),var(--color-black)_2%)] dark:has-[[data-slot=list-item-title]_a:hover]:after:bg-[color-mix(in_srgb,var(--color-background),var(--color-white)_2%)]",
        isDraggable &&
          "before:pointer-events-none before:absolute before:inset-x-0 before:inset-y-[3px] not-data-dragged:before:hidden before:rounded-[calc(var(--radius-xl)-1px)] before:shadow-[0_1px_--theme(--color-black/6%)] data-dragging:pointer-events-none data-dragged:z-1 data-dragging:rounded-[calc(var(--radius-xl)-1px)] data-dragging:not-data-dragged:transition-transform data-dragging:after:inset-y-0.5 data-dragging:after:border data-dragged:after:bg-clip-padding data-dragged:after:shadow-lg/5 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
        className,
      )}
      data-dragged={sortableDragging ? "" : undefined}
      data-dragging={sortableDraggingAny ? "" : undefined}
      data-slot="list-item"
      ref={sortableRef}
      style={style}
      {...sortableListeners}
    >
      {hasLabelColor && (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 start-0 w-8 overflow-hidden before:absolute before:inset-y-0 before:start-0 before:w-0.5 before:bg-(--event-label-light) dark:before:bg-(--event-label-dark)",
            isDraggable &&
              "in-[[data-slot=list-item]:first-child]:-mt-px in-[[data-slot=list-item]:last-child]:-mb-px in-data-dragging:inset-y-[3px] in-data-dragging:rounded-s-[calc(var(--radius-xl)-2px)] in-[[data-slot=list-item]:first-child]:rounded-t-[calc(var(--radius-xl)-2px)] in-[[data-slot=list-item]:last-child]:rounded-b-[calc(var(--radius-xl)-2px)] transition-[border-radius,inset]",
          )}
          data-slot="list-item-label-color"
        />
      )}
      <div className="relative flex flex-1 items-center justify-between gap-4 px-6 py-4">
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
        "absolute inset-y-px start-0 z-1 h-auto! cursor-grab items-start bg-transparent! pt-4.5 in-[[data-slot=list-item]:hover,[data-slot=list-item][data-dragged]]:opacity-100 opacity-0 focus:opacity-100 focus-visible:ring-0 focus-visible:ring-offset-0 active:cursor-grabbing",
        className,
      )}
      data-slot="list-item-drag-handle"
      size="icon-xs"
      variant="ghost"
      {...listeners}
      {...attributes}
    >
      <GripVerticalIcon
        aria-hidden="true"
        className="in-[[data-slot=list-item-drag-handle]:hover,[data-slot=list-item-drag-handle]:focus-visible]:opacity-80 in-[[data-slot=list-item][data-dragged]]:opacity-100 opacity-40 transition-opacity"
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
  return <div className={cn("flex flex-col gap-1", className)}>{children}</div>;
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
