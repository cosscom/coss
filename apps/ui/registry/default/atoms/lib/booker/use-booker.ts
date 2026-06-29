"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRawBookerDataAction } from "@/lib/booker/actions";
import {
  type BookerMeta,
  extractBookingWindowEnd,
  extractEventTypeInfo,
  extractHost,
  extractMinimumBookingNotice,
  extractSlotsByDate,
  filterBookableSlots,
  findFirstAvailableDate,
  findNextAvailableDate,
  prefers24Hour,
  toDateKey,
} from "@/lib/booker/utils";

const WINDOW_MONTHS = 3;

// Stored in error state for non-Error failures so the (overridable) generic
// message can be resolved at render time without coupling the effect to labels.
export const GENERIC_LOAD_ERROR = "\u0000booker-generic-load-error";

type UseBookerParams = {
  username: string;
  eventSlug: string;
};

export type UseBookerResult = {
  meta: BookerMeta | null;
  error: string | null;
  isPending: boolean;
  locale: string;
  selectedTimeZone: string;
  setSelectedTimeZone: (timeZone: string) => void;
  currentMonth: Date;
  startMonth: Date;
  todayStart: Date;
  selectedDate: Date | undefined;
  selectedInCurrentMonth: boolean;
  daySlots: string[];
  nextAvailableDate: Date | null;
  is24Hour: boolean;
  setIs24Hour: (value: boolean) => void;
  selectedTime: string | null;
  setSelectedTime: (time: string | null) => void;
  handleMonthChange: (month: Date) => void;
  handleSelectDate: (nextDate: Date | undefined) => void;
  isDayDisabled: (date: Date) => boolean;
  goToDate: (date: Date) => void;
};

