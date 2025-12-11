"use client";

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
import { Button } from "@coss/ui/components/button";
import Link from "next/link";
import { navFooterItems, navMainItems } from "@/lib/navigation-data";
import { useScrollHide } from "@/hooks/use-scroll-hide";

const primaryNavItems = navMainItems.slice(0, 3);
const remainingMainItems = navMainItems.slice(3);

export function MobileFooter() {
  const isHidden = useScrollHide();

  return (
    <footer
      className={cn(
        "fixed bottom-0 pb-4 flex justify-center items-center gap-2 inset-x-0 z-50 pointer-events-none before:absolute before:inset-0 before:bg-linear-to-t before:from-background md:hidden transition-transform duration-500 ease-in-out",
        isHidden ? "translate-y-full" : "translate-y-0",
      )}
    >
      <div className="relative p-1 w-fit rounded-full flex gap-1 items-center justify-around border bg-popover/80 backdrop-blur-sm before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/8%)] shadow-lg shadow-black/5 pointer-events-auto">
        {primaryNavItems.map((item) => (
          <Link
            aria-current={item.isActive ? "page" : undefined}
            className="size-10 flex items-center justify-center rounded-full text-sidebar-foreground/80 aria-[current=page]:text-sidebar-accent-foreground aria-[current=page]:bg-sidebar-accent"
            href={item.url}
            key={item.title}
          >
            <item.icon className="size-5" />
          </Link>
        ))}
        <Menu>
          <MenuTrigger
            render={
              <Button
              variant="ghost"
                className="size-10 rounded-full"
              >
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
