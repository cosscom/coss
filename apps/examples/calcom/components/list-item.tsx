import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { GripVerticalIcon } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ItemLabel } from "./item-label";

const sortableListClasses =
  "has-[[data-drag-ghost],[data-drag-release]]:border-transparent has-[[data-drag-ghost],[data-drag-release]]:bg-transparent has-[[data-drag-ghost],[data-drag-release]]:shadow-none has-[[data-drag-ghost],[data-drag-release]]:before:hidden has-[[data-drag-ghost],[data-drag-release]]:**:data-[slot=list-item]:border-transparent has-[[data-drag-ghost],[data-drag-release]]:**:data-[slot=list-item]:after:visible";

interface ListItemProps {
  children: ReactNode;
  className?: string;
  sortable?: boolean;
  labelColorLight?: string;
  labelColorDark?: string;
  isOverlay?: boolean;
  sortableRef?: (node: HTMLElement | null) => void;
  sortableStyle?: CSSProperties;
  sortableDragging?: boolean;
  sortableDraggingAny?: boolean;
  sortableListeners?: SyntheticListenerMap;
  hasDragged?: boolean;
}

function ListItem({
  children,
  className,
  sortable = false,
  labelColorLight,
  labelColorDark,
  isOverlay,
  sortableRef,
  sortableStyle,
  sortableDragging,
  sortableDraggingAny,
  sortableListeners,
  hasDragged,
}: ListItemProps) {
  const baseClasses =
    "not-last:border-b bg-clip-padding has-[[data-slot=list-item-title]_a:hover]:z-1 has-[[data-slot=list-item-title]_a:hover]:bg-[color-mix(in_srgb,var(--card),var(--color-black)_2%)] dark:has-[[data-slot=list-item-title]_a:hover]:bg-[color-mix(in_srgb,var(--card),var(--color-white)_2%)]";

  const staticClasses =
    "transition-[background-color] first:rounded-t-[calc(var(--radius-xl)+1px)] last:rounded-b-[calc(var(--radius-xl)+1px)]";

  const sortableClasses =
    "after:-inset-px relative translate-y-(--translate-y) data-has-dragged:starting:rounded-2xl not-data-drag-on:transition-[background-color] data-has-dragged:not-data-drag-on:transition-[background-color,border-radius] after:pointer-events-none after:invisible after:absolute data-has-dragged:starting:after:inset-y-1 data-has-dragged:starting:after:rounded-2xl first:after:rounded-t-2xl last:after:rounded-b-2xl after:border after:border-border after:bg-card after:transition-[border-radius,inset] first:rounded-t-2xl last:rounded-b-2xl data-drag-overlay:data-drag-release:hidden data-drag-overlay:pointer-events-none data-drag-on:not-data-drag-ghost:z-1 data-drag-on:rounded-2xl data-drag-on:transition-[translate] data-drag-on:after:visible data-drag-overlay:after:visible data-drag-on:after:inset-y-1 data-drag-overlay:after:inset-y-1 data-drag-on:after:rounded-2xl data-drag-overlay:after:rounded-2xl data-drag-ghost:after:border-dashed data-drag-ghost:after:bg-muted/24 not-dark:data-drag-overlay:after:bg-clip-padding data-drag-overlay:after:shadow-lg data-drag-ghost:*:opacity-0 before:pointer-events-none before:absolute before:inset-x-0 before:inset-y-[5px] before:rounded-[calc(var(--radius-2xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)] not-data-drag-overlay:before:hidden before:z-1";

  return (
    <div
      className={cn(
        baseClasses,
        sortable ? sortableClasses : staticClasses,
        className,
      )}
      data-drag-ghost={sortable && sortableDragging ? "" : undefined}
      data-drag-on={sortable && sortableDraggingAny ? "" : undefined}
      data-drag-overlay={sortable && isOverlay ? "" : undefined}
      data-draggable={sortable ? "" : undefined}
      data-has-dragged={sortable && hasDragged ? "" : undefined}
      data-slot="list-item"
      ref={sortable ? sortableRef : undefined}
      style={sortable ? sortableStyle : undefined}
      {...(sortable ? sortableListeners : {})}
    >
      <div
        className={cn(
          "relative flex items-center justify-between gap-4 px-6 py-4",
          sortable && "z-1",
        )}
      >
        {sortable && (
          <ItemLabel colorDark={labelColorDark} colorLight={labelColorLight} />
        )}
        {children}
      </div>
    </div>
  );
}

