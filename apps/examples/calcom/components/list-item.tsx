import { cn } from "@coss/ui/lib/utils";
import { GripVerticalIcon } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@coss/ui/components/button";

interface ListItemProps {
  labelColorLight?: string;
  labelColorDark?: string;
  children: ReactNode;
  className?: string;
}

export function ListItem({
  labelColorLight,
  labelColorDark,
  children,
  className,
}: ListItemProps) {
  const hasLabelColor = labelColorLight || labelColorDark;
  const style = hasLabelColor
    ? ({
        "--event-label-dark": labelColorDark || "transparent",
        "--event-label-light": labelColorLight || "transparent",
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      className={cn(
        "relative flex transition-colors first:rounded-t-[calc(var(--radius-xl)-1px)] last:rounded-b-[calc(var(--radius-xl)-1px)] has-[[data-slot=list-item-title]:hover]:bg-[color-mix(in_srgb,var(--color-background),var(--color-black)_2%)] dark:has-[[data-slot=list-item-title]_a:hover]:bg-[color-mix(in_srgb,var(--color-background),var(--color-white)_2%)]",
        className,
      )}
      data-slot="list-item"
      style={style}
    >
      {hasLabelColor && (
        <div className="absolute inset-y-0 start-0 w-0.5 bg-(--event-label-light) dark:bg-(--event-label-dark)" />
      )}
      <div className="flex flex-1 items-center justify-between gap-4 py-4 px-6">
        {children}
      </div>
    </div>
  );
}

interface ListItemDragHandleProps {
  className?: string;
}

export function ListItemDragHandle({ className }: ListItemDragHandleProps) {
  return (
    <Button
      aria-label="Drag to reorder"
      className={cn(
        "absolute after:absolute after:-inset-2 z-1 top-1/2 -translate-y-1/2 start-0 -ms-3 cursor-grab active:cursor-grabbing in-[[data-slot=list-item]:has([data-slot=list-item-title]:hover)]:opacity-100 hover:opacity-100 focus:opacity-100 opacity-0 bg-popover! transition-[opacity,box-shadow] hover:border-ring/80",
        className,
      )}
      data-slot="list-item-drag-handle"
      size="icon-xs"
      variant="outline"
    >
      <GripVerticalIcon
        className="not-in-[[data-slot=list-item-drag-handle]:hover]:opacity-48"
        aria-hidden="true"
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
    <p className={cn("text-muted-foreground text-sm", className)} data-slot="list-item-description">{children}</p>
  );
}

interface ListItemBadgesProps {
  children: ReactNode;
  className?: string;
}

export function ListItemBadges({ children, className }: ListItemBadgesProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        className,
      )}
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
    <div className={cn("relative flex items-center", className)} data-slot="list-item-actions">
      {children}
    </div>
  );
}
