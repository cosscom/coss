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
import type { EventType } from "@/lib/cal-api/types";

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
    }
  | {
      ok: false;
      error: string;
      errorCode?: string;
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

async function fetchSlotsForEventType(
  input: FetchRawBookerInput,
  resolved: ResolvedEventType,
): Promise<unknown> {
  const monthsToFetch = Math.max(1, Math.floor(input.monthsToFetch ?? 1));
  const { end, start } = buildSlotRange(input.monthIso, monthsToFetch);
  const duration = input.durationMinutes;
  const organizationSlug = getOrgSlugFromTarget(input.target);
  const userSlotParams = getUserSlotParamsFromTarget(input.target);

  if (resolved.dynamic) {
    return getAvailableSlots({
      duration,
      end,
      organizationSlug: resolved.dynamic.orgSlug,
      start,
      timeZone: input.timeZone,
      usernames: resolved.dynamic.usernames,
    });
  }

  // Org-hosted user events (e.g. i.cal.com/pasquale/15min) need organizationSlug
  // on the slots request; username + slug alone resolve a different availability.
  if (organizationSlug && userSlotParams) {
    return getAvailableSlots({
      duration,
      end,
      eventTypeSlug: userSlotParams.eventTypeSlug,
      organizationSlug,
      start,
      timeZone: input.timeZone,
      username: userSlotParams.username,
    });
  }

  if (resolved.eventTypeId != null) {
    return getAvailableSlots({
      duration,
      end,
      eventTypeId: resolved.eventTypeId,
      organizationSlug,
      start,
      timeZone: input.timeZone,
    });
  }

  const eventTypeSlug = resolved.eventTypeSlug;
  if (!eventTypeSlug) {
    throw new CalApiError(
      "Missing event type slug for slot lookup.",
      "MISSING_SLUG",
      400,
    );
  }

  return getAvailableSlots({
    duration,
    end,
    eventTypeSlug,
    organizationSlug,
    start,
    timeZone: input.timeZone,
    username: userSlotParams?.username,
  });
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

export async function fetchRawBookerDataAction(
  input: FetchRawBookerInput,
): Promise<FetchRawBookerResult> {
  try {
    if (input.eventTypeId != null) {
      const resolved: ResolvedEventType = {
        eventTypeId: input.eventTypeId,
        eventTypeSlug: null,
      };
      const slots = await fetchSlotsForEventType(input, resolved);

      if (!input.fetchMeta) {
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
        };
      }

      const [selectedEventType, publicInfo] = await Promise.all([
        getEventTypeById(input.eventTypeId),
        fetchPublicEventInfo(input.target),
      ]);

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
      };
    }

    const selectedEventType = await resolveEventType(input.target);

    if (!selectedEventType) {
      return {
        error: "No event type found for the provided target.",
        errorCode: "NOT_FOUND",
        ok: false,
      };
    }

    if (selectedEventType.hidden) {
      return {
        error:
          "This event type is currently unpublished and not accepting bookings.",
        errorCode: "UNPUBLISHED",
        ok: false,
      };
    }

    const resolved = buildResolvedEventType(input.target, selectedEventType);
    const [slots, publicInfo] = await Promise.all([
      fetchSlotsForEventType(input, resolved),
      fetchPublicEventInfo(input.target),
    ]);

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
    };
  } catch (error) {
    if (error instanceof CalApiError) {
      return {
        error: error.message,
        errorCode: error.code,
        ok: false,
      };
    }
    return {
      error:
        error instanceof Error ? error.message : "Could not load booker data.",
      ok: false,
    };
  }
}
