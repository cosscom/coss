"use client";

import { Badge } from "@coss/ui/components/badge";
import { Frame, FrameFooter, FramePanel } from "@coss/ui/components/frame";
import { Separator } from "@coss/ui/components/separator";
import { Skeleton } from "@coss/ui/components/skeleton";
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
  RepeatIcon,
  ShuffleIcon,
  UsersIcon,
} from "lucide-react";
import { Fragment, useState } from "react";
import {
  ListItem,
  ListItemBadges,
  ListItemContent,
  ListItemDescription,
  ListItemDragHandle,
  ListItemHeader,
  ListItemTitle,
} from "@/components/list-item";
import { useLoadingState } from "@/hooks/use-loading-state";
import {
  type EventType,
  formatDuration,
  mockEventTypeGroups,
  mockEventTypes,
} from "@/lib/mock-event-types-data";
import {
  EventTypeActions,
  EventTypeActionsSkeleton,
} from "./event-type-actions";

const tooltipHandle = TooltipCreateHandle<React.ComponentType>();

const eventTypes = mockEventTypes;
const defaultProfile = mockEventTypeGroups[0]?.profile ?? {
  eventTypesLockedByOrg: false,
  image: null,
  name: "User",
  slug: "user",
};

function EventTypeSkeletonItem() {
  return (
    <ListItem>
      <ListItemContent>
        <ListItemHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-full max-w-48 sm:h-5" />
            <Skeleton className="h-4 w-full max-w-32 max-sm:hidden" />
          </div>
          <Skeleton className="my-0.5 h-4 w-full max-w-82" />
        </ListItemHeader>
        <ListItemBadges>
          <Skeleton className="h-5.5 w-14 sm:h-4.5" />
          <Skeleton className="h-5.5 w-14 sm:h-4.5" />
        </ListItemBadges>
      </ListItemContent>
      <EventTypeActionsSkeleton />
    </ListItem>
  );
}

const ARTIFICIAL_DELAY_MS = 800;

export function EventTypesList() {
  const showLoading = useLoadingState(ARTIFICIAL_DELAY_MS);
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

  const getEventTypeColors = (eventType: EventType) => {
    if (!eventType.eventTypeColor) return null;
    return {
      dark: eventType.eventTypeColor.darkEventTypeColor,
      light: eventType.eventTypeColor.lightEventTypeColor,
    };
  };

  if (showLoading) {
    return (
      <Frame className="-m-1">
        <FramePanel className="p-0">
          <EventTypeSkeletonItem />
          <Separator />
          <EventTypeSkeletonItem />
          <Separator />
          <EventTypeSkeletonItem />
          <Separator />
          <EventTypeSkeletonItem />
          <Separator />
          <EventTypeSkeletonItem />
        </FramePanel>
        <FrameFooter>
          <Skeleton className="mx-auto h-5 w-32" />
        </FrameFooter>
      </Frame>
    );
  }

  return (
    <TooltipProvider delay={0}>
      <Frame className="-m-1">
        <FramePanel className="p-0">
          {eventTypes.map((eventType, index) => {
            const isHidden = hiddenStates[eventType.id];
            const isLast = index === eventTypes.length - 1;
            const eventPath = getEventTypePath(eventType);

            return (
              <Fragment key={eventType.id}>
                <ListItem
                  labelColorDark={
                    getEventTypeColors(eventType)?.dark ?? undefined
                  }
                  labelColorLight={
                    getEventTypeColors(eventType)?.light ?? undefined
                  }
                >
                  <ListItemDragHandle />
                  <ListItemContent>
                    <ListItemHeader>
                      <div className="flex items-center gap-2">
                        <ListItemTitle className="truncate" href={eventPath}>
                          {eventType.title}
                        </ListItemTitle>
                        <span className="text-muted-foreground text-xs max-sm:hidden">
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
