"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { SettingsNavItem } from "@/lib/settings-navigation-data";
import { settingsNavItems } from "@/lib/settings-navigation-data";

export function SettingsSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenuButton
          className="w-fit"
          render={
            <Link href="/event-types">
              <ArrowLeftIcon className="size-4" />
              <span className="max-lg:hidden">Back</span>
            </Link>
          }
          tooltip="Back"
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {settingsNavItems.map((section) => (
              <SettingsNavSection
                key={section.url}
                pathname={pathname}
                section={section}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function SettingsNavSection({
  section,
  pathname,
}: {
  section: SettingsNavItem;
  pathname: string;
}) {
  return (
    <SidebarMenuItem>
      <div className="flex items-center gap-2 px-2 py-1.5">
        {section.icon && (
          <section.icon className="size-4 text-sidebar-foreground/70" />
        )}
        <span className="font-medium text-sidebar-foreground/70 text-sm max-lg:hidden">
          {section.title}
        </span>
      </div>
      {section.children && (
        <SidebarMenuSub className="mx-0 gap-0.5 border-none px-0">
          {section.children.map((item) => (
            <SidebarMenuSubItem key={item.url}>
              <SidebarMenuSubButton
                className="ps-8.5 hover:bg-transparent active:bg-transparent data-[active=true]:bg-sidebar-accent"
                isActive={pathname === item.url}
                render={
                  <Link href={item.url}>
                    <span>{item.title}</span>
                  </Link>
                }
              />
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}
