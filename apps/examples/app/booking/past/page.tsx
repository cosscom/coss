"use client";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Frame, FrameFooter, FramePanel } from "@coss/ui/components/frame";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@coss/ui/components/pagination";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { Separator } from "@coss/ui/components/separator";
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import {
  CalendarClockIcon,
  CalendarIcon,
  DollarSignIcon,
  EllipsisIcon,
  EyeOffIcon,
  FilterIcon,
  FlagIcon,
  InfoIcon,
  MapPinIcon,
  PlayCircleIcon,
  RepeatIcon,
  ShuffleIcon,
  UserPlusIcon,
  UsersIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { Fragment } from "react";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app-header";
import {
  formatBookingDate,
  formatBookingTime,
  getBookingParticipants,
  getLocationLabel,
  mockPastBookings,
} from "@/lib/mock-bookings-data";

export default function Page() {
  return (
    <TooltipProvider delay={150} timeout={0}>
      <AppHeader>
        <AppHeaderContent title="Past Bookings">
          <AppHeaderDescription>
            View your past completed bookings.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        <Button variant="outline">
          <FilterIcon />
          Filter
        </Button>
        <Button variant="outline">
          <CalendarIcon />
          Saved
        </Button>
      </div>

      {/* Bookings List */}
      <Frame className="-m-1">
        <FramePanel className="p-0">
          {mockPastBookings.map((booking, index) => {
            const isLast = index === mockPastBookings.length - 1;
            const dateStr = formatBookingDate(booking.startTime);
            const timeStr = formatBookingTime(
              booking.startTime,
              booking.endTime,
            );
            const participants = getBookingParticipants(booking);
            const locationLabel = getLocationLabel(booking.location);
            const eventTypeColor =
              booking.eventType?.eventTypeColor?.lightEventTypeColor;
            const isTeamEvent = booking.eventType?.teamId !== null;
            const schedulingType = booking.eventType?.schedulingType;
            const isPaid = booking.paid;
            const isRecurring = booking.recurringEventId !== null;
            const isCancelled = booking.status === "CANCELLED";
            const isPending = booking.status === "PENDING";
            const hasNoShow = booking.attendees.some((a) => a.noShow === true);
            const isRecorded = booking.isRecorded;

            return (
              <Fragment key={booking.id}>
                <div className="relative flex transition-colors first:rounded-t-[calc(var(--radius-xl)-1px)] last:rounded-b-[calc(var(--radius-xl)-1px)] has-[a:hover]:bg-[color-mix(in_srgb,var(--color-background),var(--color-black)_2%)] dark:has-[a:hover]:bg-[color-mix(in_srgb,var(--color-background),var(--color-white)_2%)]">
                  {eventTypeColor && (
                    <div
                      className="absolute inset-y-0 start-0 w-0.5 bg-current"
                      style={{ color: eventTypeColor }}
                    />
                  )}
                  <div className="flex flex-1 items-center justify-between gap-4 p-5">
                    <div className="flex min-w-0 flex-1 gap-4">
                      {/* Date/Time Column */}
                      <div className="flex w-32 shrink-0 flex-col items-start gap-1 max-md:hidden">
                        <p className="font-medium text-sm">{dateStr}</p>
                        <p className="text-muted-foreground text-xs">
                          {timeStr}
                        </p>
                        {locationLabel && (
                          <a className="mt-1 inline-flex items-center gap-1 text-xs hover:underline">
                            <VideoIcon className="size-3" />
                            {locationLabel}
                          </a>
                        )}
                      </div>

                      {/* Content Column */}
                      <div className="flex min-w-0 flex-1 flex-col gap-3">
                        {/* Title and Description wrapper */}
                        <div className="flex flex-col gap-1">
                          {/* Title with status badges inline */}
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-medium text-sm">
                              <a
                                className="before:absolute before:inset-0"
                                href="#"
                              >
                                {booking.title}
                              </a>
                            </h2>
                            {isCancelled && (
                              <Badge
                                className="pointer-events-none"
                                variant="destructive"
                              >
                                Cancelled
                              </Badge>
                            )}
                            {isPending && (
                              <Badge
                                className="pointer-events-none"
                                variant="warning"
                              >
                                Pending
                              </Badge>
                            )}
                            {booking.rescheduled && (
                              <Badge
                                className="pointer-events-none"
                                variant="warning"
                              >
                                Rescheduled
                              </Badge>
                            )}
                            {hasNoShow && (
                              <Badge
                                className="pointer-events-none"
                                variant="destructive"
                              >
                                No-show
                              </Badge>
                            )}
                            {isRecorded && (
                              <Badge
                                className="pointer-events-none"
                                variant="secondary"
                              >
                                <PlayCircleIcon className="opacity-72" />
                                Recorded
                              </Badge>
                            )}
                          </div>
                          {/* Participants (description) */}
                          <p className="text-muted-foreground text-sm">
                            {participants}
                          </p>
                        </div>

                        {/* Badges row - under description */}
                        <div className="flex flex-wrap items-center gap-2 overflow-hidden">
                          {isTeamEvent && schedulingType === "ROUND_ROBIN" && (
                            <Badge
                              className="pointer-events-none"
                              variant="outline"
                            >
                              <ShuffleIcon className="opacity-72" />
                              Round Robin
                            </Badge>
                          )}
                          {isTeamEvent && schedulingType === "COLLECTIVE" && (
                            <Badge
                              className="pointer-events-none"
                              variant="outline"
                            >
                              <UsersIcon className="opacity-72" />
                              Collective
                            </Badge>
                          )}
                          {isTeamEvent && !schedulingType && (
                            <Badge
                              className="pointer-events-none"
                              variant="outline"
                            >
                              <UsersIcon className="opacity-72" />
                              Team
                            </Badge>
                          )}
                          {isRecurring && (
                            <Badge
                              className="pointer-events-none"
                              variant="outline"
                            >
                              <RepeatIcon className="opacity-72" />
                              Recurring
                            </Badge>
                          )}
                          {isPaid && (
                            <Badge
                              className="pointer-events-none"
                              variant="outline"
                            >
                              <DollarSignIcon className="opacity-72" />
                              Paid
                            </Badge>
                          )}
                        </div>

                        {/* Mobile: Date/Time */}
                        <div className="mt-2 flex flex-col gap-0.5 md:hidden">
                          <p className="font-medium text-xs">{dateStr}</p>
                          <p className="text-muted-foreground text-xs">
                            {timeStr}
                          </p>
                          {locationLabel && (
                            <a
                              className="mt-1 inline-flex items-center gap-1 text-xs hover:underline"
                              href="#"
                            >
                              <VideoIcon className="size-3" />
                              {locationLabel}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="relative flex items-center">
                      <Menu>
                        <MenuTrigger
                          render={
                            <Tooltip>
                              <TooltipTrigger
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
                              <TooltipPopup>More options</TooltipPopup>
                            </Tooltip>
                          }
                        />
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
                            <MenuItem disabled variant="destructive">
                              <XIcon />
                              Cancel event
                            </MenuItem>
                          </MenuGroup>
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

        {/* Pagination Footer */}
        <FrameFooter>
          <div className="flex items-center justify-between gap-4">
            {/* Rows per page */}
            <div className="flex items-center gap-2">
              <Select value={10}>
                <SelectTrigger
                  aria-label="Rows per page"
                  className="w-fit min-w-none"
                  size="sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value={10}>10</SelectItem>
                  <SelectItem value={20}>20</SelectItem>
                  <SelectItem value={50}>50</SelectItem>
                </SelectPopup>
              </Select>
              <p className="text-muted-foreground text-sm">rows per page</p>
            </div>

            {/* Page info and navigation */}
            <div className="flex items-center gap-4">
              <p className="whitespace-nowrap text-muted-foreground text-sm">
                1-10 of 16
              </p>
              <Pagination>
                <PaginationContent className="gap-2">
                  <PaginationItem>
                    <PaginationPrevious
                      render={<Button disabled size="sm" variant="outline" />}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      render={<Button size="sm" variant="outline" />}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </FrameFooter>
      </Frame>
    </TooltipProvider>
  );
}
