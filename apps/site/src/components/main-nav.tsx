"use client";
import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import type { NavItem } from "@/lib/site";

/** The item whose path covers the current one most specifically (`/docs/api-reference` beats `/docs`). */
export function activeNavItem(items: readonly NavItem[], pathname: string): NavItem | undefined {
  return items
    .filter(
      (item) => !item.external && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function MainNav({
  items,
  className,
  ...props
}: ComponentProps<"nav"> & { items: readonly NavItem[] }) {
  const pathname = usePathname();
  const active = activeNavItem(items, pathname);

  return (
    <nav className={cn("items-center gap-2", className)} {...props}>
      {items.map((item) => (
        <Button
          data-pressed={item === active || undefined}
          key={item.href}
          render={
            item.external ? (
              // biome-ignore lint/a11y/useAnchorContent: the button's label renders inside
              <a href={item.href} rel="noreferrer" target="_blank" />
            ) : (
              <Link className={cn(item === active && "text-primary")} href={item.href} />
            )
          }
          variant="ghost"
        >
          {item.label}
        </Button>
      ))}
    </nav>
  );
}
