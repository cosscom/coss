"use client";

import { CalendarX2Icon, Clock3Icon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/registry/default/ui/avatar";
import { Button } from "@/registry/default/ui/button";
import { Card } from "@/registry/default/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/default/ui/empty";
import { Label } from "@/registry/default/ui/label";
import { ScrollArea } from "@/registry/default/ui/scroll-area";
import { Skeleton } from "@/registry/default/ui/skeleton";
import { Switch } from "@/registry/default/ui/switch";
import { BookerCalendar } from "./booker/booker-calendar";
import bookerHeaderPlaceholder from "./booker/booker-header-placeholder.webp";
import { Location } from "./booker/location";
import { TimezonePicker } from "./booker/timezone-picker";
import { GENERIC_LOAD_ERROR, useBooker } from "@/lib/booker/use-booker";
import {
  displayTimeLabel,
  formatSelectedDay,
  formatSelectedWeekday,
  getInitials,
  isSingleDigit12HourLabel,
} from "@/lib/booker/utils";

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
        <div className="relative @3xl:w-56 @5xl:w-70">
          <div className="@3xl:absolute inset-0 flex flex-col gap-2">
            {(isPending || selectedInCurrentMonth) && (
              <div className="flex items-center justify-between rounded-se-2xl bg-card @3xl:@max-5xl:px-2 px-4 @3xl:@max-5xl:pt-2 pt-3">
                <div className="flex h-10 items-center gap-1.5 font-heading @3xl:@max-5xl:text-base text-lg sm:h-9">
                  <span>
                    {formatSelectedWeekday(selectedDate ?? new Date(), locale)}
                  </span>
                  <span className="text-muted-foreground/72">
                    {formatSelectedDay(selectedDate ?? new Date(), locale)}
                  </span>
                </div>
                <Label className="relative">
                  <span
                    className="pointer-events-none absolute inset-0 z-1 flex items-center text-center font-medium text-xs [&:has(+[data-slot=switch][data-checked])>*:first-child]:text-muted-foreground/72 [&:has(+[data-slot=switch][data-unchecked])>*:last-child]:text-muted-foreground/72"
                    aria-hidden="true"
                  >
                    <span className="flex-1 transition-colors">
                      {t.hour12Short}
                    </span>
                    <span className="flex-1 transition-colors">
                      {t.hour24Short}
                    </span>
                  </span>
                  <Switch
                    className="h-9 w-[calc(var(--thumb-size)*2)] rounded-lg bg-muted! p-0.5 [--thumb-size:--spacing(10)] *:data-[slot=switch-thumb]:data-checked:translate-x-[calc(var(--thumb-size)-2px)] *:data-[slot=switch-thumb]:aspect-auto *:data-[slot=switch-thumb]:w-[calc(var(--thumb-size)-2px)] *:data-[slot=switch-thumb]:rounded-md sm:h-8 dark:*:data-[slot=switch-thumb]:bg-input sm:[--thumb-size:--spacing(9)] *:[[span]]:text-muted-foreground/70"
                    aria-label={t.use24Hour}
                    checked={is24Hour}
                    onCheckedChange={setIs24Hour}
                  />
                </Label>
              </div>
            )}
            <div className="min-h-0 flex-1">
              {!isPending && daySlots.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <Empty className="gap-4 md:pt-2 md:pb-6">
                    <EmptyHeader>
                      <EmptyMedia variant="icon" className="mb-1">
                        <CalendarX2Icon />
                      </EmptyMedia>
                      <EmptyTitle className="@3xl:@max-5xl:text-base text-lg">
                        {t.noAvailableTimes}
                      </EmptyTitle>
                      <EmptyDescription className="[[data-slot=empty-title]+&]:mt-0">
                        {selectedInCurrentMonth
                          ? t.noSlotsThisDay
                          : t.noSlotsThisMonth}
                      </EmptyDescription>
                    </EmptyHeader>
                    {nextAvailableDate ? (
                      <EmptyContent>
                        <Button onClick={() => goToDate(nextAvailableDate)}>
                          {t.viewFirstAvailability}
                        </Button>
                      </EmptyContent>
                    ) : null}
                  </Empty>
                </div>
              ) : (
                <ScrollArea className="h-full" scrollFade>
                  <div className="flex @max-3xl:max-h-80 flex-col gap-3 @3xl:@max-5xl:px-2 px-4 pt-1 @3xl:@max-5xl:pb-2 pb-4">
                    {isPending ? (
                      <div className="grid w-full grid-cols-1 @5xl:gap-1.5 gap-1">
                        {Array.from(
                          { length: 20 },
                          (_, index) => `time-skeleton-${index}`,
                        ).map((skeletonKey) => (
                          <Skeleton
                            key={skeletonKey}
                            className="h-9 w-full rounded-lg sm:h-8"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="grid w-full grid-cols-1 @5xl:gap-1.5 gap-1">
                        {daySlots.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setSelectedTime(time)}
                            className="relative flex h-9 cursor-pointer items-center justify-center rounded-lg bg-muted font-medium text-foreground tabular-nums outline-none transition-shadow after:absolute @5xl:after:-inset-1 after:-inset-0.75 hover:ring-2 hover:ring-primary/72 focus-visible:z-1 focus-visible:ring-2 focus-visible:ring-primary/72 sm:h-8 sm:text-sm"
                          >
                            <span>
                              {!is24Hour && isSingleDigit12HourLabel(time) ? (
                                <span aria-hidden="true" className="invisible">
                                  0
                                </span>
                              ) : null}
                              {displayTimeLabel(time, !is24Hour)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>
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
