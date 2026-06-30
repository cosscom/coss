export type BookerMeta = {
  hostName: string;
  hostAvatarUrl: string;
  eventTypeTitle: string;
  eventTypeDescription: string;
  eventTypeDurationMinutes: number | null;
  eventTypeLocation: string;
  eventTypeLocationProvider: string;
  eventTypeImageUrl: string;
  bookingWindowStart: Date | null;
  bookingWindowEnd: Date | null;
};

export type EventTypeInfo = {
  eventTypeTitle: string;
  eventTypeDescription: string;
  eventTypeDurationMinutes: number | null;
  eventTypeLocation: string;
  eventTypeLocationProvider: string;
  eventTypeImageUrl: string;
};

export function prettifyLocation(value: string): string {
  const normalized = value.trim().toLowerCase();

  const known: Record<string, string> = {
    "integrations:google:meet": "Google Meet",
    "integrations:zoom": "Zoom",
    "integrations:microsoft:teams": "Microsoft Teams",
    "integrations:whereby": "Whereby",
    "integrations:jitsi": "Jitsi Meet",
    inperson: "In person",
    phone: "Phone call",
  };

  if (known[normalized]) {
    return known[normalized];
  }

  if (normalized.startsWith("integrations:")) {
    const parts = normalized.replace("integrations:", "").split(":");
    return parts
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return value
    .replace(/[_:-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeAvatarUrl(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith("/")) {
    return `https://app.cal.com${trimmed}`;
  }

  return trimmed;
}

export function extractHost(payload: unknown): {
  hostName: string;
  hostAvatarUrl: string;
} {
  if (!payload || typeof payload !== "object") {
    return { hostName: "Unknown user", hostAvatarUrl: "" };
  }

  const root = payload as Record<string, unknown>;
  const data = (root.data as Record<string, unknown> | undefined) ?? root;
  const profile =
    data.profile && typeof data.profile === "object"
      ? (data.profile as Record<string, unknown>)
      : undefined;

  const rawAvatar =
    data.avatarUrl ??
    data.avatar_url ??
    data.avatar ??
    profile?.avatarUrl ??
    profile?.avatar_url ??
    profile?.avatar;

  return {
    hostName: String(
      data.name ?? data.username ?? data.email ?? "Unknown user",
    ),
    hostAvatarUrl: normalizeAvatarUrl(rawAvatar),
  };
}

export function extractEventTypeInfo(payload: unknown): EventTypeInfo {
  if (!payload || typeof payload !== "object") {
    return {
      eventTypeTitle: "No event type found",
      eventTypeDescription: "",
      eventTypeDurationMinutes: null,
      eventTypeLocation: "Unknown",
      eventTypeLocationProvider: "",
      eventTypeImageUrl: "",
    };
  }

  const record = payload as Record<string, unknown>;
  const durationValue =
    record.lengthInMinutes ??
    record.duration ??
    record.length ??
    record.minutes;
  const duration =
    typeof durationValue === "number"
      ? durationValue
      : typeof durationValue === "string" &&
          Number.isFinite(Number(durationValue))
        ? Number(durationValue)
        : null;

  const locationsRaw = record.locations;
  let locationText = "Unknown";
  let locationProvider = "";

  if (Array.isArray(locationsRaw) && locationsRaw.length > 0) {
    const first = locationsRaw[0];
    if (first && typeof first === "object") {
      const loc = first as Record<string, unknown>;
      const rawType =
        typeof loc.type === "string"
          ? loc.type
          : typeof loc.value === "string" &&
              loc.value.startsWith("integrations:")
            ? loc.value
            : "";
      locationProvider = rawType;
      locationText = String(
        loc.type ??
          loc.label ??
          loc.value ??
          loc.address ??
          loc.location ??
          "Unknown",
      );
    } else if (typeof first === "string") {
      locationText = first;
    }
  } else if (typeof record.location === "string") {
    locationText = record.location;
  }

  return {
    eventTypeTitle: String(
      record.title ?? record.name ?? record.slug ?? "No event type found",
    ),
    eventTypeDescription: String(record.description ?? ""),
    eventTypeDurationMinutes: duration,
    eventTypeLocation: prettifyLocation(locationText),
    eventTypeLocationProvider: locationProvider,
    eventTypeImageUrl: normalizeAvatarUrl(
      record.imageUrl ??
        record.image_url ??
        record.image ??
        record.bannerUrl ??
        record.coverImage ??
        record.coverImageUrl,
    ),
  };
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  ) {
    return Number(value);
  }
  return null;
}

function addCalendarDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let remaining = Math.max(0, days);
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remaining -= 1;
    }
  }
  return result;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Resolve the event type's booking window start date. For RANGE period types,
