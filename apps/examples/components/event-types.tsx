"use client"

import { useState } from "react"
import { Button } from "@coss/ui/components/button"
import { Switch } from "@coss/ui/components/switch"
import { Badge } from "@coss/ui/components/badge"
import {
  Menu,
  MenuTrigger,
  MenuPopup,
  MenuItem,
  MenuSeparator,
} from "@coss/ui/components/menu"
import { Card, CardPanel } from "@coss/ui/components/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@coss/ui/components/input-group"
import { Group, GroupSeparator } from "@coss/ui/components/group"
import {
  Tooltip,
  TooltipCreateHandle,
  TooltipProvider,
  TooltipTrigger,
  TooltipPopup,
} from "@coss/ui/components/tooltip"
import { 
  SearchIcon,
  PlusIcon,
  ClockIcon,
  EyeIcon,
  Link2Icon,
  EllipsisIcon,
} from "lucide-react"

const tooltipHandle = TooltipCreateHandle<React.ComponentType>()

const eventTypes = [
  {
    id: 1,
    title: "15 Min Meeting",
    path: "/pasquale/15min",
    duration: "15m",
    enabled: true,
    hidden: false,
  },
  {
    id: 2,
    title: "30 Min Meeting",
    path: "/pasquale/30min",
    duration: "30m",
    enabled: true,
    hidden: false,
  },
  {
    id: 3,
    title: "Secret Meeting",
    path: "/pasquale/secret",
    duration: "15m",
    enabled: false,
    hidden: true,
  },
]

export function EventTypes() {
  const [enabledStates, setEnabledStates] = useState<Record<number, boolean>>(
    Object.fromEntries(eventTypes.map((et) => [et.id, et.enabled]))
  )

  const handleToggle = (id: number) => {
    setEnabledStates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  return (
    <TooltipProvider delay={150} timeout={0}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl leading-none font-heading">
            Event Types
          </h1>
          <p className="text-sm text-muted-foreground">
            Create events to share for people to book on your calendar.
          </p>
        </div>
        <Button>
          <PlusIcon className="opacity-72 -ms-1" />
          New
        </Button>
      </div>

      {/* Search */}
      <div className="mt-6">
        <InputGroup className="max-w-64">
          <InputGroupInput aria-label="Search" placeholder="Search…" type="search" />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
      </div>

      <div className="mt-4 *:not-last:rounded-b-none *:not-first:rounded-t-none *:not-first:before:rounded-t-none *:not-last:border-b-0 *:not-last:before:rounded-b-none *:not-last:before:hidden dark:*:first:before:block dark:*:not-first:before:hidden">
        {eventTypes.map((eventType) => {
          const isEnabled = enabledStates[eventType.id]
          return (
            <Card key={eventType.id} className="has-[a:hover]:bg-[color-mix(in_srgb,var(--color-card),var(--color-black)_2%)] dark:has-[a:hover]:bg-[color-mix(in_srgb,var(--color-card),var(--color-white)_2%)] transition-colors py-5">
              <CardPanel className="px-5">
                <div className="flex items-center justify-between gap-2">
                  {/* Content */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-sm">
                        <a href={eventType.path} className="before:absolute before:inset-0">{eventType.title}</a>
                      </h2>
                      <Badge variant="outline" className="pointer-events-none">
                        <ClockIcon className="opacity-72" />
                        {eventType.duration}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <p className="text-muted-foreground text-xs">{eventType.path}</p>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-4 p-6 -m-6 relative">
                    <div className="flex items-center gap-2">
                      {!isEnabled ? (
                        <Badge variant="outline" size="sm" className="pointer-events-none">Hidden</Badge>
                      ) : null}
                      <Tooltip>
                        <TooltipTrigger render={
                          <Switch checked={isEnabled} onCheckedChange={() => handleToggle(eventType.id)} />
                        } />
                        <TooltipPopup sideOffset={11}>
                          {isEnabled ? "Disable event type" : "Enable event type"}
                        </TooltipPopup>
                      </Tooltip>
                    </div>
                    <Group>
                      <TooltipTrigger
                        handle={tooltipHandle}
                        payload={() => "Preview"}
                        render={
                          <Button variant="outline" size="icon" aria-label="Preview">
                            <EyeIcon />
                          </Button>
                        }
                      />
                      <GroupSeparator />
                      <TooltipTrigger
                        handle={tooltipHandle}
                        payload={() => "Copy link"}
                        render={
                          <Button variant="outline" size="icon" aria-label="Copy link">
                            <Link2Icon />
                            <span className="sr-only">Copy link</span>
                          </Button>
                        }
                      />
                      <GroupSeparator />
                      <Menu>
                        <MenuTrigger render={
                          <TooltipTrigger
                            handle={tooltipHandle}
                            payload={() => "More options"}
                            render={
                              <Button variant="outline" size="icon" aria-label="More options">
                                <EllipsisIcon />
                              </Button>
                            }
                          />
                        }>
                        </MenuTrigger>
                        <MenuPopup align="end">
                          <MenuItem>
                            Edit
                          </MenuItem>
                          <MenuItem>
                            Duplicate
                          </MenuItem>
                          <MenuItem>
                            Embed
                          </MenuItem>
                          <MenuSeparator />
                          <MenuItem variant="destructive">
                            Delete
                          </MenuItem>
                        </MenuPopup>
                      </Menu>
                    </Group>
                  </div>
                </div>
              </CardPanel>
            </Card>
          )
        })}
      </div>

      {/* No more results */}
      <div className="mt-6 text-center text-sm text-muted-foreground/64">
        No more results
      </div>

      <Tooltip handle={tooltipHandle}>
        {({ payload: Payload }) => (
          <TooltipPopup>{Payload !== undefined && <Payload />}</TooltipPopup>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}

