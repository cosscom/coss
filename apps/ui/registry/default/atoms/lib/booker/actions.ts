"use server";

import {
  type BookerTarget,
  getDynamicContext,
  getOrgSlugFromTarget,
  getPublicEventBannerParamsFromTarget,
  getUserSlotParamsFromTarget,
  parseBookingUrlTarget,
} from "@/lib/booker/target";
import { CalApiError } from "@/lib/cal-api/client";
import {
  getDynamicEventType,
  getEventType,
  getEventTypeById,
  getTeamEventType,
  getTeamSlugEventType,
} from "@/lib/cal-api/event-types";
import { getPublicEventInfo } from "@/lib/cal-api/public-event";
import { getAvailableSlots } from "@/lib/cal-api/slots";
import { getScheduleViaTrpc } from "@/lib/cal-api/slots-trpc";
import type { EventType } from "@/lib/cal-api/types";

type PerformanceTimings = {
  source: "apiv2" | "trpc";
  totalMs: number;
  eventTypeResolutionMs: number;
  slotsFetchMs: number;
  metaFetchMs: number;
};

function getSlotsSource(): "apiv2" | "trpc" {
  return process.env.SLOTS_SOURCE === "trpc" ? "trpc" : "apiv2";
}

export type FetchRawBookerInput = {
  monthIso: string;
  timeZone: string;
  target: BookerTarget;
  monthsToFetch?: number;
  eventTypeId?: number;
  fetchMeta?: boolean;
  durationMinutes?: number;
};

type ResolvedEventType = {
  eventTypeId: number | null;
  eventTypeSlug: string | null;
  dynamic?: {
    orgId?: number;
    orgSlug?: string;
    usernames: string[];
  };
};

export type FetchRawBookerResult =
  | {
      ok: true;
      raw: {
        me: unknown;
        eventTypes: unknown;
        selectedEventType: unknown | null;
        bannerUrl: string;
        publicDisplayName: string;
        slots: unknown;
      };
      resolved: ResolvedEventType;
      timings?: PerformanceTimings;
    }
  | {
      ok: false;
      error: string;
      errorCode?: string;
      timings?: PerformanceTimings;
    };

