"use client";

import { Badge } from "@coss/ui/components/badge";
import { Frame, FrameFooter, FramePanel } from "@coss/ui/components/frame";
import { Skeleton } from "@coss/ui/components/skeleton";
import { toastManager } from "@coss/ui/components/toast";
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
import { useRef, useState } from "react";
import {
  ResourceItem,
  ResourceItemBadges,
  ResourceItemContent,
  ResourceItemDescription,
  ResourceItemDragHandle,
  ResourceItemHeader,
  ResourceItemTitle,
} from "@/components/resource-item";
import {
  SortableItem,
  type SortableItemRenderProps,
  SortableList,
} from "@/components/sortable";
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
    <ResourceItem>
      <ResourceItemContent>
        <ResourceItemHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-full max-w-48 sm:h-5" />
            <Skeleton className="h-4 w-full max-w-32 max-sm:hidden" />
          </div>
          <Skeleton className="my-0.5 h-4 w-full max-w-82" />
        </ResourceItemHeader>
        <ResourceItemBadges>
          <Skeleton className="h-5.5 w-14 sm:h-4.5" />
          <Skeleton className="h-5.5 w-14 sm:h-4.5" />
        </ResourceItemBadges>
      </ResourceItemContent>
      <EventTypeActionsSkeleton />
    </ResourceItem>
  );
}

const ARTIFICIAL_DELAY_MS = 800;

interface EventTypeItemContentProps {
  eventType: EventType;
  isHidden: boolean;
  eventPath: string;
  onHiddenChange: (hidden: boolean) => void;
  sortableProps?: SortableItemRenderProps;
}

function EventTypeItemContent({
  eventType,
  isHidden,
  eventPath,
  onHiddenChange,
  sortableProps,
  isOverlay = false,
}: EventTypeItemContentProps & { isOverlay?: boolean }) {
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

  return (
    <ResourceItem
      isOverlay={isOverlay}
      labelColorDark={getEventTypeColors(eventType)?.dark ?? undefined}
      labelColorLight={getEventTypeColors(eventType)?.light ?? undefined}
      sortableDragging={sortableProps?.isDragging}
      sortableDraggingAny={sortableProps?.isDraggingAny}
      sortableListeners={isOverlay ? undefined : sortableProps?.listeners}
      sortableRef={isOverlay ? undefined : sortableProps?.setNodeRef}
    >
      {sortableProps && !isOverlay && (
        <ResourceItemDragHandle
          attributes={sortableProps.attributes}
          listeners={sortableProps.listeners}
        />
      )}
      <ResourceItemContent>
        <ResourceItemHeader>
          <div className="flex items-center gap-2">
            <ResourceItemTitle href={eventPath}>
              {eventType.title}
            </ResourceItemTitle>
            <span className="text-muted-foreground text-xs max-sm:hidden">
              {eventPath}
            </span>
          </div>
          {eventType.safeDescription && (
            <ResourceItemDescription className="line-clamp-2">
              {eventType.safeDescription}
            </ResourceItemDescription>
          )}
        </ResourceItemHeader>

        <ResourceItemBadges>
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
        </ResourceItemBadges>
      </ResourceItemContent>

      <EventTypeActions
        isHidden={isHidden}
        onHiddenChange={onHiddenChange}
        tooltipHandle={tooltipHandle}
      />
    </ResourceItem>
  );
}

export function EventTypesList() {
  const showLoading = useLoadingState(ARTIFICIAL_DELAY_MS);
  const [eventTypes, setEventTypes] = useState<EventType[]>(mockEventTypes);
  const [hiddenStates, setHiddenStates] = useState<Record<number, boolean>>(
    Object.fromEntries(mockEventTypes.map((et) => [et.id, et.hidden])),
  );
  const previousOrderRef = useRef<EventType[]>(eventTypes);
  const currentToastIdRef = useRef<string | null>(null);

  const handleReorder = (newOrder: EventType[]) => {
    if (currentToastIdRef.current) {
      toastManager.close(currentToastIdRef.current);
    }

    const previousOrder = previousOrderRef.current;
    previousOrderRef.current = newOrder;
    setEventTypes(newOrder);

    const toastId = toastManager.add({
      actionProps: {
        children: "Undo",
        onClick: () => {
          toastManager.close(toastId);
          currentToastIdRef.current = null;
          previousOrderRef.current = previousOrder;
          setEventTypes(previousOrder);
        },
      },
      title: "Event type order updated",
      type: "success",
    });
    currentToastIdRef.current = toastId;
  };

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
      <SortableList
        items={eventTypes}
        onReorder={handleReorder}
        renderOverlay={(eventType) => (
          <EventTypeItemContent
            eventPath={getEventTypePath(eventType)}
            eventType={eventType}
            isHidden={hiddenStates[eventType.id] ?? false}
            isOverlay
            onHiddenChange={() => {}}
          />
        )}
      >
        <div className="flex flex-col gap-2">
          {eventTypes.map((eventType, _index) => {
            const isHidden = hiddenStates[eventType.id];
            const eventPath = getEventTypePath(eventType);

            return (
              <SortableItem id={eventType.id} key={eventType.id}>
                {(sortableProps) => (
                  <EventTypeItemContent
                    eventPath={eventPath}
                    eventType={eventType}
                    isHidden={isHidden ?? false}
                    onHiddenChange={(hidden) =>
                      handleHiddenToggle(eventType.id, hidden)
                    }
                    sortableProps={sortableProps}
                  />
                )}
              </SortableItem>
            );
          })}
        </div>
      </SortableList>

      <div className="mt-6 text-center text-muted-foreground/72 text-sm">
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
