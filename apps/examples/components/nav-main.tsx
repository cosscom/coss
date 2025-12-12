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
import Link from "next/link";
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

function NavItemWithSubmenu({
  item,
}: {
  item: {
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
    badge?: string;
    items: {
      title: string;
      url: string;
    }[];
  };
}) {
  const isBetweenMdAndLg = useIsBetweenMdAndLg();
  const { registerMenu } = useSidebarMenuOpen();
  const unregisterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (unregisterRef.current) {
        unregisterRef.current();
      }
    };
  }, []);

  const TooltipContent = () => item.title;

  return (
    <SidebarMenuItem>
      {/* Menu version for collapsed sidebar (md-lg breakpoint) */}
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
        <div className="hidden md:max-lg:block">
          <TooltipTrigger
            className="after:-bottom-1 after:-inset-x-1 after:absolute after:top-0"
            handle={sidebarTooltipHandle}
            payload={TooltipContent}
            render={
              <MenuTrigger
                render={
                  <SidebarMenuButton isActive={item.isActive}>
                    <item.icon />
                    {item.badge && (
                      <SidebarMenuBadge className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuButton>
                }
              />
            }
          />
        </div>
        <MenuPopup align="start" alignOffset={0} side="right">
          <MenuGroup>
            <MenuGroupLabel>{item.title}</MenuGroupLabel>
            {item.items.map((subItem) => (
              <MenuItem
                key={subItem.title}
                render={
                  <Link href={subItem.url}>
                    <span>{subItem.title}</span>
                  </Link>
                }
              />
            ))}
          </MenuGroup>
        </MenuPopup>
      </Menu>

      {/* Collapsible version for expanded sidebar */}
      <Collapsible
        className="md:max-lg:hidden"
        defaultOpen={item.isActive}
        render={<div />}
      >
        <CollapsibleTrigger
          className="justify-between font-medium text-sidebar-foreground"
          render={
            <SidebarMenuButton
              isActive={item.isActive}
              tooltip={isBetweenMdAndLg ? item.title : undefined}
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
      </Collapsible>
    </SidebarMenuItem>
  );
}

function NavItemSimple({
  item,
}: {
  item: {
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
    badge?: string;
  };
}) {
  const isBetweenMdAndLg = useIsBetweenMdAndLg();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="font-medium text-sidebar-foreground"
        isActive={item.isActive}
        render={
          <a href={item.url}>
            <item.icon />
            <span className="md:max-lg:hidden lg:inline">{item.title}</span>
            {item.badge && (
              <SidebarMenuBadge className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {item.badge}
              </SidebarMenuBadge>
            )}
          </a>
        }
        tooltip={isBetweenMdAndLg ? item.title : undefined}
      />
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
  return (
    <SidebarGroup>
      <SidebarMenu className="gap-0.5">
        {items.map((item) =>
          item.items?.length ? (
            <NavItemWithSubmenu item={item as any} key={item.title} />
          ) : (
            <NavItemSimple item={item} key={item.title} />
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
