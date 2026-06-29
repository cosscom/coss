"use server";

import { CalApiError } from "@/lib/cal-api/client";
import { getEventType } from "@/lib/cal-api/event-types";
import type { EventType } from "@/lib/cal-api/types";

export type EventTypeResult =
  | { ok: true; eventType: EventType }
  | { ok: false; error: string };

export async function fetchEventTypeAction(params: {
  username: string;
  eventSlug: string;
}): Promise<EventTypeResult> {
  const { username, eventSlug } = params;

  if (!username) {
    return {
      error: "Pass username to Booker.",
      ok: false,
    };
  }

  if (!eventSlug) {
    return {
      error: "Pass eventSlug to Booker.",
      ok: false,
    };
  }

  try {
    const eventType = await getEventType({ eventSlug, username });

    if (!eventType) {
      return {
        error: `No event type found for ${username}/${eventSlug}.`,
        ok: false,
      };
    }

    return { eventType, ok: true };
  } catch (error) {
    return {
      error:
        error instanceof CalApiError
          ? error.message
          : "Could not load the event type.",
      ok: false,
    };
  }
}
