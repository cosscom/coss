import "server-only";

import { calApi } from "./client";

const SLOTS_API_VERSION = "2024-09-04";

export async function getAvailableSlots(params: {
  start: string;
  end: string;
  timeZone: string;
  username?: string;
  usernames?: string[];
  eventTypeSlug?: string;
  eventTypeId?: number;
  organizationSlug?: string;
  orgId?: number;
}): Promise<unknown> {
  const cacheIdentity =
    params.eventTypeId?.toString() ??
    params.usernames?.join(",") ??
    `${params.username}-${params.eventTypeSlug ?? "dynamic"}`;

  return calApi<unknown>("/slots", {
    apiVersion: SLOTS_API_VERSION,
    next: {
      revalidate: 60,
      tags: ["slots", cacheIdentity, params.start],
    },
    query: {
      end: params.end,
      eventTypeId: params.eventTypeId,
      eventTypeSlug: params.eventTypeSlug,
      orgId: params.orgId,
      organizationSlug: params.organizationSlug,
      start: params.start,
      timeZone: params.timeZone,
      username: params.username,
      usernames: params.usernames?.join(","),
    },
  });
}
