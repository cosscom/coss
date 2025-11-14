"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/registry/default/ui/button";

export function MainNav({
  items,
  className,
  ...props
}: React.ComponentProps<"nav"> & {
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("items-center gap-2", className)} {...props}>
      {items.map((item) => (
        <Button
          key={item.href}
          variant="ghost"
          data-pressed={pathname.includes(item.href) || undefined}
          render={
            <Link
              href={item.href}
              className={cn(pathname.includes(item.href) && "text-primary")}
            />
          }
        >
          {item.label}
        </Button>
      ))}
    </nav>
  );
}
