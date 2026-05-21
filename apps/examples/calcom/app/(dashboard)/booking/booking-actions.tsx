"use client";

import { Button } from "@coss/ui/components/button";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { Skeleton } from "@coss/ui/components/skeleton";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import {
  CalendarClockIcon,
  CheckIcon,
  CircleXIcon,
  EllipsisIcon,
  EyeOffIcon,
  FlagIcon,
  InfoIcon,
  MapPinIcon,
  PlayCircleIcon,
  ThumbsDownIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";
import type * as React from "react";

type BookingActionsProps = {
  isRecurring?: boolean;
  showPendingActions?: boolean;
};

export function BookingActions({
  isRecurring,
  showPendingActions,
}: BookingActionsProps) {
  return (
    <div className="relative z-1 flex items-center gap-2">
      {showPendingActions && (
        <>
          <TooltipIconButton
            icon={<ThumbsDownIcon />}
            label={isRecurring ? "Reject all" : "Reject"}
            variant="outline"
          />
          <TooltipIconButton
            icon={<CheckIcon />}
            label={isRecurring ? "Confirm all" : "Confirm"}
          />
        </>
      )}
      {isRecurring && (
        <TooltipIconButton
          icon={<CircleXIcon />}
          label="Cancel all remaining"
          variant="destructive-outline"
        />
      )}
      <Menu>
        <Tooltip>
          <MenuTrigger
            render={
              <TooltipTrigger
                render={
                  <Button aria-label="Options" size="icon" variant="outline">
                    <EllipsisIcon />
                  </Button>
                }
              />
            }
          />
          <TooltipPopup>Options</TooltipPopup>
        </Tooltip>
        <MenuPopup align="end">
          <MenuGroup>
            <MenuGroupLabel>Edit event</MenuGroupLabel>
            <MenuItem>
              <CalendarClockIcon />
              Reschedule booking
            </MenuItem>
            <MenuItem disabled>
              <CalendarClockIcon />
              Request reschedule
            </MenuItem>
            <MenuItem>
              <MapPinIcon />
              Edit location
            </MenuItem>
            <MenuItem>
              <UserPlusIcon />
              Add guests
            </MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuGroup>
            <MenuGroupLabel>After event</MenuGroupLabel>
            <MenuItem disabled>
              <PlayCircleIcon />
              View recordings
            </MenuItem>
            <MenuItem>
              <InfoIcon />
              View Session Details
            </MenuItem>
            <MenuItem>
              <EyeOffIcon />
              Mark as no-show
            </MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuGroup>
            <MenuItem variant="destructive">
              <FlagIcon />
              Report booking
            </MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuGroup>
            <MenuItem disabled={!isRecurring} variant="destructive">
              <CircleXIcon />
              {isRecurring ? "Cancel all remaining" : "Cancel event"}
            </MenuItem>
          </MenuGroup>
        </MenuPopup>
      </Menu>
    </div>
  );
}

function TooltipIconButton({
  icon,
  label,
  variant = "outline",
}: {
  icon: React.ReactNode;
  label: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button aria-label={label} size="icon" variant={variant}>
            {icon}
          </Button>
        }
      />
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}

export function BookingActionsSkeleton() {
  return <Skeleton className="size-9 rounded-lg sm:size-8" />;
}
