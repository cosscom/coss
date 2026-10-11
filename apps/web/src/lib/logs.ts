import "server-only";
import type { LogFilters } from "@coss/logs/query";
import { LOG_RANGE_PRESETS, type LogRangePreset, parseLogQuery } from "@coss/logs/query";
import { MAX_LOG_RANGE_MS } from "@coss/logs/schemas";
import { getEnvironment } from "@coss/tenancy";
import { notFound } from "next/navigation";
import { requireOrgMember } from "@/lib/session";

export const DEFAULT_LOG_RANGE: LogRangePreset = "1h";

/** What a logs URL selects: `?q=<search>&range=1h` or `?q=…&from=…&to=…`. */
export type LogView = {
  q: string;
  filters: LogFilters;
  /** Set for relative ranges (which end now); `null` for an absolute `from`/`to`. */
  preset: LogRangePreset | null;
  from: Date;
  to: Date;
};

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Reads a logs URL. Invalid or too-long absolute ranges fall back to the default preset. */
export function logViewFrom(search: SearchParams | URLSearchParams, now = new Date()): LogView {
  const get = (name: string) =>
    search instanceof URLSearchParams ? (search.get(name) ?? undefined) : single(search[name]);
  const q = get("q") ?? "";
  const filters = parseLogQuery(q);
  const from = parseDate(get("from"));
  const to = parseDate(get("to"));
  if (from && to && from < to && to.getTime() - from.getTime() <= MAX_LOG_RANGE_MS) {
    return { q, filters, preset: null, from, to };
  }
  const preset =
    LOG_RANGE_PRESETS.find((candidate) => candidate.id === get("range")) ??
    LOG_RANGE_PRESETS.find((candidate) => candidate.id === DEFAULT_LOG_RANGE);
  const ms = preset?.ms ?? 3_600_000;
  return {
    q,
    filters,
    preset: preset?.id ?? DEFAULT_LOG_RANGE,
    from: new Date(now.getTime() - ms),
    to: now,
  };
}

/**
 * The environment whose logs a page or route handler serves, for members who may read logs.
 * Anyone else gets a 404, like every other environment page.
 */
export async function requireLogsAccess(params: {
  orgSlug: string;
  projectSlug: string;
  envSlug: string;
}) {
  const context = await requireOrgMember(params.orgSlug);
  if (!context.can({ log: ["read"] })) notFound();
  const found = await getEnvironment({
    organizationId: context.organization.id,
    projectSlug: params.projectSlug,
    envSlug: params.envSlug,
  });
  if (!found) notFound();
  return {
    ...context,
    project: found.project,
    environment: found.environment,
    scope: { organizationId: context.organization.id, environmentId: found.environment.id },
  };
}
