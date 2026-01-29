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
        "after:-inset-px relative translate-y-(--translate-y) starting:rounded-2xl not-last:border-b bg-clip-padding not-data-drag-on:transition-[background-color,border-radius] after:pointer-events-none after:invisible after:absolute starting:after:inset-y-1 after:rounded-[inherit] after:border after:border-border after:bg-card after:transition-[border-radius,inset] first:rounded-t-2xl last:rounded-b-2xl has-[[data-slot=resource-item-title]:hover]:z-1 has-[[data-slot=resource-item-title]:hover]:bg-[color-mix(in_srgb,var(--color-card),var(--color-black)_2%)] data-drag-overlay:data-drag-release:hidden data-drag-overlay:pointer-events-none data-drag-on:not-data-drag-ghost:z-1 data-drag-on:rounded-2xl data-drag-on:transition-[translate] data-drag-on:after:visible data-drag-overlay:after:visible data-drag-on:after:inset-y-1 data-drag-overlay:after:inset-y-1 data-drag-on:after:rounded-2xl data-drag-overlay:after:rounded-2xl data-drag-ghost:after:border-dashed data-drag-ghost:after:bg-transparent not-dark:data-drag-overlay:after:bg-clip-padding data-drag-overlay:after:shadow-lg data-drag-ghost:*:opacity-0 dark:has-[[data-slot=resource-item-title]_a:hover]:bg-[color-mix(in_srgb,var(--color-card),var(--color-white)_2%)]",
        className,
      )}
      data-drag-ghost={sortableDragging ? "" : undefined}
      data-drag-on={sortableDraggingAny ? "" : undefined}
      data-drag-overlay={isOverlay ? "" : undefined}
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
        "pointer-events-auto absolute inset-y-px start-0 z-1 h-auto! cursor-grab items-start bg-transparent! pt-4.5 in-[[data-slot=resource-item]:hover,[data-slot=resource-item][data-drag-overlay],[data-drag-release]]:opacity-100 opacity-0 not-in-data-drag-release:transition-opacity focus:opacity-100 focus-visible:ring-0 focus-visible:ring-offset-0 active:cursor-grabbing",
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
