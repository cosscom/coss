"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { fetchRawBookerDataAction } from "@/lib/booker/actions";
import type { BookerTarget } from "@/lib/booker/target";
import {
  type BookerMeta,
  extractBookingWindowEnd,
  extractBookingWindowStart,
  extractEventTypeInfo,
  extractHost,
  extractMinimumBookingNotice,
  extractSlotsByDate,
  filterBookableSlots,
  findNextAvailableDate,
  pickDefaultSelectedDate,
  prefers24Hour,
  toDateKey,
} from "@/lib/booker/utils";

const WINDOW_MONTHS = 3;

const NOT_FOUND_MESSAGE = "No event type found for the provided target.";

export type BookerErrorKind = "not-found" | "network" | "unknown";

export type BookerError = {
  kind: BookerErrorKind;
  message: string;
};

function classifyError(message: string): BookerError {
  if (message === NOT_FOUND_MESSAGE) {
    return { kind: "not-found", message };
  }
  if (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("ETIMEDOUT") ||
    message.includes("ECONNREFUSED") ||
    /Cal\.com API [45]\d\d/.test(message)
  ) {
    return { kind: "network", message };
  }
  return { kind: "unknown", message };
}

type UseBookerParams = {
  target: BookerTarget;
  timezone?: string;
};

export type UseBookerResult = {
  meta: BookerMeta | null;
  error: BookerError | null;
  retry: () => void;
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
  selectedDurationMinutes: number;
  setSelectedDurationMinutes: (minutes: number) => void;
  handleMonthChange: (month: Date) => void;
  handleSelectDate: (nextDate: Date | undefined) => void;
  isDayDisabled: (date: Date) => boolean;
  goToDate: (date: Date) => void;
};

