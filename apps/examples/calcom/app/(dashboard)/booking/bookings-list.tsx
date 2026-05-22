"use client";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@coss/ui/components/pagination";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@coss/ui/components/popover";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { cn } from "@coss/ui/lib/utils";
import {
  BanknoteIcon,
  CircleDashedIcon,
  CircleXIcon,
  EyeOffIcon,
  RefreshCcwIcon,
  RepeatIcon,
  UsersIcon,
  VideoIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BookingActions } from "./booking-actions";
import { BookingsListSkeleton } from "./booking-skeleton";
import { ItemLabel } from "@/components/item-label";
import {
  ListItem,
  ListItemActions,
  ListItemBadges,
  ListItemContent,
  ListItemDescription,
  ListItemHeader,
  ListItemSpanningTrigger,
  ListItemTitle,
} from "@/components/list-item";
import { useLoadingState } from "@/hooks/use-loading-state";
import type { Booking } from "@/lib/mock-bookings-data";
import {
  formatBookingDate,
  formatBookingTime,
  getBookingParticipants,
  getLocationLabel,
  isBookingToday,
} from "@/lib/mock-bookings-data";

const ARTIFICIAL_DELAY_MS = 800;

type BookingListingStatus =
  | "upcoming"
  | "past"
  | "cancelled"
  | "unconfirmed"
  | "recurring";

type BookingsListProps = {
  bookings: Booking[];
  listingStatus: BookingListingStatus;
};

