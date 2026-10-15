import type { EmailListFilters, EmailObjectOutput } from "@coss/email";

/**
 * The email list's filters as URL parameters, shared by the list page and its CSV export so
 * the export always holds what the list shows. Client-safe (type imports only).
 */
export const EMAIL_STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "scheduled", label: "Scheduled" },
  { value: "queued", label: "Queued" },
  { value: "canceled", label: "Canceled" },
] as const satisfies readonly { value: EmailObjectOutput["status"] | "all"; label: string }[];

export type EmailStatusFilter = (typeof EMAIL_STATUS_FILTERS)[number]["value"];

/** Every parameter is a trimmed string; an empty one (or `status=all`) is no filter. */
export type EmailFilterParams = {
  q: string;
  status: EmailStatusFilter;
  recipient: string;
  /** `name` or `name:value`. */
  tag: string;
  category: string;
  /** The sender's domain (subdomains included). */
  domain: string;
  /** Created on or after this UTC day (`YYYY-MM-DD`). */
  since: string;
  /** Created on or before this UTC day (`YYYY-MM-DD`). */
  until: string;
};

/** The filters besides the search and the status: what the filter popover edits. */
export const EMAIL_DETAIL_FILTERS = [
  "recipient",
  "tag",
  "category",
  "domain",
  "since",
  "until",
] as const satisfies readonly (keyof EmailFilterParams)[];

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function dayStart(day: string): Date | undefined {
  if (!DAY.test(day)) return undefined;
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== day ? undefined : date;
}

/** Reads the parameters; malformed days and unknown statuses are dropped. */
export function emailFilterParams(get: (name: string) => string): EmailFilterParams {
  const status = get("status");
  const since = get("since");
  const until = get("until");
  return {
    q: get("q"),
    status: EMAIL_STATUS_FILTERS.find((filter) => filter.value === status)?.value ?? "all",
    recipient: get("recipient"),
    tag: get("tag"),
    category: get("category"),
    domain: get("domain"),
    since: dayStart(since) ? since : "",
    until: dayStart(until) ? until : "",
  };
}

/** `listEmails` filters for the parameters (an invalid tag or category simply matches nothing). */
export function toEmailListFilters(params: EmailFilterParams): EmailListFilters {
  const separator = params.tag.indexOf(":");
  const until = dayStart(params.until);
  return {
    query: params.q || undefined,
    status: params.status === "all" ? undefined : [params.status],
    recipient: params.recipient || undefined,
    tag: params.tag
      ? separator === -1
        ? { name: params.tag }
        : { name: params.tag.slice(0, separator), value: params.tag.slice(separator + 1) }
      : undefined,
    category: params.category || undefined,
    senderDomain: params.domain || undefined,
    createdAfter: dayStart(params.since),
    // The whole `until` day is included.
    createdBefore: until ? new Date(until.getTime() + 86_400_000) : undefined,
  };
}

export function hasEmailFilters(params: EmailFilterParams): boolean {
  return (
    Boolean(params.q) || params.status !== "all" || EMAIL_DETAIL_FILTERS.some((key) => params[key])
  );
}

/** The parameters for a URL, without the empty ones and `status=all`. */
export function emailFilterQuery(
  params: Partial<EmailFilterParams>,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      value === "" || (key === "status" && value === "all") ? undefined : value,
    ]),
  );
}
