"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { Badge } from "@coss/ui/components/badge";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@coss/ui/components/collapsible";
import {
  ChevronRightIcon,
  ExternalLinkIcon,
  LayoutDashboardIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactElement, useState } from "react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { SettingsNavItem } from "@/lib/settings-navigation-data";
import {
  adminSettingsItems,
  orgSettingsItems,
  teamSettingsItems,
  userSettingsItems,
} from "@/lib/settings-navigation-data";

function SettingsNavSection({
  section,
  pathname,
  onItemClick,
}: {
  section: SettingsNavItem;
  pathname: string;
  onItemClick?: () => void;
}): ReactElement {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        {section.avatar && (
          <Avatar className="size-4.5 sm:size-4">
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
                className="ps-8.5 sm:ps-8 md:max-lg:flex"
                isActive={pathname === item.url}
                render={<Link href={item.url} onClick={onItemClick} />}
              >
                <span className="flex min-w-0 flex-1 items-center gap-1">
                  {item.title}
                  {item.external && (
                    <ExternalLinkIcon className="size-3 opacity-80" />
                  )}
                  {item.badge ? (
                    <Badge className="pointer-events-none ms-1" variant="info">
                      {item.badge.label}
                    </Badge>
                  ) : null}
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
}): ReactElement {
  return (
    <SidebarGroup>
      <SidebarGroupLabel
        className="transition-colors hover:bg-sidebar-accent/50"
        render={<Link href="/teams" />}
      >
        <UsersIcon className="opacity-80" />
        My teams
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
}): ReactElement {
  const isActive = team.children?.some((c) => pathname === c.url);
  const [open, setOpen] = useState(isActive);

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger
        nativeButton={false}
        render={<SidebarMenuSubButton />}
      >
        <ChevronRightIcon className="in-[[data-slot=collapsible][data-open]]:rotate-90 opacity-80 transition-transform" />
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
                className="ps-8.5 sm:ps-8 md:max-lg:flex"
                isActive={pathname === item.url}
                render={<Link href={item.url} onClick={onItemClick} />}
              >
                <span className="flex min-w-0 flex-1 items-center gap-1">
                  {item.title}
                  {item.external && (
                    <ExternalLinkIcon className="size-3 opacity-80" />
                  )}
                  {item.badge ? (
                    <Badge className="pointer-events-none ms-1" variant="info">
                      {item.badge.label}
                    </Badge>
                  ) : null}
                </span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsiblePanel>
    </Collapsible>
  );
}

function OtherTeamsNavGroup({
  pathname,
  onItemClick,
}: {
  pathname: string;
  onItemClick?: () => void;
}): ReactElement {
  const href = "/teams/other";
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <SidebarGroup>
      <SidebarMenuSub className="mx-0 gap-0.5 border-none px-0 md:max-lg:flex">
        <SidebarMenuSubItem>
          <SidebarMenuSubButton
            className="md:max-lg:flex"
            isActive={isActive}
            render={
              <Link
                aria-current={isActive ? "page" : undefined}
                href={href}
                onClick={onItemClick}
              />
            }
          >
            <UsersIcon className="opacity-80" />
            <span className={onItemClick ? undefined : "max-lg:sr-only"}>
              Other teams
            </span>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      </SidebarMenuSub>
    </SidebarGroup>
  );
}

export function SettingsNavContent({
  onItemClick,
}: {
  onItemClick?: () => void;
}): ReactElement {
  const pathname = usePathname();

  return (
    <div className="pb-2">
      <SidebarGroup>
        <SidebarMenuSub className="mx-0 gap-0.5 border-none px-0 md:max-lg:flex">
          <SidebarMenuSubItem>
            <SidebarMenuSubButton
              className="md:max-lg:flex"
              isActive={pathname === "/settings"}
              render={
                <Link
                  href="/settings/my-account/general"
                  onClick={onItemClick}
                />
              }
            >
              <LayoutDashboardIcon className="opacity-80" />
              <span className={onItemClick ? undefined : "max-lg:sr-only"}>
                Overview
              </span>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        </SidebarMenuSub>
      </SidebarGroup>
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
      {adminSettingsItems.map((section) => (
        <SettingsNavSection
          key={section.url}
          onItemClick={onItemClick}
          pathname={pathname}
          section={section}
        />
      ))}
      <OtherTeamsNavGroup onItemClick={onItemClick} pathname={pathname} />
    </div>
  );
}