function buildMePayload(target: BookerTarget, eventType: EventType): unknown {
  const owner = eventType.users?.[0] ?? eventType.hosts?.[0];
  const dynamicContext = getDynamicContext(target);
  const fallbackName =
    target.type === "user"
      ? target.username
      : dynamicContext
        ? dynamicContext.usernames.join(" + ")
        : (owner?.username ?? "Unknown user");

  return {
    data: {
      avatarUrl: owner?.avatarUrl,
      name: owner?.name ?? fallbackName,
      username: owner?.username ?? fallbackName,
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

function buildSlotFetchParams(
  input: FetchRawBookerInput,
  resolved: ResolvedEventType,
): {
  start: string;
  end: string;
  timeZone: string;
  username?: string;
  usernames?: string[];
  eventTypeSlug?: string;
  eventTypeId?: number;
  organizationSlug?: string;
  duration?: number;
} {
  const monthsToFetch = Math.max(1, Math.floor(input.monthsToFetch ?? 1));
  const { end, start } = buildSlotRange(input.monthIso, monthsToFetch);
  const duration = input.durationMinutes;
  const organizationSlug = getOrgSlugFromTarget(input.target);
  const userSlotParams = getUserSlotParamsFromTarget(input.target);

  if (resolved.dynamic) {
    return {
      duration,
      end,
      organizationSlug: resolved.dynamic.orgSlug,
      start,
      timeZone: input.timeZone,
      usernames: resolved.dynamic.usernames,
    };
  }

  if (organizationSlug && userSlotParams) {
    return {
      duration,
      end,
      eventTypeSlug: userSlotParams.eventTypeSlug,
      organizationSlug,
      start,
      timeZone: input.timeZone,
      username: userSlotParams.username,
    };
  }

  if (resolved.eventTypeId != null) {
    return {
      duration,
      end,
      eventTypeId: resolved.eventTypeId,
      organizationSlug,
      start,
      timeZone: input.timeZone,
    };
  }

  const eventTypeSlug = resolved.eventTypeSlug;
  if (!eventTypeSlug) {
    throw new CalApiError(
      "Missing event type slug for slot lookup.",
      "MISSING_SLUG",
      400,
    );
  }

  return {
    duration,
    end,
    eventTypeSlug,
    organizationSlug,
    start,
    timeZone: input.timeZone,
    username: userSlotParams?.username,
  };
}

async function fetchSlotsForEventType(
  input: FetchRawBookerInput,
  resolved: ResolvedEventType,
): Promise<unknown> {
  const params = buildSlotFetchParams(input, resolved);
  const source = getSlotsSource();

  if (source === "trpc") {
    return getScheduleViaTrpc(params);
  }

  return getAvailableSlots(params);
}

async function fetchPublicEventInfo(
  target: BookerTarget,
): Promise<{ bannerUrl: string; displayName: string }> {
  const params = getPublicEventBannerParamsFromTarget(target);
  if (!params) {
    return { bannerUrl: "", displayName: "" };
  }

  return getPublicEventInfo(params);
}

function getHeaderBannerUrl(
  target: BookerTarget,
  publicInfo: { bannerUrl: string },
): string {
  // Cal's public booker does not show the org/team banner for dynamic bookings.
  if (getDynamicContext(target)) {
    return "";
  }

  return publicInfo.bannerUrl;
}

async function resolveEventType(
  target: BookerTarget,
): Promise<EventType | null> {
  if (target.type === "dynamic") {
    return getDynamicEventType({
      orgId: target.orgId,
      orgSlug: target.orgSlug,
      usernames: target.usernames,
    });
  }

  if (target.type === "user") {
    return getEventType({
      eventSlug: target.eventSlug,
      orgId: target.orgId,
      username: target.username,
    });
  }

  if (target.type === "team") {
    return getTeamEventType({
      eventSlug: target.eventSlug,
      orgId: target.orgId,
      teamId: target.teamId,
    });
  }

  const parsed = parseBookingUrlTarget(target.bookingUrl, target.orgId);
  if (parsed.type === "dynamic") {
    return getDynamicEventType({
      orgId: parsed.orgId,
      orgSlug: parsed.orgSlug,
      usernames: parsed.usernames,
    });
  }

  if (parsed.type === "user") {
    return getEventType({
      eventSlug: parsed.eventSlug,
      orgId: parsed.orgId,
      orgSlug: parsed.orgSlug,
      username: parsed.username,
    });
  }

  return getTeamSlugEventType({
    eventSlug: parsed.eventSlug,
    orgId: parsed.orgId,
    orgSlug: parsed.orgSlug,
    teamSlug: parsed.teamSlug,
  });
}

function buildResolvedEventType(
  target: BookerTarget,
  selectedEventType: EventType,
): ResolvedEventType {
  const dynamic = getDynamicContext(target);
  if (dynamic) {
    return { dynamic, eventTypeId: null, eventTypeSlug: null };
  }

  return {
    eventTypeId: selectedEventType.id > 0 ? selectedEventType.id : null,
    eventTypeSlug: selectedEventType.slug,
  };
}

function logTimings(timings: PerformanceTimings): void {
  console.log(
    `[booker-perf] source=${timings.source}` +
      ` total=${timings.totalMs}ms` +
      ` eventTypeResolution=${timings.eventTypeResolutionMs}ms` +
      ` slotsFetch=${timings.slotsFetchMs}ms` +
      ` metaFetch=${timings.metaFetchMs}ms`,
  );
}

export async function fetchRawBookerDataAction(
  input: FetchRawBookerInput,
): Promise<FetchRawBookerResult> {
  const actionStart = performance.now();
  const source = getSlotsSource();
  let eventTypeResolutionMs = 0;
  let slotsFetchMs = 0;
  let metaFetchMs = 0;

  try {
    if (input.eventTypeId != null) {
      const resolved: ResolvedEventType = {
        eventTypeId: input.eventTypeId,
        eventTypeSlug: null,
      };

      const slotsStart = performance.now();
      const slots = await fetchSlotsForEventType(input, resolved);
      slotsFetchMs = Math.round(performance.now() - slotsStart);

      if (!input.fetchMeta) {
        const timings: PerformanceTimings = {
          eventTypeResolutionMs,
          metaFetchMs,
          slotsFetchMs,
          source,
          totalMs: Math.round(performance.now() - actionStart),
        };
        logTimings(timings);

        return {
          ok: true,
          raw: {
            bannerUrl: "",
            eventTypes: null,
            me: null,
            publicDisplayName: "",
            selectedEventType: null,
            slots,
          },
          resolved,
          timings,
        };
      }

      const metaStart = performance.now();
      const [selectedEventType, publicInfo] = await Promise.all([
        getEventTypeById(input.eventTypeId),
        fetchPublicEventInfo(input.target),
      ]);
      metaFetchMs = Math.round(performance.now() - metaStart);

      const timings: PerformanceTimings = {
        eventTypeResolutionMs,
        metaFetchMs,
        slotsFetchMs,
        source,
        totalMs: Math.round(performance.now() - actionStart),
      };
      logTimings(timings);

      return {
        ok: true,
        raw: {
          bannerUrl: getHeaderBannerUrl(input.target, publicInfo),
          eventTypes: [selectedEventType],
          me: buildMePayload(input.target, selectedEventType),
          publicDisplayName: publicInfo.displayName,
          selectedEventType,
          slots,
        },
        resolved,
        timings,
      };
    }

    const etStart = performance.now();
    const selectedEventType = await resolveEventType(input.target);
    eventTypeResolutionMs = Math.round(performance.now() - etStart);

    if (!selectedEventType) {
      const timings: PerformanceTimings = {
        eventTypeResolutionMs,
        metaFetchMs,
        slotsFetchMs,
        source,
        totalMs: Math.round(performance.now() - actionStart),
      };
      logTimings(timings);

      return {
        error: "No event type found for the provided target.",
        errorCode: "NOT_FOUND",
        ok: false,
        timings,
      };
    }

    if (selectedEventType.hidden) {
      const timings: PerformanceTimings = {
        eventTypeResolutionMs,
        metaFetchMs,
        slotsFetchMs,
        source,
        totalMs: Math.round(performance.now() - actionStart),
      };
      logTimings(timings);

      return {
        error:
          "This event type is currently unpublished and not accepting bookings.",
        errorCode: "UNPUBLISHED",
        ok: false,
        timings,
      };
    }

    const resolved = buildResolvedEventType(input.target, selectedEventType);

    const slotsStart = performance.now();
    const [slots, publicInfo] = await Promise.all([
      fetchSlotsForEventType(input, resolved),
      fetchPublicEventInfo(input.target),
    ]);
    slotsFetchMs = Math.round(performance.now() - slotsStart);
    metaFetchMs = slotsFetchMs;

    const timings: PerformanceTimings = {
      eventTypeResolutionMs,
      metaFetchMs,
      slotsFetchMs,
      source,
      totalMs: Math.round(performance.now() - actionStart),
    };
    logTimings(timings);

    return {
      ok: true,
      raw: {
        bannerUrl: getHeaderBannerUrl(input.target, publicInfo),
        eventTypes: [selectedEventType],
        me: buildMePayload(input.target, selectedEventType),
        publicDisplayName: publicInfo.displayName,
        selectedEventType,
        slots,
      },
      resolved,
      timings,
    };
  } catch (error) {
    const timings: PerformanceTimings = {
      eventTypeResolutionMs,
      metaFetchMs,
      slotsFetchMs,
      source,
      totalMs: Math.round(performance.now() - actionStart),
    };
    logTimings(timings);

    if (error instanceof CalApiError) {
      return {
        error: error.message,
        errorCode: error.code,
        ok: false,
        timings,
      };
    }
    return {
      error:
        error instanceof Error ? error.message : "Could not load booker data.",
      ok: false,
      timings,
    };
  }
}
