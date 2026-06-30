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
import { getPublicEventBannerUrl } from "@/lib/cal-api/public-event";
import { getAvailableSlots } from "@/lib/cal-api/slots";
import type { EventType } from "@/lib/cal-api/types";

type FetchRawBookerInput = {
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

type FetchRawBookerResult =
  | {
      ok: true;
      raw: {
        me: unknown;
        eventTypes: unknown;
        selectedEventType: unknown | null;
        bannerUrl: string;
        slots: unknown;
      };
      resolved: ResolvedEventType;
    }
  | {
      ok: false;
      error: string;
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

async function fetchHeaderBannerUrl(target: BookerTarget): Promise<string> {
  const params = getPublicEventBannerParamsFromTarget(target);
  if (!params) {
    return "";
  }

  return getPublicEventBannerUrl(params);
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
            selectedEventType: null,
            slots,
          },
          resolved,
        };
      }

      const [selectedEventType, bannerUrl] = await Promise.all([
        getEventTypeById(input.eventTypeId),
        fetchHeaderBannerUrl(input.target),
      ]);

      return {
        ok: true,
        raw: {
          bannerUrl,
          eventTypes: [selectedEventType],
          me: buildMePayload(input.target, selectedEventType),
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
        ok: false,
      };
    }

    const resolved = buildResolvedEventType(input.target, selectedEventType);
    const [slots, bannerUrl] = await Promise.all([
      fetchSlotsForEventType(input, resolved),
      fetchHeaderBannerUrl(input.target),
    ]);

    return {
      ok: true,
      raw: {
        bannerUrl,
        eventTypes: [selectedEventType],
        me: buildMePayload(input.target, selectedEventType),
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