export function BookingsList({ bookings, listingStatus }: BookingsListProps) {
  const showLoading = useLoadingState(ARTIFICIAL_DELAY_MS);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const isUpcoming = listingStatus === "upcoming";

  const { todayBookings, nextBookings } = useMemo(() => {
    if (!isUpcoming) {
      return { todayBookings: [], nextBookings: bookings };
    }

    const today: Booking[] = [];
    const next: Booking[] = [];

    for (const booking of bookings) {
      if (isBookingToday(booking.startTime)) {
        today.push(booking);
      } else {
        next.push(booking);
      }
    }

    return { todayBookings: today, nextBookings: next };
  }, [bookings, isUpcoming]);

  const paginatedSource = isUpcoming ? nextBookings : bookings;
  const totalCount = paginatedSource.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = pageIndex * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  const paginatedBookings = paginatedSource.slice(startIndex, endIndex);

  const hasPreviousPage = pageIndex > 0;
  const hasNextPage = pageIndex < totalPages - 1;

  if (showLoading) {
    return <BookingsListSkeleton />;
  }

  const renderBooking = (booking: Booking) => (
    <BookingListItem
      booking={booking}
      key={booking.id}
      listingStatus={listingStatus}
    />
  );

  return (
    <TooltipProvider delay={0} timeout={0}>
      <CardFrame className="**:[[data-slot=card]:has(+[data-slot=card-frame-header])]:rounded-b-none **:[[data-slot=card]:has(+[data-slot=card-frame-header])_[data-slot=list-item]]:rounded-b-none **:[[data-slot=card-frame-header]+[data-slot=card]]:rounded-t-none **:[[data-slot=card-frame-header]+[data-slot=card]_[data-slot=list-item]]:rounded-t-none">
        {isUpcoming && todayBookings.length > 0 && (
          <>
            <CardFrameHeader className="py-3">
              <CardFrameTitle>Today</CardFrameTitle>
            </CardFrameHeader>
            <Card>
              <CardPanel className="p-0">
                {todayBookings.map(renderBooking)}
              </CardPanel>
            </Card>
          </>
        )}

        {isUpcoming && nextBookings.length > 0 ? (
          <>
            <CardFrameHeader className="py-3">
              <CardFrameTitle>Next</CardFrameTitle>
            </CardFrameHeader>
            <Card>
              <CardPanel className="p-0">
                {paginatedBookings.map(renderBooking)}
              </CardPanel>
            </Card>
          </>
        ) : (
          !isUpcoming && (
            <Card>
              <CardPanel className="p-0">
                {paginatedBookings.map(renderBooking)}
              </CardPanel>
            </Card>
          )
        )}

        {(totalCount > 0 || !isUpcoming) && (
          <CardFrameFooter>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Select
                  onValueChange={(value) => {
                    if (value !== null) {
                      setPageSize(value);
                      setPageIndex(0);
                    }
                  }}
                  value={pageSize}
                >
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

              <div className="flex items-center gap-2">
                <p className="whitespace-nowrap text-muted-foreground text-sm">
                  {totalCount === 0
                    ? "0 of 0"
                    : `${startIndex + 1}-${endIndex} of ${totalCount}`}
                </p>
                <Pagination>
                  <PaginationContent className="gap-2">
                    <PaginationItem>
                      <PaginationPrevious
                        render={
                          <Button
                            disabled={!hasPreviousPage}
                            onClick={() => setPageIndex(pageIndex - 1)}
                            size="sm"
                            variant="outline"
                          />
                        }
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        render={
                          <Button
                            disabled={!hasNextPage}
                            onClick={() => setPageIndex(pageIndex + 1)}
                            size="sm"
                            variant="outline"
                          />
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          </CardFrameFooter>
        )}
      </CardFrame>
    </TooltipProvider>
  );
}

function BookingListItem({
  booking,
  listingStatus,
}: {
  booking: Booking;
  listingStatus: BookingListingStatus;
}) {
  const dateStr = formatBookingDate(booking.startTime);
  const timeStr = formatBookingTime(booking.startTime, booking.endTime);
  const participants = getBookingParticipants(booking);
  const locationLabel = getLocationLabel(booking.location);
  const eventTypeColorLight =
    booking.eventType?.eventTypeColor?.lightEventTypeColor;
  const eventTypeColorDark =
    booking.eventType?.eventTypeColor?.darkEventTypeColor;
  const isCancelled = booking.status === "CANCELLED";
  const isPending = booking.status === "PENDING";
  const isRejected = booking.status === "REJECTED";
  const isTabRecurring = listingStatus === "recurring";
  const isRescheduled = booking.fromReschedule !== null || booking.rescheduled;
  const isRecurring = isTabRecurring || booking.recurringEventId !== null;
  const recurringEventsRemaining = getBookingMetadataNumber(
    booking,
    "recurringEventsRemaining",
  );
  const recurringPattern = getBookingMetadataString(
    booking,
    "recurringPattern",
  );
  const hasNoShowAttendee = booking.attendees.some(
    (attendee) => attendee.noShow,
  );
  const teamName = booking.eventType?.team?.name;
  const showPendingPayment =
    (booking.eventType?.price ?? 0) > 0 &&
    !booking.payment.some((payment) => payment.success);
  const showJoinLink =
    listingStatus === "upcoming" &&
    !isPending &&
    !isCancelled &&
    !isRejected &&
    locationLabel;

  return (
    <ListItem>
      <ItemLabel
        colorDark={eventTypeColorDark ?? undefined}
        colorLight={eventTypeColorLight ?? undefined}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:gap-4">
        <ListItemContent>
          <ListItemHeader>
            <ListItemTitle className={cn(isCancelled && "line-through")}>
              <ListItemSpanningTrigger render={<Link href="#" />}>
                {booking.title}
              </ListItemSpanningTrigger>
              {showPendingPayment && (
                <Badge
                  className="pointer-events-none ml-2 hidden align-middle sm:inline-flex"
                  variant="warning"
                >
                  <BanknoteIcon />
                  Pending payment
                </Badge>
              )}
            </ListItemTitle>
            {participants && (
              <ListItemDescription>{participants}</ListItemDescription>
            )}
            {booking.description && (
              <ListItemDescription className="line-clamp-2">
                {booking.description}
              </ListItemDescription>
            )}
          </ListItemHeader>

          <ListItemBadges>
            {isPending && (
              <Badge className="pointer-events-none" variant="warning">
                <CircleDashedIcon />
                Unconfirmed
              </Badge>
            )}
            {teamName && (
              <Badge className="pointer-events-none" variant="outline">
                <UsersIcon />
                {teamName}
              </Badge>
            )}
            {showPendingPayment && (
              <Badge className="pointer-events-none" variant="warning">
                <BanknoteIcon />
                Pending payment
              </Badge>
            )}
            {isRescheduled && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Badge variant="warning">
                      <RefreshCcwIcon />
                      Rescheduled
                    </Badge>
                  }
                />
                <TooltipPopup>
                  {booking.rescheduledBy
                    ? `Rescheduled by ${booking.rescheduledBy}`
                    : "This booking was rescheduled"}
                </TooltipPopup>
              </Tooltip>
            )}
            {isRecurring && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Badge variant="outline">
                      <RepeatIcon />
                      Recurring
                    </Badge>
                  }
                />
                <TooltipPopup>{getRecurringSummary(booking)}</TooltipPopup>
              </Tooltip>
            )}
            {isTabRecurring && recurringPattern && (
              <Badge className="pointer-events-none" variant="outline">
                <RepeatIcon />
                {recurringPattern}
              </Badge>
            )}
            {isCancelled && (
              <Badge className="pointer-events-none" variant="error">
                <CircleXIcon />
                Cancelled
              </Badge>
            )}
            {isRejected && !isRescheduled && (
              <Badge className="pointer-events-none" variant="secondary">
                Rejected
              </Badge>
            )}
            {hasNoShowAttendee && (
              <Badge className="pointer-events-none" variant="secondary">
                <EyeOffIcon />
                No-show
              </Badge>
            )}
          </ListItemBadges>
        </ListItemContent>

        <div className="flex flex-col items-start gap-2 md:-order-1 md:w-36 md:shrink-0">
          <div className="flex flex-col gap-1">
            <p className="font-medium text-sm">{dateStr}</p>
            <p className="text-muted-foreground text-sm">{timeStr}</p>
          </div>
          {isTabRecurring && typeof recurringEventsRemaining === "number" && (
            <RecurringDatesPopover count={recurringEventsRemaining} />
          )}
          {showJoinLink && (
            <Button
              className="pointer-events-auto max-w-full min-w-0 whitespace-normal"
              render={<Link href="#join" />}
              size="xs"
              title={locationLabel}
              variant="outline"
            >
              <VideoIcon />
              <span className="truncate">{locationLabel}</span>
            </Button>
          )}
        </div>
      </div>

      <ListItemActions>
        <BookingActions
          isRecurring={isTabRecurring}
          showPendingActions={isPending}
        />
      </ListItemActions>
    </ListItem>
  );
}

