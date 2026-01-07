"use client";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import { Group, GroupSeparator } from "@coss/ui/components/group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@coss/ui/components/input-group";
import {
  Menu,
  MenuCheckboxItem,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { Switch } from "@coss/ui/components/switch";
import {
  Tooltip,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { cn } from "@coss/ui/lib/utils";
import {
  ClockIcon,
  EllipsisIcon,
  EyeIcon,
  Link2Icon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { useState } from "react";
import { AddEventTypeDialog } from "./add-event-type-dialog";
import {
  AppHeader,
  AppHeaderActions,
  AppHeaderContent,
  AppHeaderDescription,
} from "./app-header";

const tooltipHandle = TooltipCreateHandle<React.ComponentType>();

const eventTypes = [
  {
    duration: "15m",
    hidden: false,
    id: 1,
    path: "/pasquale/15min",
    title: "15 Min Meeting",
  },
  {
    duration: "30m",
    hidden: false,
    id: 2,
    path: "/pasquale/30min",
    title: "30 Min Meeting",
  },
  {
    duration: "15m",
    hidden: false,
    id: 3,
    path: "/pasquale/secret",
    title: "Secret Meeting",
  },
  {
    duration: "15m",
    hidden: false,
    id: 4,
    path: "/pasquale/secret",
    title: "Secret Meeting",
  },
  {
    duration: "15m",
    hidden: false,
    id: 5,
    path: "/pasquale/secret",
    title: "Secret Meeting",
  },
  {
    duration: "15m",
    hidden: false,
    id: 6,
    path: "/pasquale/secret",
    title: "Secret Meeting",
  },
  {
    duration: "15m",
    hidden: false,
    id: 7,
    path: "/pasquale/secret",
    title: "Secret Meeting",
  },
  {
    duration: "15m",
    hidden: true,
    id: 8,
    path: "/pasquale/secret",
    title: "Secret Meeting",
  },
  {
    duration: "15m",
    hidden: false,
    id: 9,
    path: "/pasquale/secret",
    title: "Secret Meeting",
  },
  {
    duration: "15m",
    hidden: true,
    id: 10,
    path: "/pasquale/secret",
    title: "Secret Meeting",
  },
];

export function EventTypes() {
  const [hiddenStates, setHiddenStates] = useState<Record<number, boolean>>(
    Object.fromEntries(eventTypes.map((et) => [et.id, et.hidden])),
  );

  const handleHiddenToggle = (id: number, checked: boolean) => {
    setHiddenStates((prev) => ({
      ...prev,
      [id]: checked,
    }));
  };

  return (
    <TooltipProvider delay={150} timeout={0}>
      <AppHeader>
        <AppHeaderContent title="Event Types">
          <AppHeaderDescription>
            Create events to share for people to book on your calendar.
          </AppHeaderDescription>
        </AppHeaderContent>
        <AppHeaderActions>
          <AddEventTypeDialog className="max-md:hidden">
            <PlusIcon className="-ms-1 opacity-72" />
            New
          </AddEventTypeDialog>
        </AppHeaderActions>
      </AppHeader>

      {/* Search */}
      <div>
        <InputGroup className="md:max-w-64">
          <InputGroupInput
            aria-label="Search"
            placeholder="Search…"
            type="search"
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
      </div>

      <div className="mt-4 *:not-first:rounded-t-none *:not-last:rounded-b-none *:not-last:border-b-0 *:not-last:before:hidden *:not-first:before:rounded-t-none *:not-last:before:rounded-b-none dark:*:not-first:before:hidden dark:*:first:before:block">
        {eventTypes.map((eventType) => {
          const isHidden = hiddenStates[eventType.id];
          return (
            <Card
              className="py-5 transition-colors has-[a:hover]:bg-[color-mix(in_srgb,var(--color-card),var(--color-black)_2%)] dark:has-[a:hover]:bg-[color-mix(in_srgb,var(--color-card),var(--color-white)_2%)]"
              key={eventType.id}
            >
              <CardPanel className="px-5">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={cn(
                      "flex flex-col items-start gap-1 transition-opacity",
                      isHidden && "opacity-64",
                    )}
                  >
                    <div>
                      <h2 className="inline font-medium text-sm">
                        <a
                          className="before:absolute before:inset-0"
                          href={eventType.path}
                        >
                          {eventType.title}
                        </a>
                      </h2>
                      <p className="ms-1 inline text-muted-foreground text-xs max-md:hidden">
                        {eventType.path}
                      </p>
                    </div>
                    <Badge
                      className="pointer-events-none tabular-nums"
                      variant="outline"
                    >
                      <ClockIcon className="opacity-72" />
                      {eventType.duration}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="-m-6 relative flex items-center gap-4 p-6">
                    <div className="flex items-center gap-2">
                      {isHidden ? (
                        <Badge
                          className="pointer-events-none"
                          size="sm"
                          variant="outline"
                        >
                          Hidden
                        </Badge>
                      ) : null}
                      <Tooltip>
                        <TooltipTrigger
                          className="max-md:hidden"
                          render={
                            <Switch
                              checked={!isHidden}
                              onCheckedChange={(checked) =>
                                handleHiddenToggle(eventType.id, !checked)
                              }
                            />
                          }
                        />
                        <TooltipPopup sideOffset={11}>
                          {isHidden ? "Show on profile" : "Hide from profile"}
                        </TooltipPopup>
                      </Tooltip>
                    </div>
                    {/* Desktop: Group of buttons */}
                    <Group className="max-md:hidden">
                      <TooltipTrigger
                        handle={tooltipHandle}
                        payload={() => "Preview"}
                        render={
                          <Button
                            aria-label="Preview"
                            size="icon"
                            variant="outline"
                          >
                            <EyeIcon />
                          </Button>
                        }
                      />
                      <GroupSeparator />
                      <TooltipTrigger
                        handle={tooltipHandle}
                        payload={() => "Copy link"}
                        render={
                          <Button
                            aria-label="Copy link"
                            size="icon"
                            variant="outline"
                          >
                            <Link2Icon />
                            <span className="sr-only">Copy link</span>
                          </Button>
                        }
                      />
                      <GroupSeparator />
                      <Menu>
                        <MenuTrigger
                          render={
                            <TooltipTrigger
                              handle={tooltipHandle}
                              payload={() => "More options"}
                              render={
                                <Button
                                  aria-label="More options"
                                  size="icon"
                                  variant="outline"
                                >
                                  <EllipsisIcon />
                                </Button>
                              }
                            />
                          }
                        />
                        <MenuPopup align="end">
                          <MenuItem>Edit</MenuItem>
                          <MenuItem>Duplicate</MenuItem>
                          <MenuItem>Embed</MenuItem>
                          <MenuSeparator />
                          <MenuItem variant="destructive">Delete</MenuItem>
                        </MenuPopup>
                      </Menu>
                    </Group>
                    {/* Mobile: Single menu button with all actions */}
                    <Menu>
                      <MenuTrigger
                        className="md:hidden"
                        render={
                          <Button
                            aria-label="More options"
                            size="icon"
                            variant="outline"
                          >
                            <EllipsisIcon />
                          </Button>
                        }
                      />
                      <MenuPopup align="end">
                        <MenuItem>Preview</MenuItem>
                        <MenuItem>Copy link to event</MenuItem>
                        <MenuItem>Share</MenuItem>
                        <MenuItem>Edit</MenuItem>
                        <MenuItem>Duplicate</MenuItem>
                        <MenuSeparator />
                        <MenuItem variant="destructive">Delete</MenuItem>
                        <MenuSeparator />
                        <MenuCheckboxItem
                          checked={!isHidden}
                          onCheckedChange={(checked) => {
                            handleHiddenToggle(eventType.id, !checked);
                          }}
                          variant="switch"
                        >
                          Show on profile
                        </MenuCheckboxItem>
                      </MenuPopup>
                    </Menu>
                  </div>
                </div>
              </CardPanel>
            </Card>
          );
        })}
      </div>

      {/* No more results */}
      <div className="mt-6 text-center text-muted-foreground/64 text-sm">
        No more results
      </div>

      <Tooltip handle={tooltipHandle}>
        {({ payload: Payload }) => (
          <TooltipPopup>{Payload !== undefined && <Payload />}</TooltipPopup>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
