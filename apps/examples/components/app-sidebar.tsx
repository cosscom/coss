"use client"

import * as React from "react"
import {
  Link2Icon,
  CalendarIcon,
  ClockFadingIcon,
  UsersRoundIcon,
  ContactRoundIcon,
  Grid2x2Plus,
  RouteIcon,
  WorkflowIcon,
  ActivityIcon,
  ExternalLinkIcon,
  CopyIcon,
  GiftIcon,
  SettingsIcon,
  UserRoundIcon,
  MoonStarIcon,
  MilestoneIcon,
  MessageCircleQuestionMarkIcon,
  MonitorDownIcon,
  SearchIcon,
  LogOutIcon,
  GaugeIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar"
import {
  Menu,
  MenuPopup,
  MenuGroup,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  MenuGroupLabel,
} from "@coss/ui/components/menu"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { useIsBetweenMdAndLg, useIsMobile } from "@/hooks/use-mobile"
import Link from "next/link"

const data = {
  user: {
    name: "Pasquale",
    email: "pasqua@example.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Event Types",
      url: "#",
      icon: Link2Icon,
      isActive: true,
    },
    {
      title: "Bookings",
      url: "#",
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
    },
    {
      title: "Availability",
      url: "#",
      icon: ClockFadingIcon,
    },
    {
      title: "Members",
      url: "#",
      icon: ContactRoundIcon,
    },
    {
      title: "Teams",
      url: "#",
      icon: UsersRoundIcon,
    },
    {
      title: "Apps",
      url: "#",
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
    },
    {
      title: "Routing",
      url: "#",
      icon: RouteIcon,
    },
    {
      title: "Workflows",
      url: "#",
      icon: WorkflowIcon,
      badge: "Cal.ai",
    },
    {
      title: "Insights",
      url: "#",
      icon: ActivityIcon,
    },
  ],
  navFooter: [
    {
      title: "View public page",
      url: "#",
      icon: ExternalLinkIcon,
    },
    {
      title: "Copy public page link",
      url: "#",
      icon: CopyIcon,
    },
    {
      title: "Refer and earn",
      url: "#",
      icon: GiftIcon,
    },
    {
      title: "Settings",
      url: "#",
      icon: SettingsIcon,
    },
  ],
}

export function AppSidebar({
  variant,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  variant?: never;
}) {
  const isBetweenMdAndLg = useIsBetweenMdAndLg()

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex flex-col lg:flex-row items-center justify-between gap-0.5 px-2">
          <SidebarMenuButton className="w-fit justify-center md:max-lg:p-0" render={<Link href="/" />}>
            <h1 className="font-heading text-[0.9375rem] lg:text-lg leading-none text-foreground">
              Cal<span className="max-lg:sr-only">.com</span>
            </h1>          
          </SidebarMenuButton>          
          <div className="flex flex-col lg:flex-row items-center gap-0.5">
            <SidebarMenuButton className="size-8 p-0 justify-center max-lg:order-1" aria-label="Search">
              <SearchIcon />
            </SidebarMenuButton>
            <SidebarMenuButton className="size-8 p-0 justify-center" render={<a href="#" />}>         
              <Avatar className="size-6">
                <AvatarImage
                  alt="Luke Tracy"
                  src="https://pbs.twimg.com/profile_images/1994776674391457792/7utKOMi6_400x400.jpg"
                />
                <AvatarFallback>CC</AvatarFallback>
              </Avatar>
            </SidebarMenuButton>             
            <Menu>
              <MenuTrigger render={<SidebarMenuButton className="relative size-8 p-0 justify-center" />}>
                <Avatar className="size-6">
                  <AvatarImage
                    alt="Luke Tracy"
                    src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=128&h=128&dpr=2&q=80"
                  />
                  <AvatarFallback>LT</AvatarFallback>
                </Avatar>
                <span className="absolute bottom-px right-px size-2.5 rounded-full border-2 border-sidebar bg-emerald-500" />
                <span className="sr-only">User menu</span>
              </MenuTrigger>
              <MenuPopup side={isBetweenMdAndLg ? "right" : "bottom"} alignOffset={isBetweenMdAndLg ? -3 : undefined} align="start">
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
        <NavSecondary items={data.navFooter} className="mt-auto" />
        <div className="px-3 pb-4 text-[0.625rem] text-sidebar-foreground/50 max-lg:hidden">
          © 2025 Cal.com, Inc. v.5.9.6-h-2701b4d
        </div>        
      </SidebarContent>
    </Sidebar>
  )
}

