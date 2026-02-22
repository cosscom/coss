"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@coss/ui/components/collapsible";
import {
  ChevronRightIcon,
  ExternalLinkIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { SettingsNavItem } from "@/lib/settings-navigation-data";
import {
  orgSettingsItems,
  teamSettingsItems,
  userSettingsItems,
} from "@/lib/settings-navigation-data";

export function SettingsNavContent({
  onItemClick,
}: {
  onItemClick?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {userSettingsItems.map((section) => (
        <SettingsNavSection
          key={section.url}
          onItemClick={onItemClick}
          pathname={pathname}
          section={section}
        />
      ))}
      <TeamsSection onItemClick={onItemClick} pathname={pathname} />
      {orgSettingsItems.map((section) => (
        <SettingsNavSection
          key={section.url}
          onItemClick={onItemClick}
          pathname={pathname}
          section={section}
        />
      ))}
    </>
  );
}

function SettingsNavSection({
  section,
  pathname,
  onItemClick,
}: {
  section: SettingsNavItem;
  pathname: string;
  onItemClick?: () => void;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="h-7 text-sidebar-accent-foreground">
        {section.avatar && (
          <Avatar className="size-4">
            <AvatarImage alt={section.title} src={section.avatar.src} />
            <AvatarFallback className="text-[.625rem]">
              {section.avatar.fallback}
            </AvatarFallback>
          </Avatar>
        )}
        {section.icon && <section.icon className="opacity-80" />}
        <span>{section.title}</span>
      </SidebarGroupLabel>
      {section.children && (
        <SidebarMenuSub className="mx-0 gap-0.5 border-none px-0 md:max-lg:flex">
          {section.children.map((item) => (
            <SidebarMenuSubItem key={item.url}>
              <SidebarMenuSubButton
                className="ps-8 hover:bg-transparent active:bg-transparent data-[active=true]:bg-sidebar-accent md:max-lg:flex"
                isActive={pathname === item.url}
                render={<Link href={item.url} onClick={onItemClick} />}
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

function TeamsSection({
  pathname,
  onItemClick,
}: {
  pathname: string;
  onItemClick?: () => void;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="h-7 text-sidebar-accent-foreground">
        <UsersIcon className="opacity-80" />
        <span className={onItemClick ? undefined : "max-lg:sr-only"}>
          My teams
        </span>
      </SidebarGroupLabel>
      <SidebarMenuSub className="mx-0 gap-0.5 border-none px-0">
        {teamSettingsItems.map((team) => (
          <TeamCollapsible
            key={team.url}
            onItemClick={onItemClick}
            pathname={pathname}
            team={team}
          />
        ))}
        <SidebarMenuSubButton
          className="hover:bg-transparent active:bg-transparent data-[active=true]:bg-sidebar-accent"
          render={<Link href="/settings/teams/new" onClick={onItemClick} />}
        >
          <PlusIcon className="opacity-80" />
          <span>Add a team</span>
        </SidebarMenuSubButton>
      </SidebarMenuSub>
    </SidebarGroup>
  );
}

function TeamCollapsible({
  team,
  pathname,
  onItemClick,
}: {
  team: SettingsNavItem;
  pathname: string;
  onItemClick?: () => void;
}) {
  const isActive = team.children?.some((c) => pathname === c.url);
  const [open, setOpen] = useState(isActive);

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger
        nativeButton={false}
        render={
          <SidebarMenuSubButton className="hover:bg-transparent active:bg-transparent data-[active=true]:bg-sidebar-accent" />
        }
      >
        <ChevronRightIcon className="in-data-open:rotate-90 opacity-80 transition-transform" />
        {team.avatar && (
          <Avatar className="size-4 shrink-0">
            <AvatarImage alt={team.title} src={team.avatar.src} />
            <AvatarFallback className="text-[.625rem]">
              {team.avatar.fallback}
            </AvatarFallback>
          </Avatar>
        )}
        <span className="flex-1 truncate">{team.title}</span>
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <SidebarMenuSub className="mx-0 gap-0.5 border-none px-0">
          {team.children?.map((item) => (
            <SidebarMenuSubItem key={item.url}>
              <SidebarMenuSubButton
                className="ps-8 hover:bg-transparent active:bg-transparent data-[active=true]:bg-sidebar-accent"
                isActive={pathname === item.url}
                render={<Link href={item.url} onClick={onItemClick} />}
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
      </CollapsiblePanel>
    </Collapsible>
  );
}
