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
import { useScrollHide } from "@/hooks/use-scroll-hide";
import { navFooterItems, navMainItems } from "@/lib/navigation-data";

const primaryNavItems = navMainItems.slice(0, 3);
const remainingMainItems = navMainItems.slice(3);

export function MobileFooter() {
  const isHidden = useScrollHide();

  return (
    <footer
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 pb-4 transition-transform duration-500 ease-in-out before:absolute before:inset-0 before:bg-linear-to-t before:from-background md:hidden",
        isHidden ? "translate-y-full" : "translate-y-0",
      )}
    >
      <div className="pointer-events-auto relative flex w-fit items-center justify-around gap-1 rounded-full border bg-popover/80 p-1 shadow-black/5 shadow-lg backdrop-blur-sm before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/8%)]">
        {primaryNavItems.map((item) => (
          <Link
            aria-current={item.isActive ? "page" : undefined}
            className="flex size-10 items-center justify-center rounded-full text-sidebar-foreground/80 aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-sidebar-accent-foreground"
            href={item.url}
            key={item.title}
          >
            <item.icon className="size-5" />
          </Link>
        ))}
        <Menu>
          <MenuTrigger
            render={
              <Button className="size-10 rounded-full" variant="ghost">
                <EllipsisIcon className="size-5" />
              </Button>
            }
          />
          <MenuPopup side="top" sideOffset={8}>
            <MenuGroup>
              {remainingMainItems.map((item) => (
                <MenuItem
                  key={item.title}
                  render={
                    <a href={item.url}>
                      <item.icon className="opacity-72" />
                      <span>{item.title}</span>
                    </a>
                  }
                />
              ))}
            </MenuGroup>
            <MenuSeparator />
            <MenuGroup>
              {navFooterItems.map((item) => (
                <MenuItem
                  key={item.title}
                  render={
                    <a href={item.url}>
                      <item.icon className="opacity-72" />
                      <span>{item.title}</span>
                    </a>
                  }
                />
              ))}
            </MenuGroup>
          </MenuPopup>
        </Menu>
      </div>
      <Button className="size-11 rounded-full">
        <PlusIcon className="size-5" />
      </Button>
    </footer>
  );
}