interface SortableListItemProps {
  children: ReactNode;
  className?: string;
  labelColorLight?: string;
  labelColorDark?: string;
  isOverlay?: boolean;
  sortableRef?: (node: HTMLElement | null) => void;
  sortableStyle?: CSSProperties;
  sortableDragging?: boolean;
  sortableDraggingAny?: boolean;
  sortableListeners?: SyntheticListenerMap;
  hasDragged?: boolean;
}

function SortableListItem({
  children,
  className,
  labelColorLight,
  labelColorDark,
  isOverlay,
  sortableRef,
  sortableStyle,
  sortableDragging,
  sortableDraggingAny,
  sortableListeners,
  hasDragged,
}: SortableListItemProps) {
  return (
    <ListItem
      className={className}
      hasDragged={hasDragged}
      isOverlay={isOverlay}
      labelColorDark={labelColorDark}
      labelColorLight={labelColorLight}
      sortable
      sortableDragging={sortableDragging}
      sortableDraggingAny={sortableDraggingAny}
      sortableListeners={sortableListeners}
      sortableRef={sortableRef}
      sortableStyle={sortableStyle}
    >
      {children}
    </ListItem>
  );
}

interface ListItemDragHandleProps {
  className?: string;
}

function ListItemDragHandle({ className }: ListItemDragHandleProps) {
  return (
    <Button
      aria-label="Drag to reorder"
      className={cn(
        "pointer-events-auto absolute inset-y-px start-0 z-1 h-auto! cursor-grab items-start bg-transparent! pt-4.25 in-[[data-slot=list-item]_a:hover,[data-slot=list-item][data-drag-overlay],[data-drag-release]]:opacity-100 opacity-0 not-in-data-drag-release:transition-opacity focus:opacity-100 focus-visible:ring-0 focus-visible:ring-offset-0 active:cursor-grabbing",
        className,
      )}
      data-slot="list-item-drag-handle"
      size="icon-xs"
      variant="ghost"
    >
      <GripVerticalIcon
        aria-hidden="true"
        className="in-[[data-slot=list-item-drag-handle]:hover,[data-slot=list-item-drag-handle]:focus-visible]:opacity-100 opacity-40"
      />
    </Button>
  );
}

interface ListItemContentProps {
  children: ReactNode;
  className?: string;
}

function ListItemContent({ children, className }: ListItemContentProps) {
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

function ListItemHeader({ children, className }: ListItemHeaderProps) {
  return <div className={cn("flex flex-col gap-1", className)}>{children}</div>;
}

interface ListItemTitleProps {
  children: ReactNode;
  className?: string;
}

function ListItemTitle({ children, className }: ListItemTitleProps) {
  return (
    <h2
      className={cn("font-semibold sm:text-sm", className)}
      data-slot="list-item-title"
    >
      {children}
    </h2>
  );
}

function ListItemTitleLink({
  children,
  className,
  href,
}: ListItemTitleProps & { href: string }) {
  return (
    <Link
      className={cn("before:absolute before:inset-0", className)}
      data-slot="list-item-title-link"
      href={href}
    >
      {children}
    </Link>
  );
}

interface ListItemDescriptionProps {
  children: ReactNode;
  className?: string;
}

function ListItemDescription({
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

function ListItemBadges({ children, className }: ListItemBadgesProps) {
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

function ListItemActions({ children, className }: ListItemActionsProps) {
  return (
    <div
      className={cn("relative flex items-center gap-4", className)}
      data-slot="list-item-actions"
    >
      {children}
    </div>
  );
}

export {
  ItemLabel,
  ListItem,
  ListItemActions,
  ListItemBadges,
  ListItemContent,
  ListItemDescription,
  ListItemDragHandle,
  ListItemHeader,
  ListItemTitleLink,
  ListItemTitle,
  sortableListClasses,
  SortableListItem,
};
