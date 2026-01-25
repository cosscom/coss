import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import { cn } from "@coss/ui/lib/utils";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { GripVerticalIcon } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

interface SingleItemProps {
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

export function SingleItem({
  labelColorLight,
  labelColorDark,
  children,
  className,
  sortableRef,
  sortableStyle,
  sortableDragging,
  sortableDraggingAny,
  sortableListeners,
}: SingleItemProps) {
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
    <Card
      className={cn(
        "translate-y-(--translate-y) transition-[background-color] has-[[data-slot=single-item-title]:hover]:z-1 has-[[data-slot=single-item-title]:hover]:bg-[color-mix(in_srgb,var(--color-card),var(--color-black)_2%)] dark:has-[[data-slot=single-item-title]_a:hover]:bg-[color-mix(in_srgb,var(--color-card),var(--color-white)_2%)]",
        isDraggable &&
          "data-dragging:pointer-events-none data-dragged:z-1 data-dragged:shadow-lg/5 data-dragging:not-data-dragged:transition-transform",
        className,
      )}
      data-dragged={sortableDragging ? "" : undefined}
      data-dragging={sortableDraggingAny ? "" : undefined}
      data-slot="single-item"
      ref={sortableRef}
      style={style}
      {...sortableListeners}
    >
      <CardPanel className="flex items-center justify-between gap-4 px-6 py-4">
        {hasLabelColor && (
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-4.5 start-2.5 in-[[data-slot=single-item]:hover,[data-slot=single-item][data-dragged]]:top-11 w-[3px] rounded-full bg-(--event-label-light) transition-[top] dark:before:bg-(--event-label-dark)",
            )}
            data-slot="single-item-label-color"
          />
        )}
        {children}
      </CardPanel>
    </Card>
  );
}

interface SingleItemDragHandleProps {
  className?: string;
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
}

export function SingleItemDragHandle({
  className,
  listeners,
  attributes,
}: SingleItemDragHandleProps) {
  return (
    <Button
      aria-label="Drag to reorder"
      className={cn(
        "absolute inset-y-px start-0 z-1 h-auto! cursor-grab items-start bg-transparent! pt-4.5 in-[[data-slot=single-item]:hover,[data-slot=single-item][data-dragged]]:opacity-100 opacity-0 focus:opacity-100 focus-visible:ring-0 focus-visible:ring-offset-0 active:cursor-grabbing",
        className,
      )}
      data-slot="single-item-drag-handle"
      size="icon-xs"
      variant="ghost"
      {...listeners}
      {...attributes}
    >
      <GripVerticalIcon
        aria-hidden="true"
        className="in-[[data-slot=single-item-drag-handle]:hover,[data-slot=single-item-drag-handle]:focus-visible]:opacity-80 in-[[data-slot=single-item][data-dragged]]:opacity-100 opacity-40 transition-opacity"
      />
    </Button>
  );
}

interface SingleItemContentProps {
  children: ReactNode;
  className?: string;
}

export function SingleItemContent({
  children,
  className,
}: SingleItemContentProps) {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-3", className)}>
      {children}
    </div>
  );
}

interface SingleItemHeaderProps {
  children: ReactNode;
  className?: string;
}

export function SingleItemHeader({
  children,
  className,
}: SingleItemHeaderProps) {
  return <div className={cn("flex flex-col gap-1", className)}>{children}</div>;
}

interface SingleItemTitleProps
  extends Omit<ComponentProps<typeof Link>, "className"> {
  children: ReactNode;
  className?: string;
}

export function SingleItemTitle({
  children,
  className,
  ...linkProps
}: SingleItemTitleProps) {
  return (
    <h2
      className={cn("font-semibold sm:text-sm", className)}
      data-slot="single-item-title"
    >
      <Link className="before:absolute before:inset-0" {...linkProps}>
        {children}
      </Link>
    </h2>
  );
}

interface SingleItemDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function SingleItemDescription({
  children,
  className,
}: SingleItemDescriptionProps) {
  return (
    <p
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="single-item-description"
    >
      {children}
    </p>
  );
}

interface SingleItemBadgesProps {
  children: ReactNode;
  className?: string;
}

export function SingleItemBadges({
  children,
  className,
}: SingleItemBadgesProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      data-slot="single-item-badges"
    >
      {children}
    </div>
  );
}

interface SingleItemActionsProps {
  children: ReactNode;
  className?: string;
}

export function SingleItemActions({
  children,
  className,
}: SingleItemActionsProps) {
  return (
    <div
      className={cn("relative flex items-center", className)}
      data-slot="single-item-actions"
    >
      {children}
    </div>
  );
}
