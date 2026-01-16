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
        "not-first:-mt-px relative flex not-first:border-t not-last:border-b bg-background transition-colors first:rounded-t-[calc(var(--radius-xl)-1px)] last:rounded-b-[calc(var(--radius-xl)-1px)] has-[[data-slot=list-item-title]:hover]:z-1 has-[[data-slot=list-item-title]:hover]:bg-[color-mix(in_srgb,var(--color-background),var(--color-black)_2%)] dark:has-[[data-slot=list-item-title]_a:hover]:bg-[color-mix(in_srgb,var(--color-background),var(--color-white)_2%)]",
        isSortable &&
          "translate-y-(--translate-y) data-dragging:pointer-events-none data-[dragging=true]:z-1 data-[dragging=true]:rounded-[calc(var(--radius-xl)-1px)] data-[dragging=true]:bg-popover data-[dragging=true]:bg-clip-padding data-[dragging=true]:shadow-lg/5 data-[dragging=false]:transition-transform data-[dragging=true]:*:data-[slot=list-item-label-color]:rounded-[calc(var(--radius-xl)-1px)] last:*:data-[slot=list-item-label-color]:rounded-b-[calc(var(--radius-xl)-1px)] first:*:data-[slot=list-item-label-color]:rounded-t-[calc(var(--radius-xl)-1px)]",
        className,
      )}
      data-dragging={dataDragging}
      data-slot="list-item"
      ref={sortableRef}
      style={style}
      {...sortableListeners}
    >
      {hasLabelColor && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 start-0 w-8 overflow-hidden transition-[border-radius] before:absolute before:inset-y-0 before:start-0 before:w-0.5 before:bg-(--event-label-light) dark:before:bg-(--event-label-dark)"
          data-slot="list-item-label-color"
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
        "absolute inset-y-0 start-0 z-1 h-full! cursor-grab items-start bg-transparent! pt-4.5 in-[[data-slot=list-item]:hover,[data-slot=list-item][data-dragging=true]]:opacity-100 opacity-0 transition-[opacity,box-shadow] focus:opacity-100 active:cursor-grabbing",
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
        className="in-[[data-slot=list-item-drag-handle]:hover,[data-slot=list-item][data-dragging=true]]:opacity-80 opacity-48"
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