// this is the `periodStartDate`; otherwise bookings start from today.
export function extractBookingWindowStart(payload: unknown): Date | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const eventType = payload as Record<string, unknown>;
  const periodType =
    typeof eventType.periodType === "string"
      ? eventType.periodType.toUpperCase()
      : "";

  if (periodType === "RANGE") {
    const start = parseDate(eventType.periodStartDate);
    if (start) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // Never return a start date in the past.
      return start > today ? start : null;
    }
  }

  return null;
}

export function extractBookingWindowEnd(payload: unknown): Date | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const eventType = payload as Record<string, unknown>;
  const periodType =
    typeof eventType.periodType === "string"
      ? eventType.periodType.toUpperCase()
      : "";

  if (periodType === "RANGE") {
    return parseDate(eventType.periodEndDate);
  }

  if (periodType === "ROLLING" || periodType === "ROLLING_WINDOW") {
    const days = toFiniteNumber(eventType.periodDays);
    if (days != null) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventType.periodCountCalendarDays
        ? addCalendarDays(today, days)
        : addBusinessDays(today, days);
    }
  }

  return null;
}

export function getInitials(name: string): string {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "NA";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function formatSelectedWeekday(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
  }).format(date);
}

export function formatSelectedDay(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
  }).format(date);
}

export function formatSelectedMonth(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
  }).format(date);
}

export function toDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).format(date);
}

function toTimeLabel(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone,
  }).format(date);
}

// Whether a locale conventionally shows time in 24-hour form, used to seed the
// 12h/24h toggle (e.g. en-US → 12h, most of Europe → 24h). Falls back to 24h.
export function prefers24Hour(locale: string): boolean {
  try {
    const resolved = new Intl.DateTimeFormat(locale, {
      hour: "numeric",
    }).resolvedOptions();
    if (typeof resolved.hour12 === "boolean") {
      return !resolved.hour12;
    }
    return resolved.hourCycle === "h23" || resolved.hourCycle === "h24";
  } catch {
    return true;
  }
}

// Slots are stored as 24h "HH:mm" strings (stable ids); reformat for display.
export function displayTimeLabel(label: string, hour12: boolean): string {
  if (!hour12) {
    return label;
  }
  const [hoursRaw, minutesRaw] = label.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return label;
  }
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  const parts = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
  }).formatToParts(date);
  return parts
    .filter((part) => part.type !== "literal" || part.value.trim() !== "")
    .map((part) =>
      part.type === "dayPeriod" ? part.value.toLowerCase() : part.value,
    )
    .join("");
}

export function isSingleDigit12HourLabel(label: string): boolean {
  const hours = Number(label.split(":")[0]);
  if (Number.isNaN(hours)) {
    return false;
  }

  const normalizedHours = hours % 12 || 12;
  return normalizedHours < 10;
}

