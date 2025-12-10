"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@coss/ui/components/collapsible"
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@coss/ui/components/menu"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  sidebarTooltipHandle,
  useSidebarMenuOpen,
} from "@/components/ui/sidebar"
import {
  TooltipTrigger,
} from "@coss/ui/components/tooltip"
import { useIsBetweenMdAndLg } from "@/hooks/use-mobile"
import { ChevronRightIcon } from "lucide-react"

function MenuWithTooltipDisable({
  item,
  menuButton,
  TooltipContent,
  items,
}: {
  item: { title: string; isActive?: boolean; badge?: string }
  menuButton: React.ReactElement<Record<string, unknown>>
  TooltipContent: React.ComponentType
  items: { title: string; url: string }[]
}) {
  const { registerMenu } = useSidebarMenuOpen()
  const unregisterRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      if (unregisterRef.current) {
        unregisterRef.current()
      }
    }
  }, [])

  return (
    <SidebarMenuItem>
      <Menu
        onOpenChange={(open) => {
          if (open) {
            unregisterRef.current = registerMenu()
          } else {
            if (unregisterRef.current) {
              unregisterRef.current()
              unregisterRef.current = null
            }
          }
        }}
      >
        <TooltipTrigger
          className="after:absolute after:top-0 after:-bottom-1 after:-inset-x-1"
          handle={sidebarTooltipHandle}
          payload={TooltipContent}
          render={
            <MenuTrigger render={menuButton} />
          }
        />
        <MenuPopup side="right" align="start" alignOffset={-3}>
          <MenuGroup>
            <MenuGroupLabel>{item.title}</MenuGroupLabel>
            {items.map((subItem) => (
              <MenuItem key={subItem.title} render={<a href={subItem.url} />}>
                {subItem.title}
              </MenuItem>
            ))}
          </MenuGroup>
        </MenuPopup>
      </Menu>
    </SidebarMenuItem>
  )
}

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: any
    isActive?: boolean
    badge?: string
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const isBetweenMdAndLg = useIsBetweenMdAndLg()

  return (
    <SidebarGroup>
      <SidebarMenu className="gap-0.5">
        {items.map((item) => {
          if (item.items?.length && isBetweenMdAndLg) {
            // Show Menu in collapsed mode
            const TooltipContent = () => item.title;
            const menuButton = (
              <SidebarMenuButton isActive={item.isActive}>
                <item.icon />
                {item.badge && (
                  <SidebarMenuBadge className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    {item.badge}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuButton>
            ) as React.ReactElement<Record<string, unknown>>;

            return (
              <MenuWithTooltipDisable
                key={item.title}
                item={item}
                menuButton={menuButton}
                TooltipContent={TooltipContent}
                items={item.items}
              />
            )
          }

          // Show Collapsible in expanded mode or for items without children
          return (
            <Collapsible
              key={item.title}
              render={<SidebarMenuItem />}
              defaultOpen={item.isActive}
            >
              {item.items?.length ? (
                <>
                  <CollapsibleTrigger className="font-medium text-sidebar-foreground justify-between" render={<SidebarMenuButton tooltip={item.title} isActive={item.isActive} />}>
                    <span className="flex items-center gap-2">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </span>
                    {item.badge && (
                      <SidebarMenuBadge className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                    <ChevronRightIcon className="transition-transform in-data-open:rotate-90 opacity-72" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="mx-0 px-0 border-none gap-0.5">
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton className="ps-8.5 from-secondary to-secondary/64 hover:bg-transparent active:bg-transparent data-[active=true]:bg-linear-to-tr" render={<a href={subItem.url} />}>
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : (
                <SidebarMenuButton
                  className="font-medium text-sidebar-foreground"
                  render={<a href={item.url} />}
                  tooltip={item.title}
                  isActive={item.isActive}
                >
                  <item.icon />
                  <span>{item.title}</span>
                  {item.badge && (
                    <SidebarMenuBadge className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      {item.badge}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuButton>
              )}
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
