"use client";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Frame, FrameFooter, FramePanel } from "@coss/ui/components/frame";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@coss/ui/components/input-group";
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { Separator } from "@coss/ui/components/separator";
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
import { Fragment, useState } from "react";
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

      <Frame className="mt-4">
        <FramePanel className="p-0">
          {eventTypes.map((eventType, index) => {
            const isHidden = hiddenStates[eventType.id];
            const isLast = index === eventTypes.length - 1;
            return (
              <Fragment key={eventType.id}>
                <div className="relative p-5 transition-colors first:rounded-t-[calc(var(--radius-xl)-1px)] last:rounded-b-[calc(var(--radius-xl)-1px)] has-[a:hover]:bg-[color-mix(in_srgb,var(--color-background),var(--color-black)_2%)] dark:has-[a:hover]:bg-[color-mix(in_srgb,var(--color-background),var(--color-white)_2%)]">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div
                      className={cn(
                        "flex min-w-0 flex-1 flex-col gap-0.5 transition-opacity",
                        isHidden && "opacity-64",
                      )}
                    >
                      <h2 className="truncate font-medium text-sm">
                        <a
                          className="before:absolute before:inset-0"
                          href={eventType.path}
                        >
                          {eventType.title}
                        </a>
                      </h2>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <p className="truncate text-muted-foreground text-xs">
                          {eventType.path}
                        </p>
                        <span className="text-muted-foreground/32 text-xs">
                          •
                        </span>
                        <Badge
                          className="pointer-events-none tabular-nums"
                          size="sm"
                          variant="outline"
                        >
                          <ClockIcon className="opacity-72" />
                          {eventType.duration}
                        </Badge>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="relative flex items-center gap-3">
                      {isHidden ? (
                        <Badge size="sm" variant="warning">
                          Hidden
                        </Badge>
                      ) : null}

                      {/* Primary actions */}
                      <div className="flex items-center max-md:hidden">
                        <TooltipTrigger
                          handle={tooltipHandle}
                          payload={() => "Preview"}
                          render={
                            <Button
                              aria-label="Preview"
                              size="icon"
                              variant="ghost"
                            >
                              <EyeIcon />
                            </Button>
                          }
                        />

                        <TooltipTrigger
                          handle={tooltipHandle}
                          payload={() => "Copy link"}
                          render={
                            <Button
                              aria-label="Copy link"
                              size="icon"
                              variant="ghost"
                            >
                              <Link2Icon />
                              <span className="sr-only">Copy link</span>
                            </Button>
                          }
                        />

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
                                    variant="ghost"
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
                            <MenuGroup>
                              <MenuCheckboxItem
                                checked={!isHidden}
                                onCheckedChange={(checked) => {
                                  handleHiddenToggle(eventType.id, !checked);
                                }}
                                variant="switch"
                              >
                                Show on profile
                              </MenuCheckboxItem>
                            </MenuGroup>
                            <MenuSeparator />
                            <MenuItem variant="destructive">Delete</MenuItem>
                          </MenuPopup>
                        </Menu>
                      </div>

                      {/* Mobile Trigger */}
                      <Menu>
                        <MenuTrigger
                          className="md:hidden"
                          render={
                            <Button
                              aria-label="More options"
                              size="icon"
                              variant="ghost"
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
                          <MenuGroup>
                            <MenuCheckboxItem
                              checked={!isHidden}
                              onCheckedChange={(checked) => {
                                handleHiddenToggle(eventType.id, !checked);
                              }}
                              variant="switch"
                            >
                              Show on profile
                            </MenuCheckboxItem>
                          </MenuGroup>
                          <MenuSeparator />
                          <MenuItem variant="destructive">Delete</MenuItem>
                        </MenuPopup>
                      </Menu>
                    </div>
                  </div>
                </div>
                {!isLast && <Separator />}
              </Fragment>
            );
          })}
        </FramePanel>
        <FrameFooter>
          <div className="text-center text-muted-foreground/72 text-sm">
            No more results
          </div>
        </FrameFooter>
      </Frame>

      <Tooltip handle={tooltipHandle}>
        {({ payload: Payload }) => (
          <TooltipPopup>{Payload !== undefined && <Payload />}</TooltipPopup>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
