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
    };

export type ParsedLinkTarget =
  | {
      type: "user";
      username: string;
      eventSlug: string;
      orgId?: number;
    }
  | {
      type: "teamSlug";
      teamSlug: string;
      eventSlug: string;
      orgId?: number;
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

export function parseBookingUrlTarget(bookingUrl: string): ParsedLinkTarget {
  const url = toUrl(bookingUrl);
  const parts = url.pathname.split("/").filter(Boolean);
  const orgId = parsePositiveInt(url.searchParams.get("orgId"));

  if (parts.length < 2) {
    throw new Error(
      "bookingUrl must include at least username/team and eventSlug.",
    );
  }

  if (parts[0] === "team" && parts.length >= 3) {
    return {
      eventSlug: decodeURIComponent(parts[2] ?? ""),
      orgId,
      teamSlug: decodeURIComponent(parts[1] ?? ""),
      type: "teamSlug",
    };
  }

  return {
    eventSlug: decodeURIComponent(parts[1] ?? ""),
    orgId,
    type: "user",
    username: decodeURIComponent(parts[0] ?? ""),
  };
}
