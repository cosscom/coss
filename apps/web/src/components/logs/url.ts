import { formatLogQuery, type LogFilters, parseLogQuery } from "@coss/logs/query";

/** The URL state of the explorer. A `preset` range ends now; otherwise `from`/`to` are fixed. */
export type ExplorerView = {
  q: string;
  preset: string | null;
  from: string;
  to: string;
};

export type ListField =
  | "levels"
  | "sources"
  | "statuses"
  | "methods"
  | "routes"
  | "apiKeyIds"
  | "types";

/** The view's query string (`log` opens a line in the drawer). */
export function viewSearch(view: ExplorerView, extra: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams();
  if (view.q.trim()) params.set("q", view.q.trim());
  if (view.preset) params.set("range", view.preset);
  else {
    params.set("from", view.from);
    params.set("to", view.to);
  }
  for (const [name, value] of Object.entries(extra)) if (value) params.set(name, value);
  return params.toString();
}

/** Adds `value` to a list filter of `q`, or removes it when present. */
export function toggleFilter(q: string, field: ListField, value: string): string {
  const filters = parseLogQuery(q);
  const current = (filters[field] as string[] | undefined) ?? [];
  const next = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
  return formatLogQuery({ ...filters, [field]: next.length > 0 ? next : undefined });
}

/** Replaces one filter of `q`. */
export function setFilter<K extends keyof LogFilters>(q: string, field: K, value: LogFilters[K]) {
  return formatLogQuery({ ...parseLogQuery(q), [field]: value });
}

/** Removes every list filter of a field. */
export function clearFilter(q: string, field: ListField): string {
  return formatLogQuery({ ...parseLogQuery(q), [field]: undefined });
}