function parseSlotDate(value: unknown): Date | null {
  if (typeof value === "string") {
    if (/^\d{2}:\d{2}$/.test(value)) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidate =
    record.start ??
    record.startTime ??
    record.time ??
    record.dateTime ??
    record.date;

  return parseSlotDate(candidate);
}

export function extractSlotsByDate(
  payload: unknown,
  timeZone: string,
): Record<string, string[]> {
  const byDate = new Map<string, Set<string>>();
  const addSlot = (dateKey: string, time: string) => {
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, new Set<string>());
    }
    byDate.get(dateKey)?.add(time);
  };

  if (!payload || typeof payload !== "object") {
    return {};
  }

  const visitNode = (node: unknown) => {
    if (!node || typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        visitNode(item);
      }
      return;
    }

    const record = node as Record<string, unknown>;

    for (const [key, value] of Object.entries(record)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key) && Array.isArray(value)) {
        for (const slot of value) {
          if (typeof slot === "string" && /^\d{2}:\d{2}$/.test(slot)) {
            addSlot(key, slot);
            continue;
          }

          const parsed = parseSlotDate(slot);
          if (!parsed) {
            continue;
          }

          addSlot(key, toTimeLabel(parsed, timeZone));
        }
      } else {
        visitNode(value);
      }
    }
  };

  visitNode(payload);

  const result: Record<string, string[]> = {};
  for (const [key, times] of byDate.entries()) {
    result[key] = Array.from(times).sort((a, b) => a.localeCompare(b));
  }

  return result;
}

// Event's minimum booking notice in minutes (cal.com `minimumBookingNotice`).
export function extractMinimumBookingNotice(payload: unknown): number {
  if (!payload || typeof payload !== "object") {
    return 0;
  }
  const minutes = toFiniteNumber(
    (payload as Record<string, unknown>).minimumBookingNotice,
  );
  return minutes != null && minutes > 0 ? minutes : 0;
}

// Drop slots that are no longer bookable: anything earlier than now plus the
// minimum booking notice, evaluated in the booking timezone. Future days are
// kept untouched; only the boundary day is partially filtered. Guards against
// showing already-passed times for today (and as the session ages).
export function filterBookableSlots(
  slotsByDate: Record<string, string[]>,
  timeZone: string,
  noticeMinutes: number,
  now: Date,
): Record<string, string[]> {
  const cutoff = new Date(now.getTime() + noticeMinutes * 60_000);
  const cutoffDateKey = toDateKey(cutoff, timeZone);
  const [cutoffHoursRaw, cutoffMinutesRaw] = toTimeLabel(
    cutoff,
    timeZone,
  ).split(":");
  const cutoffHours = Number(cutoffHoursRaw);
  const cutoffMinutes = Number(cutoffMinutesRaw);
  if (Number.isNaN(cutoffHours) || Number.isNaN(cutoffMinutes)) {
    return slotsByDate;
  }
  const cutoffOfDay = cutoffHours * 60 + cutoffMinutes;

  const result: Record<string, string[]> = {};
  for (const [dateKey, times] of Object.entries(slotsByDate)) {
    if (dateKey < cutoffDateKey) {
      continue;
    }
    if (dateKey > cutoffDateKey) {
      result[dateKey] = times;
      continue;
    }
    const kept = times.filter((time) => {
      const [hoursRaw, minutesRaw] = time.split(":");
      const hours = Number(hoursRaw);
      const minutes = Number(minutesRaw);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return false;
      }
      return hours * 60 + minutes >= cutoffOfDay;
    });
    if (kept.length > 0) {
      result[dateKey] = kept;
    }
  }
  return result;
}

export function findFirstAvailableDate(
  month: Date,
  slotsByDate: Record<string, string[]>,
  timeZone: string,
  todayStart: Date,
): Date | null {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    if (dayStart < todayStart) {
      continue;
    }

    const key = toDateKey(date, timeZone);
    if ((slotsByDate[key] ?? []).length > 0) {
      return date;
    }
  }

  return null;
}

// Earliest loaded date (today or later) that still has open slots, used to
// offer a "jump to next availability" affordance from an empty month/day.
export function findNextAvailableDate(
  slotsByDate: Record<string, string[]>,
  timeZone: string,
  todayStart: Date,
): Date | null {
  const todayKey = toDateKey(todayStart, timeZone);
  let bestKey: string | null = null;
  for (const [key, times] of Object.entries(slotsByDate)) {
    if (times.length === 0 || key < todayKey) {
      continue;
    }
    if (bestKey === null || key < bestKey) {
      bestKey = key;
    }
  }

  if (!bestKey) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = bestKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }
  return new Date(year, month - 1, day);
}
