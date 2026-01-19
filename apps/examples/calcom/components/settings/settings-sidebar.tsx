"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
        <div className="px-2">
          <SidebarMenuButton
            render={
              <Link href="/event-types">
                <ArrowLeftIcon className="size-4" />
                <span className="max-lg:hidden">Back</span>
              </Link>
            }
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {settingsNavItems.map((section) => (
          <SettingsNavSection
            key={section.url}
            pathname={pathname}
            section={section}
          />
        ))}
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
    <SidebarGroup>
      <SidebarGroupLabel>
        {section.avatar && (
          <Avatar className="size-5">
            <AvatarImage alt={section.title} src={section.avatar.src} />
            <AvatarFallback className="text-[10px]">
              {section.avatar.fallback}
            </AvatarFallback>
          </Avatar>
        )}
        {section.icon && <section.icon />}
        <span className="max-lg:hidden">{section.title}</span>
      </SidebarGroupLabel>
      {section.children && (
        <SidebarMenu className="gap-0.5">
          {section.children.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                className="ps-7"
                isActive={pathname === item.url}
                render={
                  <Link href={item.url}>
                    <span className="flex items-center gap-1">
                      {item.title}
                      {item.external && (
                        <ExternalLinkIcon className="size-3 text-sidebar-foreground/50" />
                      )}
                    </span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      )}
    </SidebarGroup>
  );
}
