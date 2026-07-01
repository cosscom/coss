"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchRawBookerDataAction } from "@/lib/booker/actions";
import {
  type BookerTarget,
  getDynamicContext,
  getOrgSlugFromTarget,
} from "@/lib/booker/target";
import {
  type BookerMeta,
  type CalendarViewOptions,
  extractBookingWindowEnd,
  extractBookingWindowStart,
  extractEventTypeInfo,
  extractHost,
  extractHostAvatars,
  extractHostDisplayName,
  extractMinimumBookingNotice,
  extractSlotsByDate,
  filterBookableSlots,
  findNextAvailableDate,
  getMinimumNavigableMonth,
  getTodayInTimeZone,
  getWeekStartsOn,
  hasAvailabilityInVisibleGrid,
  isCalendarMonthBefore,
  pickDefaultSelectedDate,
  prefers24Hour,
  toCalendarDateKey,
} from "@/lib/booker/utils";

const WINDOW_MONTHS = 3;

export type BookerErrorKind =
  | "not-found"
  | "unpublished"
  | "network"
  | "unknown";

export type BookerError = {
  kind: BookerErrorKind;
  message: string;
};

class BookerDataError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

function classifyError(caught: unknown): BookerError {
  const code = caught instanceof BookerDataError ? caught.code : "";
  const message =
    caught instanceof Error ? caught.message : "Could not load booker data.";

  if (code === "UNPUBLISHED") {
    return { kind: "unpublished", message };
  }
  if (code === "NOT_FOUND") {
    return { kind: "not-found", message };
  }
  if (
    code.startsWith("HTTP_4") ||
    code.startsWith("HTTP_5") ||
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

type BookerLoadingState = {
  availability: boolean;
  busy: boolean;
  initial: boolean;
};

type BookerTimezoneState = {
  onValueChange: (timeZone: string) => void;
  value: string;
};

type BookerDurationState = {
  onValueChange: (minutes: number) => void;
  value: number;
};

type BookerCalendarState = {
  availabilityLoading: boolean;
  disabled: (date: Date) => boolean;
  endMonth?: Date;
  initialLoading: boolean;
  locale: string;
  month: Date;
  onMonthChange: (month: Date) => void;
  onSelect: (nextDate: Date | undefined) => void;
  selected: Date | undefined;
  startMonth: Date;
  today: Date;
};

type BookerTimePickerState = {
  availabilityLoading: boolean;
  currentMonth: Date;
  daySlots: string[];
  goToDate: (date: Date) => void;
  hasAvailabilityInView: boolean;
  initialLoading: boolean;
  is24Hour: boolean;
  locale: string;
  nextAvailableDate: Date | null;
  onIs24HourChange: (value: boolean) => void;
  onSelectTime: (time: string) => void;
  selectedDate: Date | undefined;
};

export type UseBookerResult = {
  calendarProps: BookerCalendarState;
  durationProps: BookerDurationState;
  error: BookerError | null;
  loadingState: BookerLoadingState;
  meta: BookerMeta | null;
  retry: () => void;
  timePickerProps: BookerTimePickerState;
  timezoneProps: BookerTimezoneState;
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
  const [_selectedTime, setSelectedTime] = useState<string | null>(null);
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
  const hasMultiDurationOptionsRef = useRef(false);
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;
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
        const durationMinutes =
          getDynamicContext(target) || hasMultiDurationOptionsRef.current
            ? selectedDurationMinutes
            : undefined;

        const result = await fetchRawBookerDataAction({
          durationMinutes,
          fetchMeta: resolvedRef.current.eventTypeId == null,
          monthIso: anchor.toISOString(),
          monthsToFetch: WINDOW_MONTHS,
          target,
          timeZone: selectedTimeZone,
          eventTypeId: resolvedRef.current.eventTypeId ?? undefined,
        });

        if (!result.ok) {
          throw new BookerDataError(
            result.error,
            result.errorCode ?? "UNKNOWN",
          );
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
          const isDynamic = Boolean(getDynamicContext(target));
          const hostAvatars = extractHostAvatars(
            result.raw.selectedEventType,
            result.raw.me,
            { dynamic: isDynamic, orgSlug: getOrgSlugFromTarget(target) },
          );
          const hostName = extractHostDisplayName(
            result.raw.selectedEventType,
            result.raw.me,
            { dynamic: isDynamic },
          );
          const eventType = extractEventTypeInfo(result.raw.selectedEventType);
          minimumBookingNoticeRef.current = extractMinimumBookingNotice(
            result.raw.selectedEventType,
          );
          hasMultiDurationOptionsRef.current =
            (eventType.eventTypeDurationOptions?.length ?? 0) > 1;
          setMeta(
            (prev) =>
              prev ?? {
                hostName:
                  host.hostName === "Unknown user" && target.type === "user"
                    ? target.username
                    : result.raw.publicDisplayName || hostName,
                hostAvatarUrl: host.hostAvatarUrl,
                hostAvatars,
                eventTypeTitle: eventType.eventTypeTitle,
                eventTypeDescription: eventType.eventTypeDescription,
                eventTypeDurationMinutes: eventType.eventTypeDurationMinutes,
                eventTypeDurationOptions: eventType.eventTypeDurationOptions,
                eventTypeLocations: eventType.eventTypeLocations,
                eventTypeImageUrl:
                  result.raw.bannerUrl || eventType.eventTypeImageUrl,
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
          if (eventType.eventTypeDurationOptions?.length) {
            if (
              !eventType.eventTypeDurationOptions.includes(
                selectedDurationMinutes,
              )
            ) {
              setSelectedDurationMinutes(defaultDuration);
            }
          } else if (
            eventType.eventTypeDurationMinutes != null &&
            selectedDurationMinutes !== eventType.eventTypeDurationMinutes
          ) {
            setSelectedDurationMinutes(eventType.eventTypeDurationMinutes);
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

  const todayStart = useMemo(
    () => getTodayInTimeZone(selectedTimeZone),
    [selectedTimeZone],
  );
  const startMonth = useMemo(
    () => getMinimumNavigableMonth(selectedTimeZone, meta?.bookingWindowStart),
    [meta?.bookingWindowStart, selectedTimeZone],
  );
  const calendarViewOptions = useMemo((): CalendarViewOptions => {
    return {
      endMonth: meta?.bookingWindowEnd ?? undefined,
      shiftWeeks: true,
      startMonth,
      weekStartsOn: getWeekStartsOn(locale),
    };
  }, [locale, meta?.bookingWindowEnd, startMonth]);

  const hasAvailabilityInView = useMemo(
    () =>
      hasAvailabilityInVisibleGrid(
        currentMonth,
        slotsByDate,
        todayStart,
        calendarViewOptions,
      ),
    [calendarViewOptions, currentMonth, slotsByDate, todayStart],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const identity = targetIdentity();
      let deferLoadForMonthSync = false;

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
        hasMultiDurationOptionsRef.current = false;
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
        coveredMonthsRef.current = new Set();
        inFlightMonthsRef.current.clear();
        availabilityRequestVersionRef.current += 1;
        restoreSlotsFromCache();
        autoSelectedMonthRef.current = null;
        setSelectedTime(null);

        const minMonth = getMinimumNavigableMonth(
          selectedTimeZone,
          meta?.bookingWindowStart,
        );
        if (isCalendarMonthBefore(currentMonth, minMonth)) {
          setCurrentMonth(minMonth);
          deferLoadForMonthSync = true;
        } else {
          const todayInTz = getTodayInTimeZone(selectedTimeZone);
          if (
            selectedDateRef.current &&
            toCalendarDateKey(selectedDateRef.current) <
              toCalendarDateKey(todayInTz)
          ) {
            setSelectedDate(undefined);
          }
        }
      }
      lastIdentityRef.current = identity;
      lastTimeZoneRef.current = selectedTimeZone;
      lastDurationRef.current = selectedDurationMinutes;

      if (deferLoadForMonthSync) {
        return;
      }

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
          setError(classifyError(caught));
          return;
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
        const firstAvailable = pickDefaultSelectedDate(
          currentMonth,
          slotsByDateRef.current,
          selectedTimeZone,
          getTodayInTimeZone(selectedTimeZone),
          calendarViewOptions,
        );
        if (firstAvailable) {
          autoSelectedMonthRef.current = monthKey;
          setSelectedDate(firstAvailable);
          setSelectedTime(null);
        } else {
          autoSelectedMonthRef.current = monthKey;
          setSelectedDate(undefined);
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
    meta?.bookingWindowStart,
    calendarViewOptions,
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
          const firstAvailable = pickDefaultSelectedDate(
            currentMonth,
            slotsByDateRef.current,
            selectedTimeZone,
            getTodayInTimeZone(selectedTimeZone),
            calendarViewOptions,
          );
          if (firstAvailable) {
            autoSelectedMonthRef.current = monthKey;
            setSelectedDate(firstAvailable);
            setSelectedTime(null);
          } else {
            autoSelectedMonthRef.current = monthKey;
            setSelectedDate(undefined);
            setSelectedTime(null);
          }
        }
      } catch (caught) {
        if (cancelled) return;
        setError(classifyError(caught));
      } finally {
        if (!cancelled) setIsPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    retryCounter,
    fetchWindow,
    currentMonth,
    selectedTimeZone,
    calendarViewOptions,
  ]);

  useEffect(() => {
    if (!timezone) {
      return;
    }
    setSelectedTimeZone(timezone);
  }, [timezone]);

  const selectedDateKey = toCalendarDateKey(selectedDate ?? todayStart);
  const daySlots =
    selectedDate != null ? (slotsByDate[selectedDateKey] ?? []) : [];
  const nextAvailableDate = findNextAvailableDate(
    slotsByDate,
    selectedTimeZone,
    todayStart,
  );

  const handleMonthChange = (month: Date) => {
    const monthKey = `${month.getFullYear()}-${month.getMonth()}`;
    const monthCovered = coveredMonthsRef.current.has(buildKey(month));
    setCurrentMonth(month);
    // Flip to pending in the same render as the month change when the target
    // month still needs fetching, so the skeleton shows immediately instead of
    // the empty state flashing for a frame before the async effect runs.
    if (!monthCovered) {
      setIsPending(true);
    }
    // For an already-loaded month, select the first available day in the same
    // update as the month change so the selection doesn't flicker.
    const firstAvailable = pickDefaultSelectedDate(
      month,
      slotsByDateRef.current,
      selectedTimeZone,
      getTodayInTimeZone(selectedTimeZone),
      calendarViewOptions,
    );
    if (firstAvailable) {
      autoSelectedMonthRef.current = monthKey;
      setSelectedDate(firstAvailable);
      setSelectedTime(null);
    } else {
      if (monthCovered) {
        autoSelectedMonthRef.current = monthKey;
      }
      setSelectedDate(undefined);
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
    const dayKey = toCalendarDateKey(date);
    if (dayKey < toCalendarDateKey(todayStart)) {
      return true;
    }

    return (slotsByDate[dayKey] ?? []).length === 0;
  };

  const goToDate = (date: Date) => {
    setCurrentMonth(date);
    setSelectedDate(date);
    setSelectedTime(null);
    autoSelectedMonthRef.current = `${date.getFullYear()}-${date.getMonth()}`;
  };

  const initialLoading = !meta;
  const availabilityLoading = isPending;

  return {
    calendarProps: {
      availabilityLoading,
      disabled: isDayDisabled,
      endMonth: meta?.bookingWindowEnd ?? undefined,
      initialLoading,
      locale,
      month: currentMonth,
      onMonthChange: handleMonthChange,
      onSelect: handleSelectDate,
      selected: selectedDate,
      startMonth,
      today: todayStart,
    },
    durationProps: {
      onValueChange: setSelectedDurationMinutes,
      value: selectedDurationMinutes,
    },
    error,
    loadingState: {
      availability: availabilityLoading,
      busy: initialLoading || availabilityLoading,
      initial: initialLoading,
    },
    meta,
    retry,
    timePickerProps: {
      availabilityLoading,
      currentMonth,
      daySlots,
      goToDate,
      hasAvailabilityInView,
      initialLoading,
      is24Hour,
      locale,
      nextAvailableDate,
      onIs24HourChange: setIs24Hour,
      onSelectTime: setSelectedTime,
      selectedDate,
    },
    timezoneProps: {
      onValueChange: setSelectedTimeZone,
      value: selectedTimeZone,
    },
  };
}
