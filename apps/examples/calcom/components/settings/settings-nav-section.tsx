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
import { cn } from "@coss/ui/lib/utils";
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

/** Class to override md:max-lg:hidden when used inside the sheet (which is shown in that viewport) */
const SHEET_VISIBLE = "!flex";

export function SettingsNavContent({
  onItemClick,
}: {
  onItemClick?: () => void;
}) {
  const pathname = usePathname();
  const sheetClassName = onItemClick ? SHEET_VISIBLE : undefined;

  return (
    <>
      {userSettingsItems.map((section) => (
        <SettingsNavSection
          key={section.url}
          onItemClick={onItemClick}
          pathname={pathname}
          section={section}
          subClassName={sheetClassName}
        />
      ))}
      <TeamsSection
        onItemClick={onItemClick}
        pathname={pathname}
        subClassName={sheetClassName}
      />
      {orgSettingsItems.map((section) => (
        <SettingsNavSection
          key={section.url}
          onItemClick={onItemClick}
          pathname={pathname}
          section={section}
          subClassName={sheetClassName}
        />
      ))}
    </>
  );
}

function SettingsNavSection({
  section,
  pathname,
  onItemClick,
  subClassName,
}: {
  section: SettingsNavItem;
  pathname: string;
  onItemClick?: () => void;
  subClassName?: string;
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
        <SidebarMenuSub
          className={cn("mx-0 gap-0.5 border-none px-0", subClassName)}
        >
          {section.children.map((item) => (
            <SidebarMenuSubItem key={item.url}>
              <SidebarMenuSubButton
                className={cn(
                  "ps-8 hover:bg-transparent active:bg-transparent data-[active=true]:bg-sidebar-accent",
                  subClassName,
                )}
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
  subClassName,
}: {
  pathname: string;
  onItemClick?: () => void;
  subClassName?: string;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="h-7 text-sidebar-accent-foreground">
        <UsersIcon className="opacity-80" />
        <span className={onItemClick ? undefined : "max-lg:sr-only"}>
          My teams
        </span>
      </SidebarGroupLabel>
      <SidebarMenuSub
        className={cn("mx-0 gap-0.5 border-none px-0", subClassName)}
      >
        {teamSettingsItems.map((team) => (
          <TeamCollapsible
            key={team.url}
            onItemClick={onItemClick}
            pathname={pathname}
            subClassName={subClassName}
            team={team}
          />
        ))}
        <SidebarMenuSubButton
          className={subClassName}
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
  subClassName,
}: {
  team: SettingsNavItem;
  pathname: string;
  onItemClick?: () => void;
  subClassName?: string;
}) {
  const isActive = team.children?.some((c) => pathname === c.url);
  const [open, setOpen] = useState(isActive);

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger
        render={<SidebarMenuSubButton className={subClassName} />}
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
        <SidebarMenuSub
          className={cn("mx-0 gap-0.5 border-none px-0", subClassName)}
        >
          {team.children?.map((item) => (
            <SidebarMenuSubItem key={item.url}>
              <SidebarMenuSubButton
                className={cn(
                  "ps-8 hover:bg-transparent active:bg-transparent data-[active=true]:bg-sidebar-accent",
                  subClassName,
                )}
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
