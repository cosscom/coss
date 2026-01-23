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
import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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

  /* Collapsible version for expanded sidebar */
  const pathname = usePathname();
  const isActive = useMemo(
    () => item.items.some((subItem) => pathname.startsWith(subItem.url)),
    [item.items, pathname],
  );

  const [isExpanded, setIsExpanded] = useState<boolean>(
    !!(isActive || item.isActive),
  );

  // Auto-expand when active
  useEffect(() => {
    if (isActive) {
      setIsExpanded(true);
    }
  }, [isActive]);

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
          <SidebarMenuButton
            aria-label={item.title}
            isActive={isActive || item.isActive}
            render={<MenuTrigger />}
            tooltip={isBetweenMdAndLg ? item.title : undefined}
          >
            <item.icon />
          </SidebarMenuButton>
        </div>
        <MenuPopup align="start" alignOffset={0} side="right">
          <MenuGroup>
            <MenuGroupLabel>{item.title}</MenuGroupLabel>
            {item.items.map((subItem) => (
              <MenuItem
                key={subItem.title}
                render={<Link href={subItem.url} />}
              >
                <span>{subItem.title}</span>
              </MenuItem>
            ))}
          </MenuGroup>
        </MenuPopup>
      </Menu>

      {/* Collapsible version for expanded sidebar */}
      <Collapsible
        className="md:max-lg:hidden"
        onOpenChange={setIsExpanded}
        open={isExpanded}
      >
        <CollapsibleTrigger
          className="justify-between"
          render={
            <SidebarMenuButton
              tooltip={isBetweenMdAndLg ? item.title : undefined}
            />
          }
        >
          <span className="flex items-center gap-2">
            <item.icon className="size-4" />
            <span>{item.title}</span>
          </span>
          <ChevronRightIcon className="in-data-open:rotate-90 opacity-80 transition-transform" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="mx-0 gap-0.5 border-none px-0">
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  className="ps-8 hover:bg-transparent active:bg-transparent data-[active=true]:bg-sidebar-accent"
                  isActive={pathname.startsWith(subItem.url)}
                  render={<Link href={subItem.url} />}
                >
                  <span>{subItem.title}</span>
                </SidebarMenuSubButton>
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
  const pathname = usePathname();
  const isActive = pathname.startsWith(item.url);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        render={<Link href={item.url} />}
        tooltip={isBetweenMdAndLg ? item.title : undefined}
      >
        <item.icon />
        <span className="max-lg:sr-only">{item.title}</span>
        {item.title === "Workflows" && <WorkflowBadge />}
      </SidebarMenuButton>
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
