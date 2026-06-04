"use client";

import { Button } from "@coss/ui/components/button";
import {
  Drawer,
  DrawerClose,
  DrawerMenu,
  DrawerMenuCheckboxItem,
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
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
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
  EyeIcon,
  EyeOffIcon,
  FlagIcon,
  InfoIcon,
  MapPinIcon,
  PlayCircleIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";
import type * as React from "react";
import { useMemo } from "react";
import {
  type BookingListingStatus,
  createBookingActionContext,
  getNoShowActionLabel,
  isActionDisabled,
  isRescheduleRequestDisabled,
  shouldShowEditActions,
  shouldShowIndividualReportButton,
  shouldShowNoShowAttendeeMenu,
} from "@/lib/booking-action-rules";
import type { Booking, BookingAttendee } from "@/lib/mock-bookings-data";

type BookingActionsProps = {
  attendees: BookingAttendee[];
  booking: Booking;
  isRecurring?: boolean;
  listingStatus: BookingListingStatus;
  onAttendeesChange: (attendees: BookingAttendee[]) => void;
  showPendingActions?: boolean;
};

export function BookingActions({
  attendees,
  booking,
  isRecurring,
  listingStatus,
  onAttendeesChange,
  showPendingActions,
}: BookingActionsProps) {
  const actionContext = useMemo(
    () =>
      createBookingActionContext({
        attendeeList: attendees,
        booking,
        listingStatus,
      }),
    [attendees, booking, listingStatus],
  );

  const showEditActions = shouldShowEditActions(actionContext);
  const showStandaloneReport = shouldShowIndividualReportButton(actionContext);
  const hasStandaloneActions = showPendingActions;

  const disabled = {
    addGuests: isActionDisabled("add_members", actionContext),
    cancel: isActionDisabled("cancel", actionContext),
    changeLocation: isActionDisabled("change_location", actionContext),
    meetingSessionDetails: isActionDisabled(
      "meeting_session_details",
      actionContext,
    ),
    noShow: isActionDisabled("no_show", actionContext),
    report: isActionDisabled("report", actionContext),
    requestReschedule: isRescheduleRequestDisabled(actionContext),
    reschedule: isActionDisabled("reschedule", actionContext),
    viewRecordings: isActionDisabled("view_recordings", actionContext),
  };

  const toggleAttendeeNoShow = (email: string) => {
    onAttendeesChange(
      attendees.map((attendee) =>
        attendee.email === email
          ? { ...attendee, noShow: !attendee.noShow }
          : attendee,
      ),
    );
  };

  const toggleSingleAttendeeNoShow = () => {
    const attendee = attendees[0];
    if (!attendee) {
      return;
    }

    toggleAttendeeNoShow(attendee.email);
  };

  return (
    <div className="relative z-1 flex items-center gap-2">
      {hasStandaloneActions && (
        <>
          <div className="max-md:hidden xl:hidden">
            <Group>
              <TooltipIconButton
                icon={<XIcon />}
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
      {showStandaloneReport && (
        <div className="max-md:hidden">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="Report booking"
                  disabled={disabled.report}
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
      )}

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
              attendees={attendees}
              disabled={disabled}
              isRecurring={isRecurring}
              noShowLabel={getNoShowActionLabel(attendees)}
              onToggleAttendeeNoShow={toggleAttendeeNoShow}
              onToggleSingleAttendeeNoShow={toggleSingleAttendeeNoShow}
              showEditActions={showEditActions}
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
                  attendees={attendees}
                  disabled={disabled}
                  isRecurring={isRecurring}
                  noShowLabel={getNoShowActionLabel(attendees)}
                  onToggleAttendeeNoShow={toggleAttendeeNoShow}
                  onToggleSingleAttendeeNoShow={toggleSingleAttendeeNoShow}
                  showEditActions={showEditActions}
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

type ActionDisabledState = {
  addGuests: boolean;
  cancel: boolean;
  changeLocation: boolean;
  meetingSessionDetails: boolean;
  noShow: boolean;
  report: boolean;
  requestReschedule: boolean;
  reschedule: boolean;
  viewRecordings: boolean;
};

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

function NoShowMenuItems({
  attendees,
  disabled,
  noShowLabel,
  onToggleAttendeeNoShow,
  onToggleSingleAttendeeNoShow,
}: {
  attendees: BookingAttendee[];
  disabled: boolean;
  noShowLabel: string;
  onToggleAttendeeNoShow: (email: string) => void;
  onToggleSingleAttendeeNoShow: () => void;
}) {
  const singleAttendee = attendees.length === 1;
  const showAttendeeMenu = shouldShowNoShowAttendeeMenu(attendees);
  const NoShowIcon =
    singleAttendee && attendees[0]?.noShow ? EyeIcon : EyeOffIcon;

  if (showAttendeeMenu) {
    return (
      <MenuSub>
        <MenuSubTrigger disabled={disabled}>
          <EyeOffIcon />
          Mark as no-show
        </MenuSubTrigger>
        <MenuSubPopup>
          {attendees.map((attendee) => (
            <MenuCheckboxItem
              checked={attendee.noShow ?? false}
              disabled={disabled}
              key={attendee.email}
              onCheckedChange={() => onToggleAttendeeNoShow(attendee.email)}
            >
              {attendee.name}
            </MenuCheckboxItem>
          ))}
        </MenuSubPopup>
      </MenuSub>
    );
  }

  return (
    <MenuItem disabled={disabled} onClick={onToggleSingleAttendeeNoShow}>
      <NoShowIcon />
      {noShowLabel}
    </MenuItem>
  );
}

function NoShowDrawerItems({
  attendees,
  disabled,
  noShowLabel,
  onToggleAttendeeNoShow,
  onToggleSingleAttendeeNoShow,
}: {
  attendees: BookingAttendee[];
  disabled: boolean;
  noShowLabel: string;
  onToggleAttendeeNoShow: (email: string) => void;
  onToggleSingleAttendeeNoShow: () => void;
}) {
  const singleAttendee = attendees.length === 1;
  const showAttendeeMenu = shouldShowNoShowAttendeeMenu(attendees);
  const NoShowIcon =
    singleAttendee && attendees[0]?.noShow ? EyeIcon : EyeOffIcon;

  if (showAttendeeMenu) {
    return (
      <>
        <DrawerMenuGroupLabel>Mark as no-show</DrawerMenuGroupLabel>
        {attendees.map((attendee) => (
          <DrawerMenuCheckboxItem
            checked={attendee.noShow ?? false}
            disabled={disabled}
            key={attendee.email}
            onCheckedChange={() => onToggleAttendeeNoShow(attendee.email)}
          >
            {attendee.name}
          </DrawerMenuCheckboxItem>
        ))}
      </>
    );
  }

  return (
    <DrawerClose
      render={
        <DrawerMenuItem
          disabled={disabled}
          onClick={onToggleSingleAttendeeNoShow}
        />
      }
    >
      <NoShowIcon aria-hidden />
      {noShowLabel}
    </DrawerClose>
  );
}

function BookingOptionsMenuContent({
  attendees,
  disabled,
  isRecurring,
  noShowLabel,
  onToggleAttendeeNoShow,
  onToggleSingleAttendeeNoShow,
  showEditActions,
}: {
  attendees: BookingAttendee[];
  disabled: ActionDisabledState;
  isRecurring?: boolean;
  noShowLabel: string;
  onToggleAttendeeNoShow: (email: string) => void;
  onToggleSingleAttendeeNoShow: () => void;
  showEditActions: boolean;
}) {
  const showCancelAllRemaining = isRecurring;
  const showCancelEvent = showEditActions && !isRecurring;
  const showCancel = showCancelAllRemaining || showCancelEvent;

  return (
    <>
      {showEditActions && (
        <>
          <MenuGroup>
            <MenuGroupLabel>Edit event</MenuGroupLabel>
            <MenuItem disabled={disabled.reschedule}>
              <CalendarClockIcon />
              Reschedule booking
            </MenuItem>
            <MenuItem disabled={disabled.requestReschedule}>
              <CalendarClockIcon />
              Request reschedule
            </MenuItem>
            <MenuItem disabled={disabled.changeLocation}>
              <MapPinIcon />
              Edit location
            </MenuItem>
            <MenuItem disabled={disabled.addGuests}>
              <UserPlusIcon />
              Add guests
            </MenuItem>
          </MenuGroup>
          <MenuSeparator />
        </>
      )}
      <MenuGroup>
        <MenuGroupLabel>After event</MenuGroupLabel>
        <MenuItem disabled={disabled.viewRecordings}>
          <PlayCircleIcon />
          View recordings
        </MenuItem>
        <MenuItem disabled={disabled.meetingSessionDetails}>
          <InfoIcon />
          View Session Details
        </MenuItem>
        <NoShowMenuItems
          attendees={attendees}
          disabled={disabled.noShow}
          noShowLabel={noShowLabel}
          onToggleAttendeeNoShow={onToggleAttendeeNoShow}
          onToggleSingleAttendeeNoShow={onToggleSingleAttendeeNoShow}
        />
      </MenuGroup>
      <MenuSeparator />
      <MenuGroup>
        <MenuItem disabled={disabled.report} variant="destructive">
          <FlagIcon />
          Report booking
        </MenuItem>
      </MenuGroup>
      {showCancel && (
        <>
          <MenuSeparator />
          <MenuGroup>
            <MenuItem disabled={disabled.cancel} variant="destructive">
              <CircleXIcon />
              {showCancelAllRemaining ? "Cancel all remaining" : "Cancel event"}
            </MenuItem>
          </MenuGroup>
        </>
      )}
    </>
  );
}

function BookingOptionsDrawerContent({
  attendees,
  disabled,
  isRecurring,
  noShowLabel,
  onToggleAttendeeNoShow,
  onToggleSingleAttendeeNoShow,
  showEditActions,
  showPendingActions,
}: {
  attendees: BookingAttendee[];
  disabled: ActionDisabledState;
  isRecurring?: boolean;
  noShowLabel: string;
  onToggleAttendeeNoShow: (email: string) => void;
  onToggleSingleAttendeeNoShow: () => void;
  showEditActions: boolean;
  showPendingActions?: boolean;
}) {
  const showReject = showPendingActions;
  const showConfirm = showPendingActions;
  const showCancelAllRemaining = showEditActions && isRecurring;
  const showCancelEvent = showEditActions && !isRecurring;
  const hasBottomGroup =
    showReject || showConfirm || showCancelAllRemaining || showCancelEvent;

  return (
    <>
      {showEditActions && (
        <>
          <DrawerMenuGroup>
            <DrawerMenuGroupLabel>Edit event</DrawerMenuGroupLabel>
            <DrawerClose
              render={<DrawerMenuItem disabled={disabled.reschedule} />}
            >
              <CalendarClockIcon aria-hidden />
              Reschedule booking
            </DrawerClose>
            <DrawerMenuItem disabled={disabled.requestReschedule}>
              <CalendarClockIcon aria-hidden />
              Request reschedule
            </DrawerMenuItem>
            <DrawerClose
              render={<DrawerMenuItem disabled={disabled.changeLocation} />}
            >
              <MapPinIcon aria-hidden />
              Edit location
            </DrawerClose>
            <DrawerClose
              render={<DrawerMenuItem disabled={disabled.addGuests} />}
            >
              <UserPlusIcon aria-hidden />
              Add guests
            </DrawerClose>
          </DrawerMenuGroup>
          <DrawerMenuSeparator />
        </>
      )}
      <DrawerMenuGroup>
        <DrawerMenuGroupLabel>After event</DrawerMenuGroupLabel>
        <DrawerMenuItem disabled={disabled.viewRecordings}>
          <PlayCircleIcon aria-hidden />
          View recordings
        </DrawerMenuItem>
        <DrawerClose
          render={<DrawerMenuItem disabled={disabled.meetingSessionDetails} />}
        >
          <InfoIcon aria-hidden />
          View Session Details
        </DrawerClose>
        <NoShowDrawerItems
          attendees={attendees}
          disabled={disabled.noShow}
          noShowLabel={noShowLabel}
          onToggleAttendeeNoShow={onToggleAttendeeNoShow}
          onToggleSingleAttendeeNoShow={onToggleSingleAttendeeNoShow}
        />
      </DrawerMenuGroup>
      <DrawerMenuSeparator />
      <DrawerClose
        render={
          <DrawerMenuItem disabled={disabled.report} variant="destructive" />
        }
      >
        <FlagIcon aria-hidden />
        Report booking
      </DrawerClose>
      {hasBottomGroup && (
        <>
          <DrawerMenuSeparator />
          <DrawerMenuGroup>
            {showReject && (
              <DrawerClose render={<DrawerMenuItem />}>
                <XIcon aria-hidden />
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
              <DrawerClose
                render={
                  <DrawerMenuItem
                    disabled={disabled.cancel}
                    variant="destructive"
                  />
                }
              >
                <CircleXIcon aria-hidden />
                Cancel all remaining
              </DrawerClose>
            )}
            {showCancelEvent && (
              <DrawerClose
                render={
                  <DrawerMenuItem
                    disabled={disabled.cancel}
                    variant="destructive"
                  />
                }
              >
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
