"use client";

import { Badge } from "@coss/ui/components/badge";
import { Frame, FrameFooter, FramePanel } from "@coss/ui/components/frame";
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
import { useState } from "react";
import {
  ListItem,
  ListItemBadges,
  ListItemContent,
  ListItemDescription,
  ListItemHeader,
  ListItemLabel,
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

interface EventTypeItemContentProps {
  eventType: EventType;
  isHidden: boolean;
  eventPath: string;
  onHiddenChange: (hidden: boolean) => void;
}

function EventTypeItemContent({
  eventType,
  isHidden,
  eventPath,
  onHiddenChange,
}: EventTypeItemContentProps) {
  const getSchedulingTypeLabel = (et: EventType) => {
    if (!et.schedulingType) return null;
    switch (et.schedulingType) {
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

  const getEventTypeColors = (et: EventType) => {
    if (!et.eventTypeColor) return null;
    return {
      dark: et.eventTypeColor.darkEventTypeColor,
      light: et.eventTypeColor.lightEventTypeColor,
    };
  };

  const isRecurring = (et: EventType) => et.recurringEvent !== null;
  const isPaid = (et: EventType) => et.price > 0;
  const requiresConfirmation = (et: EventType) => et.requiresConfirmation;
  const hasSeats = (et: EventType) =>
    et.seatsPerTimeSlot !== null && et.seatsPerTimeSlot > 0;

  const eventTypeColors = getEventTypeColors(eventType);

  return (
    <ListItem>
      <ListItemLabel
        colorDark={eventTypeColors?.dark}
        colorLight={eventTypeColors?.light}
      />
      <ListItemContent>
        <ListItemHeader>
          <div className="flex items-center gap-2">
            <ListItemTitle href={eventPath}>{eventType.title}</ListItemTitle>
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
            <Badge className="pointer-events-none" variant="warning">
              <EyeOffIcon />
              Hidden
            </Badge>
          )}
          <Badge className="pointer-events-none tabular-nums" variant="outline">
            <ClockIcon />
            {formatDuration(eventType.length)}
          </Badge>
          {getSchedulingTypeLabel(eventType) && (
            <Badge className="pointer-events-none" variant="outline">
              {eventType.schedulingType === "ROUND_ROBIN" ? (
                <ShuffleIcon />
              ) : (
                <UsersIcon />
              )}
              {getSchedulingTypeLabel(eventType)}
            </Badge>
          )}
          {isRecurring(eventType) && (
            <Badge className="pointer-events-none" variant="outline">
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
            <Badge className="pointer-events-none" variant="outline">
              <ClipboardCheckIcon />
              Requires confirmation
            </Badge>
          )}
          {hasSeats(eventType) && (
            <Badge className="pointer-events-none" variant="outline">
              <ArmchairIcon />
              {eventType.seatsPerTimeSlot} seats
            </Badge>
          )}
        </ListItemBadges>
      </ListItemContent>

      <EventTypeActions
        isHidden={isHidden}
        onHiddenChange={onHiddenChange}
        tooltipHandle={tooltipHandle}
      />
    </ListItem>
  );
}

export function EventTypesList() {
  const showLoading = useLoadingState(ARTIFICIAL_DELAY_MS);
  const [hiddenStates, setHiddenStates] = useState<Record<number, boolean>>(
    Object.fromEntries(mockEventTypes.map((et) => [et.id, et.hidden])),
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

  if (showLoading) {
    return (
      <Frame className="-m-1">
        <FramePanel className="bg-transparent p-0">
          <EventTypeSkeletonItem />
          <EventTypeSkeletonItem />
          <EventTypeSkeletonItem />
          <EventTypeSkeletonItem />
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
        <FramePanel className="bg-transparent p-0">
          {mockEventTypes.map((eventType) => {
            const isHidden = hiddenStates[eventType.id];
            const eventPath = getEventTypePath(eventType);

            return (
              <EventTypeItemContent
                eventPath={eventPath}
                eventType={eventType}
                isHidden={isHidden ?? false}
                key={eventType.id}
                onHiddenChange={(hidden) =>
                  handleHiddenToggle(eventType.id, hidden)
                }
              />
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
