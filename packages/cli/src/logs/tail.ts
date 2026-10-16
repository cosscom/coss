/**
 * Following the environment log with plain `GET /v1/logs` reads, as the dashboard's live mode
 * does: every poll re-reads a window reaching a minute before the newest line seen (request lines
 * are written a moment after the response, and provider events can land with earlier times), and
 * prints only the lines it hasn't printed, oldest first.
 */
import type { Coss, CossError, ListLogsParams, Log } from "coss";

/** How far before the newest line seen each poll looks again. */
export const OVERLAP_MS = 60_000;
export const PAGE_SIZE = 100;
/** Pages one poll reads at most; beyond that the environment is too busy to follow unfiltered. */
export const MAX_PAGES = 10;
const MAX_SEEN = 5000;

export type LogFilters = Omit<ListLogsParams, "from" | "to" | "limit" | "after">;

function byTime(a: Log, b: Log): number {
  return a.occurred_at < b.occurred_at
    ? -1
    : a.occurred_at > b.occurred_at
      ? 1
      : a.id < b.id
        ? -1
        : 1;
}

export class LogTail {
  readonly #seen = new Set<string>();
  #newest: number;

  constructor(start: Date) {
    this.#newest = start.getTime();
  }

  /** Where the next read starts. */
  windowStart(): Date {
    return new Date(this.#newest - OVERLAP_MS);
  }

  has(id: string): boolean {
    return this.#seen.has(id);
  }

  /** The lines not seen before, oldest first; remembers them. */
  take(lines: readonly Log[]): Log[] {
    const fresh = lines.filter((line) => !this.#seen.has(line.id)).sort(byTime);
    for (const line of fresh) {
      this.#seen.add(line.id);
      this.#newest = Math.max(this.#newest, Date.parse(line.occurred_at));
    }
    // Sets iterate in insertion order: the oldest ids go first.
    for (const id of this.#seen) {
      if (this.#seen.size <= MAX_SEEN) break;
      this.#seen.delete(id);
    }
    return fresh;
  }
}

/**
 * Every line from `from` on (newest first, paged with `after`), stopping early once a page holds
 * nothing new. `truncated` when the window had more than `MAX_PAGES` pages.
 */
export async function readWindow(
  coss: Coss,
  filters: LogFilters,
  from: Date,
  isSeen: (line: Log) => boolean,
  signal?: AbortSignal,
): Promise<{ lines: Log[]; truncated: boolean; error: CossError | null }> {
  const lines: Log[] = [];
  let after: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await coss.logs.list(
      { ...filters, from, limit: PAGE_SIZE, ...(after && { after }) },
      { signal },
    );
    if (error) return { lines, truncated: false, error };
    lines.push(...data.data);
    const last = data.data.at(-1);
    if (!data.has_more || !last || data.data.every(isSeen))
      return { lines, truncated: false, error: null };
    after = last.id;
  }
  return { lines, truncated: true, error: null };
}

const UNITS: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** `--since`: `30s`, `15m`, `2h`, `1d`, or an ISO 8601 time. `null` when unreadable. */
export function parseSince(value: string, now: Date): Date | null {
  const match = /^(\d+)\s*([smhd])$/.exec(value.trim());
  if (match) return new Date(now.getTime() - Number(match[1]) * (UNITS[match[2] ?? "s"] ?? 1000));
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time);
}
