import { cn } from "@coss/ui/lib/utils";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export { ItemLabel } from "./item-label";

interface ListItemProps {
  children: ReactNode;
  className?: string;
}

export function ListItem({ children, className }: ListItemProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-between gap-4 not-last:border-b px-6 py-4",
        className,
      )}
      data-slot="list-item"
    >
      {children}
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
      className={cn("font-semibold sm:text-sm", className)}
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
