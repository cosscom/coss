"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsSheet } from "@/components/settings/settings-sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenuButton,
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
        <div className="flex flex-col gap-1 px-2">
          <div className="hidden md:max-lg:block">
            <SettingsSheet />
          </div>
          <SidebarMenuButton
            render={<Link aria-label="Back" href="/event-types" />}
            tooltip="Back"
          >
            <ArrowLeftIcon className="lg:-ms-0.5" />
            <span className="max-lg:hidden">Back</span>
          </SidebarMenuButton>
        </div>
      </SidebarHeader>
      <SidebarContent className="hidden lg:block">
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
      <SidebarGroupLabel className="h-7 text-sidebar-accent-foreground">
        {section.avatar && (
          <Avatar className="size-4">
            <AvatarImage alt={section.title} src={section.avatar.src} />
            <AvatarFallback className="text-[10px]">
              {section.avatar.fallback}
            </AvatarFallback>
          </Avatar>
        )}
        {section.icon && <section.icon className="opacity-80" />}
        <span className="max-lg:hidden">{section.title}</span>
      </SidebarGroupLabel>
      {section.children && (
        <SidebarMenuSub className="mx-0 gap-0.5 border-none px-0">
          {section.children.map((item) => (
            <SidebarMenuSubItem key={item.url}>
              <SidebarMenuSubButton
                className="ps-8 hover:bg-transparent active:bg-transparent data-[active=true]:bg-sidebar-accent"
                isActive={pathname === item.url}
                render={<Link href={item.url} />}
              >
                <span className="flex items-center gap-1">
                  {item.title}
                  {item.external && (
                    <ExternalLinkIcon className="size-3 opacity-80" />
                  )}
                </span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarGroup>
  );
}
