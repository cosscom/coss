"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import {
  ActivityIcon,
  CalendarIcon,
  ClockFadingIcon,
  ContactRoundIcon,
  CopyIcon,
  ExternalLinkIcon,
  GaugeIcon,
  GiftIcon,
  Grid2x2Plus,
  Link2Icon,
  LogOutIcon,
  MessageCircleQuestionMarkIcon,
  MilestoneIcon,
  MonitorDownIcon,
  MoonStarIcon,
  RouteIcon,
  SearchIcon,
  SettingsIcon,
  UserRoundIcon,
  UsersRoundIcon,
  WorkflowIcon,
} from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useIsBetweenMdAndLg } from "@/hooks/use-mobile";

const data = {
  navFooter: [
    {
      icon: ExternalLinkIcon,
      title: "View public page",
      url: "#",
    },
    {
      icon: CopyIcon,
      title: "Copy public page link",
      url: "#",
    },
    {
      icon: GiftIcon,
      title: "Refer and earn",
      url: "#",
    },
    {
      icon: SettingsIcon,
      title: "Settings",
      url: "#",
    },
  ],
  navMain: [
    {
      icon: Link2Icon,
      isActive: true,
      title: "Event Types",
      url: "#",
    },
    {
      icon: CalendarIcon,
      items: [
        {
          title: "Upcoming",
          url: "#",
        },
        {
          title: "Unconfirmed",
          url: "#",
        },
        {
          title: "Recurring",
          url: "#",
        },
        {
          title: "Past",
          url: "#",
        },
        {
          title: "Canceled",
          url: "#",
        },
      ],
      title: "Bookings",
      url: "#",
    },
    {
      icon: ClockFadingIcon,
      title: "Availability",
      url: "#",
    },
    {
      icon: ContactRoundIcon,
      title: "Members",
      url: "#",
    },
    {
      icon: UsersRoundIcon,
      title: "Teams",
      url: "#",
    },
    {
      icon: Grid2x2Plus,
      items: [
        {
          title: "App Store",
          url: "#",
        },
        {
          title: "Installed Apps",
          url: "#",
        },
      ],
      title: "Apps",
      url: "#",
    },
    {
      icon: RouteIcon,
      title: "Routing",
      url: "#",
    },
    {
      badge: "Cal.ai",
      icon: WorkflowIcon,
      title: "Workflows",
      url: "#",
    },
    {
      icon: ActivityIcon,
      title: "Insights",
      url: "#",
    },
  ],
  user: {
    avatar: "",
    email: "pasqua@example.com",
    name: "Pasquale",
  },
};

export function AppSidebar({
  variant,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  variant?: never;
}) {
  const isBetweenMdAndLg = useIsBetweenMdAndLg();

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex flex-col items-center justify-between gap-0.5 px-2 lg:flex-row">
          <SidebarMenuButton
            className="w-fit justify-center md:max-lg:p-0"
            render={
              <Link href="/">
                <h1 className="font-heading text-[0.9375rem] text-foreground leading-none lg:text-lg">
                  Cal<span className="max-lg:sr-only">.com</span>
                </h1>
              </Link>
            }
          />
          <div className="flex flex-col items-center gap-0.5 lg:flex-row">
            <SidebarMenuButton
              aria-label="Search"
              className="size-8 justify-center p-0 max-lg:order-1"
            >
              <SearchIcon />
            </SidebarMenuButton>
            <SidebarMenuButton
              className="size-8 justify-center p-0"
              render={
                <a href="#">
                  <Avatar className="size-6">
                    <AvatarImage
                      alt="Luke Tracy"
                      src="https://pbs.twimg.com/profile_images/1994776674391457792/7utKOMi6_400x400.jpg"
                    />
                    <AvatarFallback>CC</AvatarFallback>
                  </Avatar>
                </a>
              }
            />
            <Menu>
              <MenuTrigger
                render={
                  <SidebarMenuButton className="relative size-8 justify-center p-0" />
                }
              >
                <Avatar className="size-6">
                  <AvatarImage
                    alt="Luke Tracy"
                    src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=128&h=128&dpr=2&q=80"
                  />
                  <AvatarFallback>LT</AvatarFallback>
                </Avatar>
                <span className="absolute right-px bottom-px size-2.5 rounded-full border-2 border-sidebar bg-emerald-500" />
                <span className="sr-only">User menu</span>
              </MenuTrigger>
              <MenuPopup
                align="start"
                alignOffset={isBetweenMdAndLg ? -3 : undefined}
                side={isBetweenMdAndLg ? "right" : "bottom"}
              >
                <MenuGroup>
                  <MenuGroupLabel>Luke Tracy</MenuGroupLabel>
                  <MenuItem>
                    <UserRoundIcon className="opacity-72" />
                    My profile
                  </MenuItem>
                  <MenuItem>
                    <SettingsIcon className="opacity-72" />
                    My settings
                  </MenuItem>
                  <MenuItem>
                    <MoonStarIcon className="opacity-72" />
                    Out of office
                  </MenuItem>
                </MenuGroup>
                <MenuSeparator />
                <MenuGroup>
                  <MenuItem>
                    <MilestoneIcon className="opacity-72" />
                    Roadmap
                  </MenuItem>
                  <MenuItem>
                    <MessageCircleQuestionMarkIcon className="opacity-72" />
                    Help
                  </MenuItem>
                  <MenuItem>
                    <MonitorDownIcon className="opacity-72" />
                    Download desktop app
                  </MenuItem>
                  <MenuItem>
                    <GaugeIcon className="opacity-72" />
                    Platform
                  </MenuItem>
                </MenuGroup>
                <MenuSeparator />
                <MenuItem>
                  <LogOutIcon className="opacity-72" />
                  Sign out
                </MenuItem>
              </MenuPopup>
            </Menu>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary className="mt-auto" items={data.navFooter} />
        <div className="px-3 pb-4 text-[0.625rem] text-sidebar-foreground/50 max-lg:hidden">
          © 2025 Cal.com, Inc. v.5.9.6-h-2701b4d
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
