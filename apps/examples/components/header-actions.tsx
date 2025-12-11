"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { UserMenu } from "@/components/user-menu";

export function HeaderActions() {
  return (
    <div className="flex items-center gap-0.5 md:flex-col lg:flex-row">
      <SidebarMenuButton
        aria-label="Search"
        className="shrink-0 justify-center p-0 text-sidebar-foreground/80 md:max-lg:order-1 lg:size-8"
      >
        <SearchIcon />
      </SidebarMenuButton>
      <SidebarMenuButton
        className="shrink-0 justify-center p-0 lg:size-8"
        render={
          <Link href="#">
            <Avatar className="lg:size-6">
              <AvatarImage
                alt="Luke Tracy"
                src="https://pbs.twimg.com/profile_images/1994776674391457792/7utKOMi6_400x400.jpg"
              />
              <AvatarFallback>CC</AvatarFallback>
            </Avatar>
          </Link>
        }
      />
      <UserMenu />
    </div>
  );
}
