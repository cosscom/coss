import "server-only";

import { calApi } from "./client";

const SLOTS_API_VERSION = "2024-09-04";

export async function getAvailableSlots(params: {
  start: string;
  end: string;
  timeZone: string;
  username?: string;
  eventTypeSlug?: string;
  eventTypeId?: number;
}): Promise<unknown> {
  return calApi<unknown>("/slots", {
    apiVersion: SLOTS_API_VERSION,
    next: {
      revalidate: 60,
      tags: [
        "slots",
        params.eventTypeId?.toString() ??
          `${params.username}-${params.eventTypeSlug}`,
        params.start,
      ],
    },
    query: {
      end: params.end,
      eventTypeId: params.eventTypeId,
      eventTypeSlug: params.eventTypeSlug,
      start: params.start,
      timeZone: params.timeZone,
      username: params.username,
    },
  });
}
