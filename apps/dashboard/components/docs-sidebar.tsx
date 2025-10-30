"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  DashboardSquare01Icon,
  BookOpen02Icon,
  ApiIcon,
  Atom01Icon,
  CreditCardPosIcon,
  UserGroupIcon,
  UserSettings01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/ui/sidebar"

const routes = [
  {
    name: "Dashboard",
    href: "/",
    icon: DashboardSquare01Icon,
  },
  {
    name: "Documentation",
    href: "/docs",
    icon: BookOpen02Icon,
  },
  {
    name: "API reference",
    href: "/api-reference",
    icon: ApiIcon,
  },
  {
    name: "Atoms",
    href: "/atoms",
    icon: Atom01Icon,
  },
  {
    name: "Billing",
    href: "/billing",
    icon: CreditCardPosIcon,
  },
  {
    name: "Members",
    href: "/members",
    icon: UserGroupIcon,
  },
  {
    name: "Managed Users",
    href: "/managed-users",
    icon: UserSettings01Icon,
  },
]

export function DocsSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar
      className="sticky top-(--header-height) z-30 hidden h-[calc(100svh-var(--header-height))] bg-transparent lg:flex"
      collapsible="none"
    >
      <SidebarContent className="no-scrollbar px-4 py-2">
        <div className="h-(--top-spacing) shrink-0" />
        <SidebarGroup className="gap-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {routes.map((route) => (
                <SidebarMenuItem key={route.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === route.href}
                    className="from-secondary to-secondary/64 ps-3.5 text-sidebar-foreground/64 hover:bg-transparent active:bg-transparent data-[active=true]:bg-gradient-to-tr"
                  >
                    <Link href={route.href} className="flex items-center gap-2">
                      <HugeiconsIcon icon={route.icon} />
                      {route.name}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