// All booker data + interaction logic: fetching/windowing cal.com availability,
// derived selection state, and the handlers the UI wires to the calendar.
export function useBooker({
  username,
  eventSlug,
}: UseBookerParams): UseBookerResult {
  const [meta, setMeta] = useState<BookerMeta | null>(null);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [timeZone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [locale] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().locale || "en-US",
  );
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedTimeZone, setSelectedTimeZone] = useState(timeZone);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [is24Hour, setIs24Hour] = useState(() => prefers24Hour(locale));
  const coveredMonthsRef = useRef<Set<string>>(new Set());
  const resolvedRef = useRef<{
    eventTypeId: number | null;
    eventTypeSlug: string | null;
  }>({ eventTypeId: null, eventTypeSlug: null });
  const lastIdentityRef = useRef<string | null>(null);
  const lastTimeZoneRef = useRef<string | null>(null);
  const autoSelectedMonthRef = useRef<string | null>(null);
  const slotsByDateRef = useRef<Record<string, string[]>>({});
  const minimumBookingNoticeRef = useRef(0);
  const inFlightMonthsRef = useRef<Map<string, Promise<void>>>(new Map());
  const availabilityRequestVersionRef = useRef(0);

  const buildKey = useCallback(
    (month: Date) =>
      `${username}|${eventSlug}|${selectedTimeZone}|${month.getFullYear()}-${month.getMonth()}`,
    [username, eventSlug, selectedTimeZone],
  );

  // Fetch a window of several months in a single request, anchored at `anchor`.
  const fetchWindow = useCallback(
    async (anchor: Date): Promise<void> => {
      const anchorKey = buildKey(anchor);

      if (coveredMonthsRef.current.has(anchorKey)) {
        return;
      }

      const existingRequest = inFlightMonthsRef.current.get(anchorKey);
      if (existingRequest) {
        await existingRequest;
        return;
      }

      const requestVersion = availabilityRequestVersionRef.current;
      const windowMonthKeys = Array.from(
        { length: WINDOW_MONTHS },
        (_, offset) =>
          buildKey(
            new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1),
          ),
      );
      const request = (async () => {
        const result = await fetchRawBookerDataAction({
          monthIso: anchor.toISOString(),
          monthsToFetch: WINDOW_MONTHS,
          timeZone: selectedTimeZone,
          username,
          preferredEventSlug: eventSlug,
          eventTypeId: resolvedRef.current.eventTypeId ?? undefined,
          eventTypeSlug: resolvedRef.current.eventTypeSlug ?? undefined,
        });

        if (!result.ok) {
          throw new Error(result.error);
        }

        if (availabilityRequestVersionRef.current !== requestVersion) {
          return;
        }

        resolvedRef.current = result.resolved;

        for (let offset = 0; offset < WINDOW_MONTHS; offset += 1) {
          const month = new Date(
            anchor.getFullYear(),
            anchor.getMonth() + offset,
            1,
          );
          coveredMonthsRef.current.add(buildKey(month));
        }

        // The host/event metadata only comes back on the full (non slots-only)
        // fetch, so set it once when present.
        if (result.raw.me) {
          const host = extractHost(result.raw.me);
          const eventType = extractEventTypeInfo(result.raw.selectedEventType);
          minimumBookingNoticeRef.current = extractMinimumBookingNotice(
            result.raw.selectedEventType,
          );
          setMeta(
            (prev) =>
              prev ?? {
                hostName:
                  host.hostName === "Unknown user" ? username : host.hostName,
                hostAvatarUrl: host.hostAvatarUrl,
                eventTypeTitle: eventType.eventTypeTitle,
                eventTypeDescription: eventType.eventTypeDescription,
                eventTypeDurationMinutes: eventType.eventTypeDurationMinutes,
                eventTypeLocation: eventType.eventTypeLocation,
                eventTypeLocationProvider: eventType.eventTypeLocationProvider,
                eventTypeImageUrl:
                  eventType.eventTypeImageUrl || "/bg-test-1.webp",
                bookingWindowEnd: extractBookingWindowEnd(
                  result.raw.selectedEventType,
                ),
              },
          );
        }

        const windowSlots = filterBookableSlots(
          extractSlotsByDate(result.raw.slots, selectedTimeZone),
          selectedTimeZone,
          minimumBookingNoticeRef.current,
          new Date(),
        );
        const mergedSlots = { ...slotsByDateRef.current, ...windowSlots };
        slotsByDateRef.current = mergedSlots;
        setSlotsByDate(mergedSlots);
      })();

      for (const monthKey of windowMonthKeys) {
        inFlightMonthsRef.current.set(monthKey, request);
      }

      try {
        await request;
      } finally {
        for (const monthKey of windowMonthKeys) {
          if (inFlightMonthsRef.current.get(monthKey) === request) {
            inFlightMonthsRef.current.delete(monthKey);
          }
        }
      }
    },
    [buildKey, eventSlug, selectedTimeZone, username],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const identity = `${username}|${eventSlug}`;

      // A different user/event means a different event type and metadata, so
      // reset everything and force a full fetch.
      if (
        lastIdentityRef.current !== null &&
        lastIdentityRef.current !== identity
      ) {
        coveredMonthsRef.current = new Set();
        inFlightMonthsRef.current.clear();
        availabilityRequestVersionRef.current += 1;
        resolvedRef.current = { eventTypeId: null, eventTypeSlug: null };
        slotsByDateRef.current = {};
        autoSelectedMonthRef.current = null;
        setMeta(null);
        setSlotsByDate({});
      } else if (
        lastTimeZoneRef.current !== null &&
        lastTimeZoneRef.current !== selectedTimeZone
      ) {
        // Timezone only affects slot times, not the resolved event type, so
        // just invalidate coverage and refetch (slots-only) with the new zone.
        coveredMonthsRef.current = new Set();
        inFlightMonthsRef.current.clear();
        availabilityRequestVersionRef.current += 1;
      }
      lastIdentityRef.current = identity;
      lastTimeZoneRef.current = selectedTimeZone;

      if (!coveredMonthsRef.current.has(buildKey(currentMonth))) {
        setIsPending(true);
        try {
          await fetchWindow(currentMonth);
          if (cancelled) {
            return;
          }
          setError(null);
        } catch (caught) {
          if (cancelled) {
            return;
          }
          setError(
            caught instanceof Error ? caught.message : GENERIC_LOAD_ERROR,
          );
        } finally {
          if (!cancelled) {
            setIsPending(false);
          }
        }
      } else {
        setError(null);
        setIsPending(false);
      }

      // Auto-select the first available day the first time this month's
      // availability is known (on load and on month navigation).
      const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
      if (!cancelled && autoSelectedMonthRef.current !== monthKey) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const firstAvailable = findFirstAvailableDate(
          currentMonth,
          slotsByDateRef.current,
          selectedTimeZone,
          todayStart,
        );
        if (firstAvailable) {
          autoSelectedMonthRef.current = monthKey;
          setSelectedDate(firstAvailable);
          setSelectedTime(null);
        }
      }

      // Warm the next uncovered window boundary, not just the adjacent month.
      // This keeps navigation instant when the user reaches the end of the
      // currently-covered 3-month range.
      const nextWindow = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + WINDOW_MONTHS,
        1,
      );
      if (!coveredMonthsRef.current.has(buildKey(nextWindow))) {
        void fetchWindow(nextWindow).catch(() => {});
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    buildKey,
    currentMonth,
    eventSlug,
    fetchWindow,
    selectedTimeZone,
    username,
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const startMonth = new Date(
    todayStart.getFullYear(),
    todayStart.getMonth(),
    1,
  );

  // Only treat the selection as "live" when it belongs to the month currently
  // on screen. Navigating to a month without availability leaves selectedDate
  // pointing at a previous month's day, which would otherwise keep its slots
  // visible instead of the empty state.
  const selectedInCurrentMonth =
    selectedDate != null &&
    selectedDate.getMonth() === currentMonth.getMonth() &&
    selectedDate.getFullYear() === currentMonth.getFullYear();
  const selectedDateKey = toDateKey(
    selectedDate ?? new Date(),
    selectedTimeZone,
  );
  const daySlots = selectedInCurrentMonth
    ? (slotsByDate[selectedDateKey] ?? [])
    : [];
  const nextAvailableDate = findNextAvailableDate(
    slotsByDate,
    selectedTimeZone,
    todayStart,
  );

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
    // Flip to pending in the same render as the month change when the target
    // month still needs fetching, so the skeleton shows immediately instead of
    // the empty state flashing for a frame before the async effect runs.
    if (!coveredMonthsRef.current.has(buildKey(month))) {
      setIsPending(true);
    }
    // For an already-loaded month, select the first available day in the same
    // update as the month change so the selection doesn't flicker.
    const monthTodayStart = new Date();
    monthTodayStart.setHours(0, 0, 0, 0);
    const firstAvailable = findFirstAvailableDate(
      month,
      slotsByDateRef.current,
      selectedTimeZone,
      monthTodayStart,
    );
    if (firstAvailable) {
      autoSelectedMonthRef.current = `${month.getFullYear()}-${month.getMonth()}`;
      setSelectedDate(firstAvailable);
      setSelectedTime(null);
    }
  };

  const handleSelectDate = (nextDate: Date | undefined) => {
    if (!nextDate) {
      return;
    }
    setSelectedDate(nextDate);
    setSelectedTime(null);
    autoSelectedMonthRef.current = `${nextDate.getFullYear()}-${nextDate.getMonth()}`;
    const isDifferentMonth =
      nextDate.getMonth() !== currentMonth.getMonth() ||
      nextDate.getFullYear() !== currentMonth.getFullYear();
    if (isDifferentMonth) {
      setCurrentMonth(nextDate);
    }
  };

  const isDayDisabled = (date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    if (dayStart < todayStart) {
      return true;
    }

    const dayKey = toDateKey(date, selectedTimeZone);
    return (slotsByDate[dayKey] ?? []).length === 0;
  };

  const goToDate = (date: Date) => {
    setCurrentMonth(date);
    setSelectedDate(date);
    setSelectedTime(null);
    autoSelectedMonthRef.current = `${date.getFullYear()}-${date.getMonth()}`;
  };

  return {
    meta,
    error,
    isPending,
    locale,
    selectedTimeZone,
    setSelectedTimeZone,
    currentMonth,
    startMonth,
    todayStart,
    selectedDate,
    selectedInCurrentMonth,
    daySlots,
    nextAvailableDate,
    is24Hour,
    setIs24Hour,
    selectedTime,
    setSelectedTime,
    handleMonthChange,
    handleSelectDate,
    isDayDisabled,
    goToDate,
  };
}
