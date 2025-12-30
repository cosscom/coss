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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  sidebarTooltipHandle,
  useSidebarMenuOpen,
} from "@/components/ui/sidebar";
import { WorkflowBadge } from "@/components/workflows-badge";
import { useIsBetweenMdAndLg } from "@/hooks/use-mobile";

type BaseNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
};

type NavSubItem = {
  title: string;
  url: string;
};

type NavItemWithChildren = BaseNavItem & { items: NavSubItem[] };
type NavItemLeaf = BaseNavItem & { items?: undefined };
type NavItem = NavItemLeaf | NavItemWithChildren;

function hasSubItems(item: NavItem): item is NavItemWithChildren {
  return Array.isArray(item.items) && item.items.length > 0;
}

function NavItemWithSubmenu({ item }: { item: NavItemWithChildren }) {
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
                  <SidebarMenuButton
                    aria-label={item.title}
                    isActive={item.isActive}
                  >
                    <item.icon />
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

function NavItemSimple({ item }: { item: NavItemLeaf }) {
  const isBetweenMdAndLg = useIsBetweenMdAndLg();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="font-medium text-sidebar-foreground"
        isActive={item.isActive}
        render={
          <a href={item.url}>
            <item.icon />
            <span className="max-lg:hidden">{item.title}</span>
            {item.title === "Workflows" && <WorkflowBadge />}
          </a>
        }
        tooltip={isBetweenMdAndLg ? item.title : undefined}
      />
    </SidebarMenuItem>
  );
}

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarMenu className="gap-0.5">
        {items.map((item) =>
          hasSubItems(item) ? (
            <NavItemWithSubmenu item={item} key={item.title} />
          ) : (
            <NavItemSimple item={item} key={item.title} />
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
