import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { GripVerticalIcon } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { ItemLabel } from "./item-label";

export { ItemLabel };

interface ResourceItemProps {
  labelColorLight?: string;
  labelColorDark?: string;
  children: ReactNode;
  className?: string;
  isOverlay?: boolean;
  sortableRef?: (node: HTMLElement | null) => void;
  sortableStyle?: CSSProperties;
  sortableDragging?: boolean;
  sortableDraggingAny?: boolean;
  sortableListeners?: SyntheticListenerMap;
}

export function ResourceItem({
  labelColorLight,
  labelColorDark,
  children,
  className,
  isOverlay,
  sortableRef,
  sortableStyle,
  sortableDragging,
  sortableDraggingAny,
  sortableListeners,
}: ResourceItemProps) {
  return (
    <div
      className={cn(
        "relative translate-y-(--translate-y) not-last:border-b bg-clip-padding not-data-dragging:transition-[background-color,border-radius] first:rounded-t-2xl last:rounded-b-2xl has-[[data-slot=resource-item-title]:hover]:z-1 has-[[data-slot=resource-item-title]:hover]:bg-[color-mix(in_srgb,var(--color-card),var(--color-black)_2%)] data-dragging:not-data-dragged:z-1 data-dragging:rounded-2xl data-dragging:transition-[translate] dark:has-[[data-slot=resource-item-title]_a:hover]:bg-[color-mix(in_srgb,var(--color-card),var(--color-white)_2%)]",
        "after:-inset-px starting:rounded-2xl after:pointer-events-none after:invisible after:absolute starting:after:inset-y-1 after:rounded-[inherit] after:border after:border-border after:bg-card data-overlay:pointer-events-none data-dragging:after:visible data-overlay:after:visible data-dragging:after:inset-y-1 data-overlay:after:inset-y-1 data-dragging:after:rounded-2xl data-overlay:after:rounded-2xl data-dragged:after:border-dashed data-dragged:after:bg-transparent not-dark:data-overlay:after:bg-clip-padding data-overlay:after:shadow-lg data-dragged:*:opacity-0",
        "after:transition-[border-radius,inset]",
        "data-overlay:data-drag-ended:hidden",
        className,
      )}
      data-dragged={sortableDragging ? "" : undefined}
      data-dragging={sortableDraggingAny ? "" : undefined}
      data-overlay={isOverlay ? "" : undefined}
      data-slot="resource-item"
      ref={sortableRef}
      style={sortableStyle}
      {...sortableListeners}
    >
      <div className="relative z-1 flex items-center justify-between gap-4 px-6 py-4">
        <ItemLabel colorDark={labelColorDark} colorLight={labelColorLight} />
        {children}
      </div>
    </div>
  );
}

interface ResourceItemDragHandleProps {
  className?: string;
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
}

export function ResourceItemDragHandle({
  className,
  listeners,
  attributes,
}: ResourceItemDragHandleProps) {
  return (
    <Button
      aria-label="Drag to reorder"
      className={cn(
        "pointer-events-auto absolute inset-y-px start-0 z-1 h-auto! cursor-grab items-start bg-transparent! pt-4.5 in-[[data-slot=resource-item]:hover,[data-slot=resource-item][data-overlay],[data-drag-ended]]:opacity-100 opacity-0 not-in-data-drag-ended:transition-opacity focus:opacity-100 focus-visible:ring-0 focus-visible:ring-offset-0 active:cursor-grabbing",
        className,
      )}
      data-slot="resource-item-drag-handle"
      size="icon-xs"
      variant="ghost"
      {...listeners}
      {...attributes}
    >
      <GripVerticalIcon
        aria-hidden="true"
        className="in-[[data-slot=resource-item-drag-handle]:hover,[data-slot=resource-item-drag-handle]:focus-visible]:opacity-100 opacity-40"
      />
    </Button>
  );
}

interface ResourceItemContentProps {
  children: ReactNode;
  className?: string;
}

export function ResourceItemContent({
  children,
  className,
}: ResourceItemContentProps) {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-3", className)}>
      {children}
    </div>
  );
}

interface ResourceItemHeaderProps {
  children: ReactNode;
  className?: string;
}

export function ResourceItemHeader({
  children,
  className,
}: ResourceItemHeaderProps) {
  return <div className={cn("flex flex-col gap-1", className)}>{children}</div>;
}

interface ResourceItemTitleProps
  extends Omit<ComponentProps<typeof Link>, "className"> {
  children: ReactNode;
  className?: string;
}

export function ResourceItemTitle({
  children,
  className,
  ...linkProps
}: ResourceItemTitleProps) {
  return (
    <h2
      className={cn("font-semibold sm:text-sm", className)}
      data-slot="resource-item-title"
    >
      <Link className="before:absolute before:inset-0" {...linkProps}>
        {children}
      </Link>
    </h2>
  );
}

interface ResourceItemDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function ResourceItemDescription({
  children,
  className,
}: ResourceItemDescriptionProps) {
  return (
    <p
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="resource-item-description"
    >
      {children}
    </p>
  );
}

interface ResourceItemBadgesProps {
  children: ReactNode;
  className?: string;
}

export function ResourceItemBadges({
  children,
  className,
}: ResourceItemBadgesProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      data-slot="resource-item-badges"
    >
      {children}
    </div>
  );
}

interface ResourceItemActionsProps {
  children: ReactNode;
  className?: string;
}

export function ResourceItemActions({
  children,
  className,
}: ResourceItemActionsProps) {
  return (
    <div
      className={cn("relative flex items-center", className)}
      data-slot="resource-item-actions"
    >
      {children}
    </div>
  );
}