// All booker data + interaction logic: fetching/windowing cal.com availability,
// derived selection state, and the handlers the UI wires to the calendar.
export function useBooker({
  target,
  timezone,
}: UseBookerParams): UseBookerResult {
  const [meta, setMeta] = useState<BookerMeta | null>(null);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<BookerError | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [timeZone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [locale] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().locale || "en-US",
  );
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedTimeZone, setSelectedTimeZone] = useState(
    timezone ?? timeZone,
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState(30);
  const [is24Hour, setIs24Hour] = useState(() => prefers24Hour(locale));
  const coveredMonthsRef = useRef<Set<string>>(new Set());
  const resolvedRef = useRef<{
    dynamic?: {
      orgId?: number;
      orgSlug?: string;
      usernames: string[];
    };
    eventTypeId: number | null;
    eventTypeSlug: string | null;
  }>({ eventTypeId: null, eventTypeSlug: null });
  const lastIdentityRef = useRef<string | null>(null);
  const lastTimeZoneRef = useRef<string | null>(null);
  const lastDurationRef = useRef<number | null>(null);
  const autoSelectedMonthRef = useRef<string | null>(null);
  const slotsByDateRef = useRef<Record<string, string[]>>({});
  const slotsCacheRef = useRef<Map<string, Record<string, string[]>>>(
    new Map(),
  );
  const minimumBookingNoticeRef = useRef(0);
  const inFlightMonthsRef = useRef<Map<string, Promise<void>>>(new Map());
  const availabilityRequestVersionRef = useRef(0);

  const targetIdentity = useCallback((): string => {
    if (target.type === "user") {
      return `user:${target.username}:${target.eventSlug}:${target.orgId ?? ""}`;
    }
    if (target.type === "team") {
      return `team:${target.teamId}:${target.eventSlug}:${target.orgId ?? ""}`;
    }
    if (target.type === "dynamic") {
      return `dynamic:${target.usernames.join(",")}:${target.orgSlug ?? ""}:${target.orgId ?? ""}`;
    }
    return `link:${target.bookingUrl}`;
  }, [target]);

  const buildKey = useCallback(
    (month: Date) =>
      `${targetIdentity()}|${selectedTimeZone}|${selectedDurationMinutes}|${month.getFullYear()}-${month.getMonth()}`,
    [selectedDurationMinutes, selectedTimeZone, targetIdentity],
  );

  const slotsCacheKey = useCallback(
    () => `${targetIdentity()}|${selectedTimeZone}|${selectedDurationMinutes}`,
    [selectedDurationMinutes, selectedTimeZone, targetIdentity],
  );

  const restoreSlotsFromCache = useCallback(() => {
    const cached = slotsCacheRef.current.get(slotsCacheKey()) ?? {};
    slotsByDateRef.current = cached;
    setSlotsByDate(cached);
  }, [slotsCacheKey]);

  useLayoutEffect(() => {
    restoreSlotsFromCache();
  }, [restoreSlotsFromCache]);

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
          durationMinutes: selectedDurationMinutes,
          fetchMeta: resolvedRef.current.eventTypeId == null,
          monthIso: anchor.toISOString(),
          monthsToFetch: WINDOW_MONTHS,
          target,
          timeZone: selectedTimeZone,
          eventTypeId: resolvedRef.current.eventTypeId ?? undefined,
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
                  host.hostName === "Unknown user" && target.type === "user"
                    ? target.username
                    : host.hostName,
                hostAvatarUrl: host.hostAvatarUrl,
                eventTypeTitle: eventType.eventTypeTitle,
                eventTypeDescription: eventType.eventTypeDescription,
                eventTypeDurationMinutes: eventType.eventTypeDurationMinutes,
                eventTypeDurationOptions: eventType.eventTypeDurationOptions,
                eventTypeLocation: eventType.eventTypeLocation,
                eventTypeLocationProvider: eventType.eventTypeLocationProvider,
                eventTypeImageUrl: eventType.eventTypeImageUrl,
                bookingWindowStart: extractBookingWindowStart(
                  result.raw.selectedEventType,
                ),
                bookingWindowEnd: extractBookingWindowEnd(
                  result.raw.selectedEventType,
                ),
              },
          );

          const defaultDuration =
            eventType.eventTypeDurationMinutes ??
            eventType.eventTypeDurationOptions?.[0] ??
            30;
          if (
            eventType.eventTypeDurationOptions &&
            !eventType.eventTypeDurationOptions.includes(
              selectedDurationMinutes,
            )
          ) {
            setSelectedDurationMinutes(defaultDuration);
          }
        }

        const windowSlots = filterBookableSlots(
          extractSlotsByDate(result.raw.slots, selectedTimeZone),
          selectedTimeZone,
          minimumBookingNoticeRef.current,
          new Date(),
        );
        const cacheKey = `${targetIdentity()}|${selectedTimeZone}|${selectedDurationMinutes}`;
        const mergedSlots = {
          ...(slotsCacheRef.current.get(cacheKey) ?? {}),
          ...windowSlots,
        };
        slotsCacheRef.current.set(cacheKey, mergedSlots);
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
    [
      buildKey,
      selectedDurationMinutes,
      selectedTimeZone,
      target,
      targetIdentity,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const identity = targetIdentity();

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
        slotsCacheRef.current = new Map();
        slotsByDateRef.current = {};
        autoSelectedMonthRef.current = null;
        setMeta(null);
        setSelectedDurationMinutes(30);
        setSlotsByDate({});
      } else if (
        lastDurationRef.current !== null &&
        lastDurationRef.current !== selectedDurationMinutes
      ) {
        inFlightMonthsRef.current.clear();
        availabilityRequestVersionRef.current += 1;
        restoreSlotsFromCache();
        autoSelectedMonthRef.current = null;
        setSelectedTime(null);
      } else if (
        lastTimeZoneRef.current !== null &&
        lastTimeZoneRef.current !== selectedTimeZone
      ) {
        inFlightMonthsRef.current.clear();
        availabilityRequestVersionRef.current += 1;
        restoreSlotsFromCache();
        autoSelectedMonthRef.current = null;
        setSelectedTime(null);
      }
      lastIdentityRef.current = identity;
      lastTimeZoneRef.current = selectedTimeZone;
      lastDurationRef.current = selectedDurationMinutes;

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
          const message =
            caught instanceof Error
              ? caught.message
              : "Could not load booker data.";
          setError(classifyError(message));
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
        const firstAvailable = pickDefaultSelectedDate(
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
    fetchWindow,
    selectedDurationMinutes,
    selectedTimeZone,
    restoreSlotsFromCache,
    targetIdentity,
  ]);

  const [retryCounter, setRetryCounter] = useState(0);

  const retry = useCallback(() => {
    coveredMonthsRef.current = new Set();
    inFlightMonthsRef.current.clear();
    availabilityRequestVersionRef.current += 1;
    slotsCacheRef.current = new Map();
    slotsByDateRef.current = {};
    autoSelectedMonthRef.current = null;
    setSlotsByDate({});
    setError(null);
    setRetryCounter((c) => c + 1);
  }, []);

  // Re-trigger the main load effect when the user retries.
  useEffect(() => {
    // The first render (retryCounter === 0) is handled by the main effect.
    if (retryCounter === 0) return;
    setIsPending(true);
    let cancelled = false;

    (async () => {
      try {
        await fetchWindow(currentMonth);
        if (cancelled) return;
        setError(null);

        const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
        if (autoSelectedMonthRef.current !== monthKey) {
          const retryTodayStart = new Date();
          retryTodayStart.setHours(0, 0, 0, 0);
          const firstAvailable = pickDefaultSelectedDate(
            currentMonth,
            slotsByDateRef.current,
            selectedTimeZone,
            retryTodayStart,
          );
          if (firstAvailable) {
            autoSelectedMonthRef.current = monthKey;
            setSelectedDate(firstAvailable);
            setSelectedTime(null);
          }
        }
      } catch (caught) {
        if (cancelled) return;
        const message =
          caught instanceof Error
            ? caught.message
            : "Could not load booker data.";
        setError(classifyError(message));
      } finally {
        if (!cancelled) setIsPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [retryCounter, fetchWindow, currentMonth, selectedTimeZone]);

  useEffect(() => {
    if (!timezone) {
      return;
    }
    setSelectedTimeZone(timezone);
  }, [timezone]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // If the event type has a booking window start (RANGE periodType with a
  // future periodStartDate), use that as the earliest navigable month.
  const windowStart = meta?.bookingWindowStart;
  const startMonthBase =
    windowStart && windowStart > todayStart ? windowStart : todayStart;
  const startMonth = new Date(
    startMonthBase.getFullYear(),
    startMonthBase.getMonth(),
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
  const daySlots =
    selectedDate != null ? (slotsByDate[selectedDateKey] ?? []) : [];
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
    const firstAvailable = pickDefaultSelectedDate(
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
    retry,
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
    selectedDurationMinutes,
    setSelectedDurationMinutes,
    handleMonthChange,
    handleSelectDate,
    isDayDisabled,
    goToDate,
  };
}
