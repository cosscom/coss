"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@coss/ui/components/collapsible";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { TooltipTrigger } from "@coss/ui/components/tooltip";
import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import type * as React from "react";
import { useEffect, useRef } from "react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  sidebarTooltipHandle,
  useSidebarMenuOpen,
} from "@/components/ui/sidebar";
import { useIsBetweenMdAndLg } from "@/hooks/use-mobile";

function MenuWithTooltipDisable({
  item,
  menuButton,
  TooltipContent,
  items,
}: {
  item: { title: string; isActive?: boolean; badge?: string };
  menuButton: React.ReactElement<Record<string, unknown>>;
  TooltipContent: React.ComponentType;
  items: { title: string; url: string }[];
}) {
  const { registerMenu } = useSidebarMenuOpen();
  const unregisterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (unregisterRef.current) {
        unregisterRef.current();
      }
    };
  }, []);

  return (
    <SidebarMenuItem>
      <Menu
        onOpenChange={(open) => {
          if (open) {
            unregisterRef.current = registerMenu();
          } else {
            if (unregisterRef.current) {
              unregisterRef.current();
              unregisterRef.current = null;
            }
          }
        }}
      >
        <TooltipTrigger
          className="after:-bottom-1 after:-inset-x-1 after:absolute after:top-0"
          handle={sidebarTooltipHandle}
          payload={TooltipContent}
          render={<MenuTrigger render={menuButton} />}
        />
        <MenuPopup align="start" alignOffset={-3} side="right">
          <MenuGroup>
            <MenuGroupLabel>{item.title}</MenuGroupLabel>
            {items.map((subItem) => (
              <MenuItem
                key={subItem.title}
                render={
                  <a href={subItem.url}>
                    <span>{subItem.title}</span>
                  </a>
                }
              >
                {subItem.title}
              </MenuItem>
            ))}
          </MenuGroup>
        </MenuPopup>
      </Menu>
    </SidebarMenuItem>
  );
}

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
    badge?: string;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const isBetweenMdAndLg = useIsBetweenMdAndLg();

  return (
    <SidebarGroup>
      <SidebarMenu className="gap-0.5">
        {items.map((item) => {
          if (item.items?.length && isBetweenMdAndLg) {
            // Show Menu in collapsed mode
            const TooltipContent = () => item.title;
            const menuButton = (
              <SidebarMenuButton isActive={item.isActive}>
                <item.icon />
                {item.badge && (
                  <SidebarMenuBadge className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    {item.badge}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuButton>
            ) as React.ReactElement<Record<string, unknown>>;

            return (
              <MenuWithTooltipDisable
                item={item}
                items={item.items}
                key={item.title}
                menuButton={menuButton}
                TooltipContent={TooltipContent}
              />
            );
          }

          // Show Collapsible in expanded mode or for items without children
          return (
            <Collapsible
              defaultOpen={item.isActive}
              key={item.title}
              render={<SidebarMenuItem />}
            >
              {item.items?.length ? (
                <>
                  <CollapsibleTrigger
                    className="justify-between font-medium text-sidebar-foreground"
                    render={
                      <SidebarMenuButton
                        isActive={item.isActive}
                        tooltip={item.title}
                      />
                    }
                  >
                    <span className="flex items-center gap-2">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </span>
                    {item.badge && (
                      <SidebarMenuBadge className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                    <ChevronRightIcon className="in-data-open:rotate-90 opacity-72 transition-transform" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="mx-0 gap-0.5 border-none px-0">
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            className="from-secondary to-secondary/64 ps-8.5 hover:bg-transparent active:bg-transparent data-[active=true]:bg-linear-to-tr"
                            render={
                              <a href={subItem.url}>
                                <span>{subItem.title}</span>
                              </a>
                            }
                          />
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : (
                <SidebarMenuButton
                  className="font-medium text-sidebar-foreground"
                  isActive={item.isActive}
                  render={
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                      {item.badge && (
                        <SidebarMenuBadge className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          {item.badge}
                        </SidebarMenuBadge>
                      )}
                    </a>
                  }
                  tooltip={item.title}
                />
              )}
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
