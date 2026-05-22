"use client";

import { Button } from "@coss/ui/components/button";
import {
  Drawer,
  DrawerClose,
  DrawerMenu,
  DrawerMenuGroup,
  DrawerMenuGroupLabel,
  DrawerMenuItem,
  DrawerMenuSeparator,
  DrawerPanel,
  DrawerPopup,
  DrawerTrigger,
} from "@coss/ui/components/drawer";
import { Group, GroupSeparator } from "@coss/ui/components/group";
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
  const hasStandaloneActions = showPendingActions;

  return (
    <div className="relative z-1 flex items-center gap-2">
      {hasStandaloneActions && (
        <>
          <div className="max-md:hidden xl:hidden">
            <Group>
              <TooltipIconButton
                icon={<ThumbsDownIcon />}
                label={isRecurring ? "Reject all" : "Reject"}
                variant="outline"
              />
              <GroupSeparator />
              <TooltipIconButton
                icon={<CheckIcon />}
                label={isRecurring ? "Confirm all" : "Confirm"}
              />
            </Group>
          </div>
          <div className="hidden items-center gap-2 xl:flex">
            <Button size="xs" variant="outline">
              {isRecurring ? "Reject all" : "Reject"}
            </Button>
            <Button size="xs">{isRecurring ? "Confirm all" : "Confirm"}</Button>
          </div>
        </>
      )}
      <div className="max-md:hidden">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="Report booking"
                size="icon"
                variant="destructive-outline"
              >
                <FlagIcon />
              </Button>
            }
          />
          <TooltipPopup>Report booking</TooltipPopup>
        </Tooltip>
      </div>

      <div className="max-md:hidden">
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
            <BookingOptionsMenuContent
              isRecurring={isRecurring}
              showPendingActions={showPendingActions}
            />
          </MenuPopup>
        </Menu>
      </div>

      <div className="md:hidden">
        <Drawer>
          <DrawerTrigger
            render={
              <Button aria-label="Options" size="icon" variant="outline" />
            }
          >
            <EllipsisIcon aria-hidden />
          </DrawerTrigger>
          <DrawerPopup showBar>
            <DrawerPanel>
              <DrawerMenu>
                <BookingOptionsDrawerContent
                  isRecurring={isRecurring}
                  showPendingActions={showPendingActions}
                />
              </DrawerMenu>
            </DrawerPanel>
          </DrawerPopup>
        </Drawer>
      </div>
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

function BookingOptionsMenuContent({
  isRecurring,
  showPendingActions,
}: {
  isRecurring?: boolean;
  showPendingActions?: boolean;
}) {
  return (
    <>
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
    </>
  );
}

function BookingOptionsDrawerContent({
  isRecurring,
  showPendingActions,
}: {
  isRecurring?: boolean;
  showPendingActions?: boolean;
}) {
  const showReject = showPendingActions;
  const showConfirm = showPendingActions;
  const showCancelAllRemaining = isRecurring;
  const showCancelEvent = !isRecurring;
  const hasBottomGroup =
    showReject || showConfirm || showCancelAllRemaining || showCancelEvent;

  return (
    <>
      <DrawerMenuGroup>
        <DrawerMenuGroupLabel>Edit event</DrawerMenuGroupLabel>
        <DrawerClose render={<DrawerMenuItem />}>
          <CalendarClockIcon aria-hidden />
          Reschedule booking
        </DrawerClose>
        <DrawerMenuItem disabled>
          <CalendarClockIcon aria-hidden />
          Request reschedule
        </DrawerMenuItem>
        <DrawerClose render={<DrawerMenuItem />}>
          <MapPinIcon aria-hidden />
          Edit location
        </DrawerClose>
        <DrawerClose render={<DrawerMenuItem />}>
          <UserPlusIcon aria-hidden />
          Add guests
        </DrawerClose>
      </DrawerMenuGroup>
      <DrawerMenuSeparator />
      <DrawerMenuGroup>
        <DrawerMenuGroupLabel>After event</DrawerMenuGroupLabel>
        <DrawerMenuItem disabled>
          <PlayCircleIcon aria-hidden />
          View recordings
        </DrawerMenuItem>
        <DrawerClose render={<DrawerMenuItem />}>
          <InfoIcon aria-hidden />
          View Session Details
        </DrawerClose>
        <DrawerClose render={<DrawerMenuItem />}>
          <EyeOffIcon aria-hidden />
          Mark as no-show
        </DrawerClose>
      </DrawerMenuGroup>
      <DrawerMenuSeparator />
      <DrawerClose render={<DrawerMenuItem variant="destructive" />}>
        <FlagIcon aria-hidden />
        Report booking
      </DrawerClose>
      {hasBottomGroup && (
        <>
          <DrawerMenuSeparator />
          <DrawerMenuGroup>
            {showReject && (
              <DrawerClose render={<DrawerMenuItem />}>
                <ThumbsDownIcon aria-hidden />
                {isRecurring ? "Reject all" : "Reject"}
              </DrawerClose>
            )}
            {showConfirm && (
              <DrawerClose render={<DrawerMenuItem />}>
                <CheckIcon aria-hidden />
                {isRecurring ? "Confirm all" : "Confirm"}
              </DrawerClose>
            )}
            {showCancelAllRemaining && (
              <DrawerClose render={<DrawerMenuItem variant="destructive" />}>
                <CircleXIcon aria-hidden />
                Cancel all remaining
              </DrawerClose>
            )}
            {showCancelEvent && (
              <DrawerClose render={<DrawerMenuItem variant="destructive" />}>
                <CircleXIcon aria-hidden />
                Cancel event
              </DrawerClose>
            )}
          </DrawerMenuGroup>
        </>
      )}
    </>
  );
}

export function BookingActionsSkeleton() {
  return <Skeleton className="size-9 rounded-lg sm:size-8" />;
}
