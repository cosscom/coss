"use client";

import Link from "next/link";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Frame, FrameFooter, FramePanel } from "@coss/ui/components/frame";
import { Group, GroupSeparator } from "@coss/ui/components/group";

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
import { Switch } from "@coss/ui/components/switch";
import {
  Tooltip,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import {
  ArmchairIcon,
  BanknoteIcon,
  ClipboardCheckIcon,
  ClockIcon,
  EllipsisIcon,
  EyeIcon,
  EyeOffIcon,
  Link2Icon,
  PlusIcon,
  RepeatIcon,
  SearchIcon,
  ShuffleIcon,
  UsersIcon,
} from "lucide-react";
import { Fragment, useState } from "react";
import { AddEventTypeDialog } from "@/components/add-event-type-dialog";
import {
  AppHeader,
  AppHeaderActions,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app-header";
import {
  type EventType,
  formatDuration,
  mockEventTypeGroups,
  mockEventTypes,
} from "@/lib/mock-event-types-data";

const tooltipHandle = TooltipCreateHandle<React.ComponentType>();

const eventTypes = mockEventTypes;
const defaultProfile = mockEventTypeGroups[0]?.profile ?? {
  eventTypesLockedByOrg: false,
  image: null,
  name: "User",
  slug: "user",
};

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

  // Helper to build event type path from Cal.com-compatible data
  const getEventTypePath = (eventType: EventType) => {
    return `/${defaultProfile.slug}/${eventType.slug}`;
  };

  // Helper to check if event type is a team event
  const _isTeamEvent = (eventType: EventType) => {
    return eventType.teamId !== null;
  };

  // Helper to check if event type is recurring
  const isRecurring = (eventType: EventType) => {
    return eventType.recurringEvent !== null;
  };

  // Helper to check if event type is paid
  const isPaid = (eventType: EventType) => {
    return eventType.price > 0;
  };

  // Helper to check if event type requires confirmation
  const requiresConfirmation = (eventType: EventType) => {
    return eventType.requiresConfirmation;
  };

  // Helper to check if event type has seats
  const hasSeats = (eventType: EventType) => {
    return (
      eventType.seatsPerTimeSlot !== null && eventType.seatsPerTimeSlot > 0
    );
  };

  // Helper to get scheduling type label
  const getSchedulingTypeLabel = (eventType: EventType) => {
    if (!eventType.schedulingType) return null;
    switch (eventType.schedulingType) {
      case "ROUND_ROBIN":
        return "Round Robin";
      case "COLLECTIVE":
        return "Collective";
      case "MANAGED":
        return "Managed";
      default:
        return null;
    }
  };

  // Helper to get event type color
  const getEventTypeColor = (eventType: EventType) => {
    if (!eventType.eventTypeColor) return null;
    return eventType.eventTypeColor.lightEventTypeColor;
  };

  return (
    <TooltipProvider delay={0}>
      <AppHeader>
        <AppHeaderContent title="Event Types">
          <AppHeaderDescription>
            Create events to share for people to book on your calendar.
          </AppHeaderDescription>
        </AppHeaderContent>
        <AppHeaderActions className="max-md:hidden">
          <InputGroup>
            <InputGroupInput
              aria-label="Search"
              placeholder="Search…"
              type="search"
            />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
          <AddEventTypeDialog>
            <PlusIcon className="-ms-1" />
            New
          </AddEventTypeDialog>
        </AppHeaderActions>
      </AppHeader>

      <Frame className="-m-1">
        <FramePanel className="p-0">
          {eventTypes.map((eventType, index) => {
            const isHidden = hiddenStates[eventType.id];
            const isLast = index === eventTypes.length - 1;
            const eventPath = getEventTypePath(eventType);
            return (
              <Fragment key={eventType.id}>
                <div className="relative p-5 transition-colors first:rounded-t-[calc(var(--radius-xl)-1px)] last:rounded-b-[calc(var(--radius-xl)-1px)] has-[[data-slot=list-item-title]:hover]:bg-[color-mix(in_srgb,var(--color-background),var(--color-black)_2%)] dark:has-[[data-slot=list-item-title]_a:hover]:bg-[color-mix(in_srgb,var(--color-background),var(--color-white)_2%)]">
                  {getEventTypeColor(eventType) && (
                    <div
                      className="absolute inset-y-0 start-0 w-0.5 bg-current"
                      style={{
                        color: getEventTypeColor(eventType) ?? undefined,
                      }}
                    />
                  )}
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex min-w-0 flex-1 flex-col gap-3">
                      {/* Title and Description wrapper */}
                      <div className="flex flex-col gap-1">
                        {/* Title with URL inline */}
                        <div className="flex items-center gap-2">
                          <h2 className="truncate font-medium text-sm" data-slot="list-item-title">
                            <Link
                              className="before:absolute before:inset-0"
                              href={eventPath}
                            >
                              {eventType.title}
                            </Link>
                          </h2>
                          <span className="text-muted-foreground text-xs">
                            {eventPath}
                          </span>
                        </div>
                        {/* Description */}
                        {eventType.safeDescription && (
                          <p className="line-clamp-2 text-muted-foreground text-sm">
                            {eventType.safeDescription}
                          </p>
                        )}
                      </div>
                      {/* Badges: Hidden first if hidden, then Duration, then all others */}
                      <div className="flex flex-wrap items-center gap-2 overflow-hidden">
                        {/* 1st: Hidden badge if hidden */}
                        {isHidden && (
                          <Badge
                            className="pointer-events-none"
                            variant="warning"
                          >
                            <EyeOffIcon className="opacity-72" />
                            Hidden
                          </Badge>
                        )}
                        {/* Duration */}
                        <Badge
                          className="pointer-events-none tabular-nums"
                          variant="outline"
                        >
                          <ClockIcon className="opacity-72" />
                          {formatDuration(eventType.length)}
                        </Badge>
                        {/* All other badges */}
                        {getSchedulingTypeLabel(eventType) && (
                          <Badge
                            className="pointer-events-none"
                            variant="outline"
                          >
                            {eventType.schedulingType === "ROUND_ROBIN" ? (
                              <ShuffleIcon className="opacity-72" />
                            ) : (
                              <UsersIcon className="opacity-72" />
                            )}
                            {getSchedulingTypeLabel(eventType)}
                          </Badge>
                        )}
                        {isRecurring(eventType) && (
                          <Badge
                            className="pointer-events-none"
                            variant="outline"
                          >
                            <RepeatIcon className="opacity-72" />
                            Recurring
                          </Badge>
                        )}
                        {isPaid(eventType) && (
                          <Badge
                            className="pointer-events-none tabular-nums"
                            variant="outline"
                          >
                            <BanknoteIcon className="opacity-72" />$
                            {(eventType.price / 100).toFixed(0)}
                          </Badge>
                        )}
                        {requiresConfirmation(eventType) && (
                          <Badge
                            className="pointer-events-none"
                            variant="outline"
                          >
                            <ClipboardCheckIcon className="opacity-72" />
                            Requires confirmation
                          </Badge>
                        )}
                        {hasSeats(eventType) && (
                          <Badge
                            className="pointer-events-none"
                            variant="outline"
                          >
                            <ArmchairIcon className="opacity-72" />
                            {eventType.seatsPerTimeSlot} seats
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="relative flex items-center gap-3">
                      {/* Desktop actions */}
                      <div className="flex items-center gap-4 max-md:hidden">
                        {/* Visibility switch */}
                        <Tooltip>
                          <TooltipTrigger
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

                        {/* Action buttons */}
                        <Group>
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
