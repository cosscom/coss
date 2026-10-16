import type { LogLevel, LogSource } from "coss";
import { list, parseFlags } from "../args.ts";
import { clientFor, createContext, describeEnvironment, resolveCredentials } from "../context.ts";
import { apiError, isTransient, UsageError } from "../errors.ts";
import type { CliIo } from "../io.ts";
import { formatLog } from "../logs/format.ts";
import { type LogFilters, LogTail, parseSince, readWindow } from "../logs/tail.ts";

export const LOGS_TAIL_HELP = `Usage: coss logs tail [options]

Follows the environment's log: API requests made with its keys, email events, webhook attempts and
events \`coss listen\` forwarded. New lines only, unless --since.

Options:
  --source <name>     api, email, webhook, risk, smtp (repeatable, or comma-separated)
  --level <level>     info, warning, error
  --type <type>       e.g. email.bounced, api.request
  --status <code>     API or webhook status codes or classes, e.g. 4xx,503
  -q, --query <text>  Free text: messages, paths, ids, recipients
  --since <time>      Start with earlier lines too: 30s, 15m, 2h, 1d or an ISO 8601 time
  --interval <ms>     How often to poll (default 2000)
  --json              One log object per line
`;

const SOURCES: readonly LogSource[] = ["api", "email", "webhook", "risk", "smtp"];
const LEVELS: readonly LogLevel[] = ["info", "warning", "error"];
const MAX_RANGE_MS = 31 * 86_400_000;

function checked<T extends string>(values: string[], allowed: readonly T[], flag: string): T[] {
  for (const value of values) {
    if (!(allowed as readonly string[]).includes(value)) {
      throw new UsageError(`--${flag} takes ${allowed.join(", ")}; got "${value}".`);
    }
  }
  return values as T[];
}

export async function logsTail(argv: string[], io: CliIo): Promise<number> {
  const { values, global } = parseFlags(argv, {
    source: { type: "string", multiple: true },
    level: { type: "string", multiple: true },
    type: { type: "string", multiple: true },
    status: { type: "string", multiple: true },
    query: { type: "string", short: "q" },
    since: { type: "string" },
    interval: { type: "string" },
  });
  const context = createContext(io, global);
  const { out } = context;
  if (global.help) {
    out.line(LOGS_TAIL_HELP);
    return 0;
  }
  const sources = checked(list(values.source), SOURCES, "source");
  const levels = checked(list(values.level), LEVELS, "level");
  const filters: LogFilters = {
    ...(sources.length > 0 && { source: sources }),
    ...(levels.length > 0 && { level: levels }),
    ...(values.type && { type: list(values.type) }),
    ...(values.status && { status: list(values.status) }),
    ...(values.query && { q: values.query }),
  };
  const intervalMs = values.interval === undefined ? 2000 : Number(values.interval);
  if (!Number.isInteger(intervalMs) || intervalMs < 500) {
    throw new UsageError("--interval takes milliseconds, at least 500.");
  }
  const now = io.now();
  let since: Date | null = null;
  if (values.since !== undefined) {
    since = parseSince(values.since, now);
    if (!since || now.getTime() - since.getTime() > MAX_RANGE_MS) {
      throw new UsageError(
        "--since takes 30s, 15m, 2h, 1d or an ISO time within the last 31 days.",
      );
    }
  }

  const credentials = await resolveCredentials(context);
  const coss = clientFor(io, credentials);
  const { data: environment, error } = await coss.environment.get({ signal: io.signal });
  if (error) throw apiError("Couldn't read the environment", error);
  if (!out.json) {
    out.info(`Tailing the log of ${describeEnvironment(environment)}. Press Ctrl-C to stop.`);
  }

  // Lines from here on are news. Taken after the lookup, whose own request line is older.
  const started = io.now();
  const tail = new LogTail(since ?? started);
  let first = true;
  let warnedTruncated = false;
  let failures = 0;
  while (!io.signal.aborted) {
    const from = first && since ? since : tail.windowStart();
    const window = await readWindow(coss, filters, from, io.signal);
    if (window.error) {
      if (io.signal.aborted) break;
      if (!isTransient(window.error)) throw apiError("Couldn't read the log", window.error);
      failures++;
      if (failures === 1) out.warn(`Couldn't read the log (${window.error.message}); retrying…`);
      await io.sleep(Math.min(intervalMs * 2 ** failures, 30_000), io.signal);
      continue;
    }
    failures = 0;
    const fresh = tail.take(window.lines);
    for (const line of fresh) {
      // Without --since, what was already there when the tail started isn't news (lines that
      // arrive later are, even with an earlier time).
      if (first && !since && Date.parse(line.occurred_at) < started.getTime()) continue;
      if (out.json) out.data(line);
      else out.line(formatLog(out, line));
    }
    if (window.truncated && !warnedTruncated) {
      warnedTruncated = true;
      out.warn(
        "This environment logs more than the tail can follow: some lines were skipped. Filter with --source, --type or -q.",
      );
    }
    first = false;
    await io.sleep(intervalMs, io.signal);
  }
  return 130;
}
