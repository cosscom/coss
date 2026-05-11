"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { useMediaQuery } from "@coss/ui/hooks/use-media-query";
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
import type * as React from "react";
import {
  AdaptiveMenu,
  AdaptiveMenuGroup,
  AdaptiveMenuGroupLabel,
  AdaptiveMenuItem,
  AdaptiveMenuPopup,
  AdaptiveMenuSeparator,
  AdaptiveMenuTrigger,
} from "@/components/shared/adaptive-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";

interface UserMenuProps {
  variant?: "sidebar" | "mobile";
}

const triggerButtonClassName = "relative shrink-0 justify-center p-0 lg:size-8";

function UserMenuTriggerContent(): React.ReactElement {
  return (
    <>
      <Avatar className="lg:size-6">
        <AvatarImage
          alt="Luke Tracy"
          src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=128&h=128&dpr=2&q=80"
        />
        <AvatarFallback>LT</AvatarFallback>
      </Avatar>
      <span className="absolute right-[3px] bottom-[3px] size-2.5 rounded-full border-2 border-sidebar bg-emerald-500 lg:right-0.5 lg:bottom-0.5" />
      <span className="sr-only">User menu</span>
    </>
  );
}

export function UserMenu({
  variant = "sidebar",
}: UserMenuProps): React.ReactElement {
  const isBetweenMdAndLg = useMediaQuery("md:max-lg");

  return (
    <AdaptiveMenu>
      <AdaptiveMenuTrigger
        render={<SidebarMenuButton className={triggerButtonClassName} />}
      >
        <UserMenuTriggerContent />
      </AdaptiveMenuTrigger>
      <AdaptiveMenuPopup
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
        <AdaptiveMenuGroup>
          <AdaptiveMenuGroupLabel>Luke Tracy</AdaptiveMenuGroupLabel>
          <AdaptiveMenuItem>
            <UserRoundIcon aria-hidden />
            My profile
          </AdaptiveMenuItem>
          <AdaptiveMenuItem
            render={<Link href="/settings/my-account/general" />}
          >
            <SettingsIcon aria-hidden />
            My settings
          </AdaptiveMenuItem>
          <AdaptiveMenuItem>
            <MoonStarIcon aria-hidden />
            Out of office
          </AdaptiveMenuItem>
        </AdaptiveMenuGroup>
        <AdaptiveMenuSeparator />
        <AdaptiveMenuGroup>
          <AdaptiveMenuItem>
            <MilestoneIcon aria-hidden />
            Roadmap
          </AdaptiveMenuItem>
          <AdaptiveMenuItem>
            <MessageCircleQuestionMarkIcon aria-hidden />
            Help
          </AdaptiveMenuItem>
          <AdaptiveMenuItem>
            <MonitorDownIcon aria-hidden />
            Download desktop app
          </AdaptiveMenuItem>
          <AdaptiveMenuItem>
            <GaugeIcon aria-hidden />
            Platform
          </AdaptiveMenuItem>
        </AdaptiveMenuGroup>
        <AdaptiveMenuSeparator />
        <AdaptiveMenuItem>
          <LogOutIcon aria-hidden />
          Sign out
        </AdaptiveMenuItem>
      </AdaptiveMenuPopup>
    </AdaptiveMenu>
  );
}
