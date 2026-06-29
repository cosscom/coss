"use server";

import { CalApiError } from "@/lib/cal-api/client";
import { getEventType } from "@/lib/cal-api/event-types";
import { getAvailableSlots } from "@/lib/cal-api/slots";
import type { EventType } from "@/lib/cal-api/types";

type FetchRawBookerInput = {
  monthIso: string;
  timeZone: string;
  username: string;
  preferredEventSlug?: string;
  monthsToFetch?: number;
  eventTypeId?: number;
  eventTypeSlug?: string;
};

type ResolvedEventType = {
  eventTypeId: number | null;
  eventTypeSlug: string | null;
};

type FetchRawBookerResult =
  | {
      ok: true;
      raw: {
        me: unknown;
        eventTypes: unknown;
        selectedEventType: unknown | null;
        slots: unknown;
      };
      resolved: ResolvedEventType;
    }
  | {
      ok: false;
      error: string;
    };

function _toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function buildMePayload(username: string, eventType: EventType): unknown {
  const owner = eventType.users?.[0] ?? eventType.hosts?.[0];

  return {
    data: {
      avatarUrl: owner?.avatarUrl,
      name: owner?.name ?? username,
      username: owner?.username ?? username,
    },
  };
}

function buildSlotRange(monthIso: string, monthsToFetch: number) {
  const monthDate = new Date(monthIso);
  const safeMonthDate = Number.isNaN(monthDate.getTime())
    ? new Date()
    : monthDate;
  const monthStart = new Date(
    Date.UTC(safeMonthDate.getFullYear(), safeMonthDate.getMonth(), 1),
  );
  const rangeEnd = new Date(
    Date.UTC(
      safeMonthDate.getFullYear(),
      safeMonthDate.getMonth() + monthsToFetch,
      0,
    ),
  );
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const rangeStart = monthStart < todayUtc ? todayUtc : monthStart;

  return {
    end: rangeEnd.toISOString().slice(0, 10),
    start: rangeStart.toISOString().slice(0, 10),
  };
}

async function fetchSlotsForEventType(
  input: FetchRawBookerInput,
  resolved: ResolvedEventType,
): Promise<unknown> {
  const monthsToFetch = Math.max(1, Math.floor(input.monthsToFetch ?? 1));
  const { end, start } = buildSlotRange(input.monthIso, monthsToFetch);

  if (resolved.eventTypeId != null) {
    return getAvailableSlots({
      end,
      eventTypeId: resolved.eventTypeId,
      start,
      timeZone: input.timeZone,
    });
  }

  const eventTypeSlug = resolved.eventTypeSlug ?? input.preferredEventSlug;
  if (!eventTypeSlug) {
    throw new CalApiError(
      "Missing event type slug for slot lookup.",
      "MISSING_SLUG",
      400,
    );
  }

  return getAvailableSlots({
    end,
    eventTypeSlug,
    start,
    timeZone: input.timeZone,
    username: input.username,
  });
}

export async function fetchRawBookerDataAction(
  input: FetchRawBookerInput,
): Promise<FetchRawBookerResult> {
  try {
    if (input.eventTypeId != null) {
      const resolved: ResolvedEventType = {
        eventTypeId: input.eventTypeId,
        eventTypeSlug: input.eventTypeSlug ?? input.preferredEventSlug ?? null,
      };
      const slots = await fetchSlotsForEventType(input, resolved);

      return {
        ok: true,
        raw: { eventTypes: null, me: null, selectedEventType: null, slots },
        resolved,
      };
    }

    const preferredEventSlug = input.preferredEventSlug ?? input.eventTypeSlug;
    if (!preferredEventSlug) {
      return { error: "Pass eventSlug to Booker.", ok: false };
    }

    const selectedEventType = await getEventType({
      eventSlug: preferredEventSlug,
      username: input.username,
    });

    if (!selectedEventType) {
      return {
        error: `No event type found for ${input.username}/${preferredEventSlug}.`,
        ok: false,
      };
    }

    const resolved: ResolvedEventType = {
      eventTypeId: selectedEventType.id,
      eventTypeSlug: selectedEventType.slug,
    };
    const slots = await fetchSlotsForEventType(input, resolved);

    return {
      ok: true,
      raw: {
        eventTypes: [selectedEventType],
        me: buildMePayload(input.username, selectedEventType),
        selectedEventType,
        slots,
      },
      resolved,
    };
  } catch (error) {
    return {
      error:
        error instanceof CalApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not load booker data.",
      ok: false,
    };
  }
}
