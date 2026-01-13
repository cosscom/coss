"use client";

import { Badge } from "@coss/ui/components/badge";
import { Frame, FrameFooter, FramePanel } from "@coss/ui/components/frame";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@coss/ui/components/input-group";
import { Separator } from "@coss/ui/components/separator";
import {
  Tooltip,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipProvider,
} from "@coss/ui/components/tooltip";
import {
  ArmchairIcon,
  BanknoteIcon,
  ClipboardCheckIcon,
  ClockIcon,
  EyeOffIcon,
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
import { EventTypeActions } from "@/components/event-type-actions";
import {
  ListItem,
  ListItemBadges,
  ListItemContent,
  ListItemDescription,
  ListItemHeader,
  ListItemTitle,
} from "@/components/list-item";
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

  const handleHiddenToggle = (id: number, hidden: boolean) => {
    setHiddenStates((prev) => ({
      ...prev,
      [id]: hidden,
    }));
  };

  const getEventTypePath = (eventType: EventType) => {
    return `/${defaultProfile.slug}/${eventType.slug}`;
  };

  const isRecurring = (eventType: EventType) => {
    return eventType.recurringEvent !== null;
  };

  const isPaid = (eventType: EventType) => {
    return eventType.price > 0;
  };

  const requiresConfirmation = (eventType: EventType) => {
    return eventType.requiresConfirmation;
  };

  const hasSeats = (eventType: EventType) => {
    return (
      eventType.seatsPerTimeSlot !== null && eventType.seatsPerTimeSlot > 0
    );
  };

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
                <ListItem
                  className="p-5"
                  labelColor={getEventTypeColor(eventType) ?? undefined}
                >
                  <ListItemContent>
                    <ListItemHeader>
                      <div className="flex items-center gap-2">
                        <ListItemTitle className="truncate" href={eventPath}>
                          {eventType.title}
                        </ListItemTitle>
                        <span className="text-muted-foreground text-xs">
                          {eventPath}
                        </span>
                      </div>
                      {eventType.safeDescription && (
                        <ListItemDescription className="line-clamp-2">
                          {eventType.safeDescription}
                        </ListItemDescription>
                      )}
                    </ListItemHeader>

                    <ListItemBadges>
                      {isHidden && (
                        <Badge
                          className="pointer-events-none"
                          variant="warning"
                        >
                          <EyeOffIcon />
                          Hidden
                        </Badge>
                      )}
                      <Badge
                        className="pointer-events-none tabular-nums"
                        variant="outline"
                      >
                        <ClockIcon />
                        {formatDuration(eventType.length)}
                      </Badge>
                      {getSchedulingTypeLabel(eventType) && (
                        <Badge
                          className="pointer-events-none"
                          variant="outline"
                        >
                          {eventType.schedulingType === "ROUND_ROBIN" ? (
                            <ShuffleIcon />
                          ) : (
                            <UsersIcon />
                          )}
                          {getSchedulingTypeLabel(eventType)}
                        </Badge>
                      )}
                      {isRecurring(eventType) && (
                        <Badge
                          className="pointer-events-none"
                          variant="outline"
                        >
                          <RepeatIcon />
                          Recurring
                        </Badge>
                      )}
                      {isPaid(eventType) && (
                        <Badge
                          className="pointer-events-none tabular-nums"
                          variant="outline"
                        >
                          <BanknoteIcon />${(eventType.price / 100).toFixed(0)}
                        </Badge>
                      )}
                      {requiresConfirmation(eventType) && (
                        <Badge
                          className="pointer-events-none"
                          variant="outline"
                        >
                          <ClipboardCheckIcon />
                          Requires confirmation
                        </Badge>
                      )}
                      {hasSeats(eventType) && (
                        <Badge
                          className="pointer-events-none"
                          variant="outline"
                        >
                          <ArmchairIcon />
                          {eventType.seatsPerTimeSlot} seats
                        </Badge>
                      )}
                    </ListItemBadges>
                  </ListItemContent>

                  <EventTypeActions
                    isHidden={isHidden ?? false}
                    onHiddenChange={(hidden) =>
                      handleHiddenToggle(eventType.id, hidden)
                    }
                    tooltipHandle={tooltipHandle}
                  />
                </ListItem>
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
