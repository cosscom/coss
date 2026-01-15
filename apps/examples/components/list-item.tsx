import { cn } from "@coss/ui/lib/utils";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

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
        "relative flex overflow-hidden transition-colors first:rounded-t-[calc(var(--radius-xl)-1px)] last:rounded-b-[calc(var(--radius-xl)-1px)] has-[[data-slot=list-item-title]:hover]:bg-[color-mix(in_srgb,var(--color-background),var(--color-black)_2%)] dark:has-[[data-slot=list-item-title]_a:hover]:bg-[color-mix(in_srgb,var(--color-background),var(--color-white)_2%)]",
        className,
      )}
      style={style}
    >
      {hasLabelColor && (
        <div className="absolute inset-y-0 start-0 w-0.5 bg-(--event-label-light) dark:bg-(--event-label-dark)" />
      )}
      <div className="flex flex-1 items-center justify-between gap-4 p-5">
        {children}
      </div>
    </div>
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
    <p className={cn("text-muted-foreground text-sm", className)}>{children}</p>
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
        "flex flex-wrap items-center gap-2 overflow-hidden",
        className,
      )}
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
    <div className={cn("relative flex items-center", className)}>
      {children}
    </div>
  );
}
