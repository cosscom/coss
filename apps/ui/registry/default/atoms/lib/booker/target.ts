export type BookerTarget =
  | {
      type: "user";
      username: string;
      eventSlug: string;
      orgId?: number;
    }
  | {
      type: "team";
      teamId: number;
      eventSlug: string;
      orgId?: number;
    }
  | {
      type: "link";
      bookingUrl: string;
      orgId?: number;
    };

export type LegacyBookerTargetInput = {
  username?: string | string[];
  eventSlug?: string;
  isTeamEvent?: boolean;
  teamId?: number;
  bookingUrl?: string;
  orgId?: number;
};

export type ParsedLinkTarget =
  | {
      type: "user";
      username: string;
      eventSlug: string;
      orgId?: number;
      orgSlug?: string;
    }
  | {
      type: "teamSlug";
      teamSlug: string;
      eventSlug: string;
      orgId?: number;
      orgSlug?: string;
    };

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function toUrl(value: string): URL {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Pass a non-empty bookingUrl.");
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return new URL(trimmed);
  }

  return new URL(`https://${trimmed}`);
}

function parseOrgSlugFromHostname(hostname: string): string | undefined {
  const match = hostname.match(/^([a-z0-9-]+)\.cal\.com$/i);
  const subdomain = match?.[1]?.toLowerCase();

  if (!subdomain) {
    return undefined;
  }

  if (["api", "app", "cal", "www"].includes(subdomain)) {
    return undefined;
  }

  return subdomain;
}

export function parseBookingUrlTarget(
  bookingUrl: string,
  fallbackOrgId?: number,
): ParsedLinkTarget {
  const url = toUrl(bookingUrl);
  const parts = url.pathname.split("/").filter(Boolean);
  const orgId =
    parsePositiveInt(url.searchParams.get("orgId")) ?? fallbackOrgId;
  const orgSlug = parseOrgSlugFromHostname(url.hostname);

  if (parts.length < 2) {
    throw new Error(
      "bookingUrl must include at least username/team and eventSlug.",
    );
  }

  if (parts[0] === "team" && parts.length >= 3) {
    return {
      eventSlug: decodeURIComponent(parts[2] ?? ""),
      orgId,
      orgSlug,
      teamSlug: decodeURIComponent(parts[1] ?? ""),
      type: "teamSlug",
    };
  }

  return {
    eventSlug: decodeURIComponent(parts[1] ?? ""),
    orgId,
    orgSlug,
    type: "user",
    username: decodeURIComponent(parts[0] ?? ""),
  };
}

export function normalizeLegacyTarget(
  props: LegacyBookerTargetInput,
): BookerTarget {
  if (props.bookingUrl) {
    return { bookingUrl: props.bookingUrl, orgId: props.orgId, type: "link" };
  }

  if (props.isTeamEvent) {
    if (!props.teamId || !props.eventSlug) {
      throw new Error(
        "For team events, pass teamId and eventSlug in target or legacy props.",
      );
    }

    return {
      eventSlug: props.eventSlug,
      orgId: props.orgId,
      teamId: props.teamId,
      type: "team",
    };
  }

  const username = Array.isArray(props.username)
    ? props.username.join("+")
    : props.username;
  if (!username || !props.eventSlug) {
    throw new Error("Pass target or username + eventSlug.");
  }

  return {
    eventSlug: props.eventSlug,
    orgId: props.orgId,
    type: "user",
    username,
  };
}
