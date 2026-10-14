"use client";

import { DASHBOARD_PATH } from "@coss/auth/slugs";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@coss/ui/components/sidebar";
import { BookOpenIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** coss.com's wordmark, as in the site's header; an optional label names the area ("admin"). */
export function SidebarWordmark(props: { label?: ReactNode; href?: string }) {
  return (
    <div className="flex h-8 items-center gap-1.5 px-2 group-data-[collapsible=icon]:hidden">
      <Link
        className="font-bold font-heading text-xl [font-variation-settings:'GEOM'_50,'opsz'_32]"
        href={props.href ?? DASHBOARD_PATH}
      >
        coss.com
      </Link>
      {props.label ? (
        <span className="font-heading font-semibold text-muted-foreground/64 text-xl [font-variation-settings:'GEOM'_50,'opsz'_32]">
          {props.label}
        </span>
      ) : null}
    </div>
  );
}

/** The docs live on the site's zone of the same origin (`/docs`), so this is a plain link. */
export function SidebarDocsLink() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton render={<a href="/docs" />} tooltip="Documentation">
          <BookOpenIcon />
          <span>Documentation</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/** A plain link row in the sidebar (back to the dashboard from the account or admin areas). */
export function SidebarLink(props: { href: string; icon: ReactNode; children: string }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton render={<Link href={props.href} />} tooltip={props.children}>
          {props.icon}
          <span>{props.children}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