function RecurringDatesPopover({ count }: { count: number }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            className="relative flex items-center gap-1 text-muted-foreground text-xs hover:underline decoration-current/32 decoration-dotted underline-offset-2 hover:text-foreground cursor-pointer"
            onClick={(event) => event.stopPropagation()}
            type="button"
          />
        }
      >
        <RepeatIcon className="size-3 opacity-80" aria-hidden="true" />
        {count} {count === 1 ? "event" : "events"} remaining
      </PopoverTrigger>
      <PopoverPopup side="top" tooltipStyle>
        <div className="tabular-nums">
          {recurringDatesPreview.map((date) => (
            <div
              className={cn(date.completed && "line-through")}
              key={date.label}
            >
              {date.label}
            </div>
          ))}
        </div>
      </PopoverPopup>
    </Popover>
  );
}

const recurringDatesPreview = [
  { completed: true, label: "5:01pm - 8 May 2026" },
  { completed: true, label: "5:01pm - 15 May 2026" },
  { completed: false, label: "5:01pm - 22 May 2026" },
  { completed: false, label: "5:01pm - 29 May 2026" },
  { completed: false, label: "5:01pm - 5 June 2026" },
  { completed: false, label: "5:01pm - 12 June 2026" },
];

function getRecurringSummary(booking: Booking): string {
  const count = booking.eventType?.recurringEvent?.count;
  const interval = booking.eventType?.recurringEvent?.interval;

  if (count && interval) {
    return `Repeats every ${interval === 1 ? "week" : `${interval} weeks`} for ${count} occurrences`;
  }

  return "Part of a recurring booking series";
}

function getBookingMetadataNumber(booking: Booking, key: string) {
  const value = booking.metadata?.[key];
  return typeof value === "number" ? value : null;
}

function getBookingMetadataString(booking: Booking, key: string) {
  const value = booking.metadata?.[key];
  return typeof value === "string" ? value : "";
}
