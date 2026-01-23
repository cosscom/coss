"use client";

import { Button } from "@coss/ui/components/button";
import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { cn } from "@coss/ui/lib/utils";
import { EllipsisIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { WorkflowBadge } from "@/components/workflows-badge";
import { useScrollHide } from "@/hooks/use-scroll-hide";
import { navFooterItems, navMainItems } from "@/lib/navigation-data";

const primaryNavItems = navMainItems.slice(0, 3);
const remainingMainItems = navMainItems.slice(3);

export function AppMobileFooter() {
  const isHidden = useScrollHide();

  return (
    <footer
      className={cn(
        "before:-bottom-1 fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 pb-4 transition-transform duration-500 ease-in-out before:pointer-events-none before:absolute before:inset-x-0 before:h-[200%] before:bg-linear-to-t before:from-60% before:from-background before:transition-opacity before:duration-500 before:ease-in-out md:hidden",
        isHidden
          ? "translate-y-full before:opacity-0"
          : "translate-y-0 before:opacity-100",
      )}
    >
      <div className="relative flex w-fit items-center justify-around gap-1 rounded-full border bg-popover p-1 shadow-black/5 shadow-lg backdrop-blur-sm before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:shadow-[0_1px_--theme(--color-black/6%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]">
        {primaryNavItems.map((item) => (
          <Link
            aria-current={item.isActive ? "page" : undefined}
            className="flex size-11 items-center justify-center rounded-full text-sidebar-foreground/80 aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-sidebar-accent-foreground"
            href={item.url}
            key={item.title}
          >
            <item.icon className="size-5" />
          </Link>
        ))}
        <Menu>
          <MenuTrigger
            aria-label="More options"
            render={<Button className="size-11 rounded-full" variant="ghost" />}
          >
            <EllipsisIcon className="size-5" />
          </MenuTrigger>
          <MenuPopup side="top" sideOffset={8}>
            <MenuGroup>
              {remainingMainItems.map((item) => (
                <MenuItem key={item.title} render={<Link href={item.url} />}>
                  <item.icon />
                  <span>{item.title}</span>
                  {item.title === "Workflows" && <WorkflowBadge />}
                </MenuItem>
              ))}
            </MenuGroup>
            <MenuSeparator />
            <MenuGroup>
              {navFooterItems.map((item) => (
                <MenuItem key={item.title} render={<Link href={item.url} />}>
                  <item.icon />
                  <span>{item.title}</span>
                </MenuItem>
              ))}
            </MenuGroup>
          </MenuPopup>
        </Menu>
      </div>
      <Button className="size-12 rounded-full sm:size-12">
        <PlusIcon className="size-5" />
      </Button>
    </footer>
  );
}
