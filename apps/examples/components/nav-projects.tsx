"use client"

import {
  Folder,
  MoreHorizontal,
  Share,
  Trash2,
  type LucideIcon,
} from "lucide-react"

import {
  Menu,
  MenuPopup,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@coss/ui/components/sidebar"
import { useIsMobile } from "@/hooks/use-mobile"

export function NavProjects({
  projects,
}: {
  projects: {
    name: string
    url: string
    icon: LucideIcon
  }[]
}) {
  const isMobile = useIsMobile()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton render={<a href={item.url} />}>
              <item.icon />
              <span>{item.name}</span>
            </SidebarMenuButton>
            <Menu>
              <MenuTrigger render={<SidebarMenuAction showOnHover />}>
                <MoreHorizontal />
                <span className="sr-only">More</span>
              </MenuTrigger>
              <MenuPopup
                className="w-48"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <MenuItem>
                  <Folder className="text-muted-foreground" />
                  <span>View Project</span>
                </MenuItem>
                <MenuItem>
                  <Share className="text-muted-foreground" />
                  <span>Share Project</span>
                </MenuItem>
                <MenuSeparator />
                <MenuItem>
                  <Trash2 className="text-muted-foreground" />
                  <span>Delete Project</span>
                </MenuItem>
              </MenuPopup>
            </Menu>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton>
            <MoreHorizontal />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
