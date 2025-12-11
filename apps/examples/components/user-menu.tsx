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
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { useIsBetweenMdAndLg } from "@/hooks/use-mobile";

interface UserMenuProps {
  variant?: "sidebar" | "mobile";
}

export function UserMenu({ variant = "sidebar" }: UserMenuProps) {
  const isBetweenMdAndLg = useIsBetweenMdAndLg();

  const Wrapper = variant === "sidebar" ? SidebarMenuButton : "button";

  return (
    <Menu>
      <MenuTrigger
        render={
          <Wrapper
            className={
              variant === "sidebar"
                ? "relative size-8 justify-center p-0"
                : "relative flex size-8 items-center justify-center rounded-lg"
            }
          />
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
  );
}
