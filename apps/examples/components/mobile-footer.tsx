"use client";

import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { EllipsisIcon } from "lucide-react";
import Link from "next/link";
import { navFooterItems, navMainItems } from "@/lib/navigation-data";

const primaryNavItems = navMainItems.slice(0, 3);
const remainingMainItems = navMainItems.slice(3);

export function MobileFooter() {
  return (
    <footer className="fixed bottom-0 z-50 flex h-16 w-full items-center justify-around border-border border-t bg-sidebar md:hidden">
      {primaryNavItems.map((item) => (
        <Link
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-sidebar-foreground hover:text-sidebar-accent-foreground"
          href={item.url}
          key={item.title}
        >
          <item.icon className="size-4" />
          <span className="font-medium text-[0.625rem]">{item.title}</span>
        </Link>
      ))}
      <Menu>
        <MenuTrigger
          render={
            <button
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-sidebar-foreground hover:text-sidebar-accent-foreground"
              type="button"
            >
              <EllipsisIcon className="size-4" />
              <span className="font-medium text-[0.625rem]">More</span>
            </button>
          }
        />
        <MenuPopup align="end" side="top" sideOffset={8}>
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
    </footer>
  );
}
