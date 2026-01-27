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
  GaugeIcon,
  LogOutIcon,
  MessageCircleQuestionMarkIcon,
  MilestoneIcon,
  MonitorDownIcon,
  MoonStarIcon,
  SettingsIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { useIsBetweenMdAndLg } from "@/hooks/use-mobile";

interface UserMenuProps {
  variant?: "sidebar" | "mobile";
}

export function UserMenu({ variant = "sidebar" }: UserMenuProps) {
  const isBetweenMdAndLg = useIsBetweenMdAndLg();

  return (
    <Menu>
      <MenuTrigger
        render={
          <SidebarMenuButton className="relative shrink-0 justify-center p-0 lg:size-8" />
        }
      >
        <Avatar className="lg:size-6">
          <AvatarImage
            alt="Luke Tracy"
            src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=128&h=128&dpr=2&q=80"
          />
          <AvatarFallback>LT</AvatarFallback>
        </Avatar>
        <span className="absolute right-[3px] bottom-[3px] size-2.5 rounded-full border-2 border-sidebar bg-emerald-500 lg:right-0.5 lg:bottom-0.5" />
        <span className="sr-only">User menu</span>
      </MenuTrigger>
      <MenuPopup
        align={variant === "mobile" ? "end" : "start"}
        alignOffset={variant === "sidebar" && isBetweenMdAndLg ? -3 : undefined}
        side={
          variant === "mobile"
            ? "bottom"
            : isBetweenMdAndLg
              ? "right"
              : "bottom"
        }
      >
        <MenuGroup>
          <MenuGroupLabel>Luke Tracy</MenuGroupLabel>
          <MenuItem>
            <UserRoundIcon />
            My profile
          </MenuItem>
          <MenuItem render={<Link href="/settings/my-account/general" />}>
            <SettingsIcon />
            My settings
          </MenuItem>
          <MenuItem>
            <MoonStarIcon />
            Out of office
          </MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuItem>
            <MilestoneIcon />
            Roadmap
          </MenuItem>
          <MenuItem>
            <MessageCircleQuestionMarkIcon />
            Help
          </MenuItem>
          <MenuItem>
            <MonitorDownIcon />
            Download desktop app
          </MenuItem>
          <MenuItem>
            <GaugeIcon />
            Platform
          </MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuItem>
          <LogOutIcon />
          Sign out
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}
