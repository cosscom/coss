import "server-only";

/**
 * Experimental: fetch slots via cal.com's public tRPC `getSchedule` endpoint
 * instead of API v2 `/slots`. The response is normalized so `extractSlotsByDate`
 * can consume it identically.
 *
 * Enable by setting `SLOTS_SOURCE=trpc` in the environment.
 */

function getTrpcConfig(): { baseUrl: string } {
  return {
    baseUrl: process.env.CAL_TRPC_URL ?? "https://app.cal.com",
  };
}

type TrpcSlotsParams = {
  start: string;
  end: string;
  timeZone: string;
  username?: string;
  usernames?: string[];
  eventTypeSlug?: string;
  eventTypeId?: number;
  organizationSlug?: string;
  duration?: number;
};

export async function getScheduleViaTrpc(
  params: TrpcSlotsParams,
): Promise<unknown> {
  const { baseUrl } = getTrpcConfig();

  const trpcInput: Record<string, unknown> = {
    startTime: params.start,
    endTime: params.end,
  };

  if (params.timeZone) {
    trpcInput.timeZone = params.timeZone;
  }
  if (params.eventTypeId != null) {
    trpcInput.eventTypeId = params.eventTypeId;
  }
  if (params.eventTypeSlug) {
    trpcInput.eventTypeSlug = params.eventTypeSlug;
  }
  if (params.usernames && params.usernames.length > 0) {
    trpcInput.usernameList = params.usernames;
  } else if (params.username) {
    trpcInput.usernameList = [params.username];
  }
  if (params.organizationSlug) {
    trpcInput.orgSlug = params.organizationSlug;
  }
  if (params.duration != null) {
    trpcInput.duration = String(params.duration);
  }

  const encodedInput = encodeURIComponent(JSON.stringify({ json: trpcInput }));
  const url = `${baseUrl}/api/trpc/slots/getSchedule?input=${encodedInput}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `tRPC getSchedule failed (${response.status}): ${text.slice(0, 200)}`,
    );
  }

  const body = (await response.json()) as Record<string, unknown>;

  // tRPC with superjson wraps the result:
  // { result: { data: { json: { slots: { ... } } } } }
  const result = body.result as Record<string, unknown> | undefined;
  const data = result?.data as Record<string, unknown> | undefined;
  const json = data?.json as Record<string, unknown> | undefined;

  if (!json) {
    throw new Error(
      "Unexpected tRPC response shape — missing result.data.json",
    );
  }

  // Return { slots: { "YYYY-MM-DD": [...] } } — same shape the API v2 path
  // returns after `calApi` unwraps `data`.
  return json;
}
