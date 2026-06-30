"use client";

import {
  AlertCircleIcon,
  Clock3Icon,
  RefreshCwIcon,
  SearchXIcon,
} from "lucide-react";
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
} from "@/registry/default/ui/empty";
import { Skeleton } from "@/registry/default/ui/skeleton";
import { BookerCalendar } from "./booker/booker-calendar";
import { DurationPicker } from "./booker/duration-picker";
import { EventDescription } from "./booker/event-description";
import { HeaderBanner } from "./booker/header-banner";
import { Location } from "./booker/location";
import { TimePicker } from "./booker/time-picker";
import { TimezonePicker } from "./booker/timezone-picker";
import type { BookerTarget } from "@/lib/booker/target";
import { type BookerError, useBooker } from "@/lib/booker/use-booker";
import { getInitials } from "@/lib/booker/utils";

type BookerLabels = {
  errorNotFound: string;
  errorNetwork: string;
  errorGeneric: string;
  retry: string;
  durationUnknown: string;
  durationMinutes: (minutes: number) => string;
  noAvailableTimes: string;
  noSlotsAvailable: string;
  noSlotsThisDay: string;
  noSlotsThisMonth: string;
  viewFirstAvailability: string;
  use24Hour: string;
  hour12Short: string;
  hour24Short: string;
  headerImageAlt: (hostName: string, eventTitle: string) => string;
};

const DEFAULT_BOOKER_LABELS: BookerLabels = {
  errorNotFound: "This event type could not be found.",
  errorNetwork: "Unable to connect. Please check your internet connection.",
  errorGeneric: "Something went wrong loading the booker.",
  retry: "Try again",
  durationUnknown: "Unknown",
  durationMinutes: (minutes) => `${minutes} min`,
  noAvailableTimes: "No available times",
  noSlotsAvailable: "There are no open slots.",
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
  target: BookerTarget;
  timezone?: string;
  defaultFormValues?: Record<string, unknown>;
  onCreateBookingSuccess?: (data: unknown) => void;
  labels?: Partial<BookerLabels>;
};

export function Booker({ target, timezone, labels }: BookerProps) {
  const t = { ...DEFAULT_BOOKER_LABELS, ...labels };
  const booker = useBooker({ target, timezone });

  if (booker.error) {
    return (
      <BookerErrorState
        error={booker.error}
        labels={t}
        onRetry={booker.retry}
      />
    );
  }

  const displayMeta = booker.meta;
  const headerImageAlt = displayMeta
    ? t.headerImageAlt(displayMeta.hostName, displayMeta.eventTypeTitle)
    : "Booker header";
  const metaContentClassName = [
    displayMeta?.eventTypeImageUrl ? "relative -mt-11 @5xl:-mt-13" : "",
    "flex flex-col gap-6 @5xl:p-6 p-4",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="@container mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4"
      aria-busy={booker.loadingState.busy}
    >
      <Card className="w-full @3xl:flex-row @3xl:divide-x divide-y @3xl:divide-y-0">
        {/* Meta */}
        <div className="@3xl:w-56 @5xl:w-70">
          <HeaderBanner
            alt={headerImageAlt}
            src={displayMeta?.eventTypeImageUrl}
          />
          <div className={metaContentClassName}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Avatar className="@3xl:@max-5xl:size-12 size-14 outline-2 outline-background">
                  {displayMeta?.hostAvatarUrl ? (
                    <AvatarImage src={displayMeta.hostAvatarUrl} />
                  ) : null}
                  {displayMeta ? (
                    <AvatarFallback>
                      {getInitials(displayMeta.hostName)}
                    </AvatarFallback>
                  ) : (
                    <AvatarFallback className="bg-transparent">
                      <Skeleton className="size-full rounded-full" />
                    </AvatarFallback>
                  )}
                </Avatar>
                {displayMeta ? (
                  <p className="font-medium text-muted-foreground sm:text-sm">
                    {displayMeta.hostName}
                  </p>
                ) : (
                  <Skeleton className="my-0.5 h-5 w-24 sm:h-4" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                {displayMeta ? (
                  <>
                    <h1 className="font-heading @3xl:@max-5xl:text-lg text-xl">
                      {displayMeta.eventTypeTitle}
                    </h1>
                    <EventDescription
                      description={displayMeta.eventTypeDescription}
                    />
                  </>
                ) : (
                  <>
                    <Skeleton className="my-0.5 h-6 w-36" />
                    <Skeleton className="my-0.5 h-4 w-full" />
                    <Skeleton className="my-0.5 h-4 w-full" />
                  </>
                )}
              </div>
            </div>

            {displayMeta ? (
              <div className="flex flex-col gap-3 sm:text-sm">
                {displayMeta.eventTypeDurationOptions ? (
                  <DurationPicker
                    formatLabel={t.durationMinutes}
                    options={displayMeta.eventTypeDurationOptions}
                    {...booker.durationProps}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Clock3Icon
                      className="size-4.5 shrink-0 opacity-80 sm:size-4"
                      aria-hidden="true"
                    />
                    <span>
                      {displayMeta.eventTypeDurationMinutes
                        ? t.durationMinutes(
                            displayMeta.eventTypeDurationMinutes,
                          )
                        : t.durationUnknown}
                    </span>
                  </div>
                )}
                <Location
                  location={displayMeta.eventTypeLocation}
                  provider={displayMeta.eventTypeLocationProvider}
                />
                <TimezonePicker {...booker.timezoneProps} />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <Skeleton className="my-0.5 h-4 w-36" />
                <Skeleton className="my-0.5 h-4 w-36" />
                <Skeleton className="my-0.5 h-4 w-36" />
              </div>
            )}
          </div>
        </div>
        {/* Calendar */}
        <div className="flex flex-1 flex-col items-center @3xl:@max-5xl:px-2 px-4 @3xl:@max-5xl:py-2 pt-3 pb-4">
          <BookerCalendar {...booker.calendarProps} />
        </div>
        {/* Time picker */}
        <TimePicker
          labels={{
            hour12Short: t.hour12Short,
            hour24Short: t.hour24Short,
            noAvailableTimes: t.noAvailableTimes,
            noSlotsAvailable: t.noSlotsAvailable,
            noSlotsThisDay: t.noSlotsThisDay,
            noSlotsThisMonth: t.noSlotsThisMonth,
            use24Hour: t.use24Hour,
            viewFirstAvailability: t.viewFirstAvailability,
          }}
          {...booker.timePickerProps}
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

function BookerErrorState({
  error,
  labels,
  onRetry,
}: {
  error: BookerError;
  labels: BookerLabels;
  onRetry: () => void;
}) {
  const isNotFound = error.kind === "not-found";
  const heading = isNotFound
    ? labels.errorNotFound
    : error.kind === "network"
      ? labels.errorNetwork
      : labels.errorGeneric;

  return (
    <div
      className="@container mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4"
      role="alert"
    >
      <Card className="w-full">
        <Empty className="gap-4 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="mb-1">
              {isNotFound ? (
                <SearchXIcon aria-hidden="true" />
              ) : (
                <AlertCircleIcon aria-hidden="true" />
              )}
            </EmptyMedia>
            <EmptyDescription>{heading}</EmptyDescription>
          </EmptyHeader>
          {!isNotFound && (
            <EmptyContent>
              <Button variant="outline" onClick={onRetry}>
                <RefreshCwIcon aria-hidden="true" />
                {labels.retry}
              </Button>
            </EmptyContent>
          )}
        </Empty>
      </Card>
    </div>
  );
}

export default Booker;
