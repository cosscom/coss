"use client";

import { Clock3Icon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/registry/default/ui/avatar";
import { Card } from "@/registry/default/ui/card";
import { BookerCalendar } from "./booker/booker-calendar";
import bookerHeaderPlaceholder from "./booker/booker-header-placeholder.webp";
import { Location } from "./booker/location";
import { TimePicker } from "./booker/time-picker";
import { TimezonePicker } from "./booker/timezone-picker";
import { GENERIC_LOAD_ERROR, useBooker } from "@/lib/booker/use-booker";
import { getInitials } from "@/lib/booker/utils";

type BookerLabels = {
  loading: string;
  loadError: string;
  durationUnknown: string;
  durationMinutes: (minutes: number) => string;
  noAvailableTimes: string;
  noSlotsThisDay: string;
  noSlotsThisMonth: string;
  viewFirstAvailability: string;
  use24Hour: string;
  hour12Short: string;
  hour24Short: string;
  headerImageAlt: (hostName: string, eventTitle: string) => string;
};

const DEFAULT_BOOKER_LABELS: BookerLabels = {
  loading: "Loading booker data...",
  loadError: "Failed to load booker data.",
  durationUnknown: "Unknown",
  durationMinutes: (minutes) => `${minutes} min`,
  noAvailableTimes: "No available times",
  noSlotsThisDay: "There are no open slots on this day.",
  noSlotsThisMonth: "There are no open slots this month.",
  viewFirstAvailability: "View first availability",
  use24Hour: "Use 24-hour time",
  hour12Short: "12h",
  hour24Short: "24h",
  headerImageAlt: (hostName, eventTitle) =>
    `Banner for ${eventTitle} with ${hostName}`,
};

type BookerProps = {
  username: string;
  eventSlug: string;
  labels?: Partial<BookerLabels>;
};

export function Booker({ username, eventSlug, labels }: BookerProps) {
  const t = { ...DEFAULT_BOOKER_LABELS, ...labels };
  const {
    meta,
    error,
    isPending,
    locale,
    selectedTimeZone,
    setSelectedTimeZone,
    currentMonth,
    startMonth,
    selectedDate,
    selectedInCurrentMonth,
    daySlots,
    nextAvailableDate,
    is24Hour,
    setIs24Hour,
    setSelectedTime,
    handleMonthChange,
    handleSelectDate,
    isDayDisabled,
    goToDate,
  } = useBooker({ username, eventSlug });

  if (error) {
    return <p>{error === GENERIC_LOAD_ERROR ? t.loadError : error}</p>;
  }

  if (!meta) {
    return <p>{t.loading}</p>;
  }

  const headerImageClassName =
    "size-full rounded-t-[calc(var(--radius-xl)-2px)] @3xl:rounded-se-none object-cover opacity-64";
  const headerImageAlt = t.headerImageAlt(meta.hostName, meta.eventTypeTitle);

  return (
    <div className="@container mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4">
      <Card className="w-full @3xl:flex-row @3xl:divide-x divide-y @3xl:divide-y-0">
        {/* Meta */}
        <div className="@3xl:w-56 @5xl:w-70">
          <div className="rounded-ss-xl px-1 pt-1">
            <div className="relative @3xl:aspect-16/7 aspect-3/1 overflow-hidden">
              {meta.eventTypeImageUrl ? (
                <img
                  alt={headerImageAlt}
                  className={headerImageClassName}
                  src={meta.eventTypeImageUrl}
                />
              ) : (
                <Image
                  alt={headerImageAlt}
                  className={headerImageClassName}
                  fill
                  sizes="(min-width: 48rem) 280px, 100vw"
                  src={bookerHeaderPlaceholder}
                />
              )}
            </div>
          </div>
          <div className="relative -mt-11 @5xl:-mt-13 flex flex-col gap-6 @5xl:p-6 p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Avatar className="@3xl:@max-5xl:size-12 size-14 outline-2 outline-background">
                  {meta.hostAvatarUrl ? (
                    <AvatarImage src={meta.hostAvatarUrl} />
                  ) : null}
                  <AvatarFallback>{getInitials(meta.hostName)}</AvatarFallback>
                </Avatar>
                <p className="font-medium text-muted-foreground sm:text-sm">
                  {meta.hostName}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="font-heading @3xl:@max-5xl:text-lg text-xl">
                  {meta.eventTypeTitle}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {meta.eventTypeDescription}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:text-sm">
                <div className="flex items-center gap-2">
                  <Clock3Icon
                    className="size-4.5 shrink-0 opacity-80 sm:size-4"
                    aria-hidden="true"
                  />
                  <span>
                    {meta.eventTypeDurationMinutes
                      ? t.durationMinutes(meta.eventTypeDurationMinutes)
                      : t.durationUnknown}
                  </span>
                </div>
                <Location
                  location={meta.eventTypeLocation}
                  provider={meta.eventTypeLocationProvider}
                />
                <TimezonePicker
                  onValueChange={setSelectedTimeZone}
                  value={selectedTimeZone}
                />
              </div>
            </div>
          </div>
        </div>
        {/* Calendar */}
        <div className="flex flex-1 flex-col items-center @3xl:@max-5xl:px-2 px-4 @3xl:@max-5xl:py-2 pt-3 pb-4">
          <BookerCalendar
            loading={isPending}
            locale={locale}
            month={currentMonth}
            startMonth={startMonth}
            endMonth={meta.bookingWindowEnd ?? undefined}
            onMonthChange={handleMonthChange}
            selected={selectedDate}
            onSelect={handleSelectDate}
            disabled={isDayDisabled}
          />
        </div>
        {/* Time picker */}
        <TimePicker
          daySlots={daySlots}
          goToDate={goToDate}
          is24Hour={is24Hour}
          isPending={isPending}
          labels={{
            hour12Short: t.hour12Short,
            hour24Short: t.hour24Short,
            noAvailableTimes: t.noAvailableTimes,
            noSlotsThisDay: t.noSlotsThisDay,
            noSlotsThisMonth: t.noSlotsThisMonth,
            use24Hour: t.use24Hour,
            viewFirstAvailability: t.viewFirstAvailability,
          }}
          locale={locale}
          nextAvailableDate={nextAvailableDate}
          onIs24HourChange={setIs24Hour}
          onSelectTime={setSelectedTime}
          selectedDate={selectedDate}
          selectedInCurrentMonth={selectedInCurrentMonth}
        />
      </Card>
      <Link
        href="https://cal.com"
        className="font-heading text-xl"
        target="_blank"
      >
        Cal.com
      </Link>
    </div>
  );
}

export default Booker;
