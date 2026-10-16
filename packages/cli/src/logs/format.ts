import type { Log } from "coss";
import type { Output, Style } from "../output.ts";

const LEVEL_STYLE: Record<Log["level"], Style> = { info: "dim", warning: "yellow", error: "red" };

function time(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toISOString().slice(11, 23);
}

/** One line per log line: time, level, type and its message (requests: method, path, status). */
export function formatLog(out: Output, line: Log): string {
  const level = out.style(LEVEL_STYLE[line.level], line.level.padEnd(7));
  const type = out.style("cyan", line.type);
  const status =
    line.status_code === null
      ? ""
      : ` ${out.style(line.status_code >= 500 ? "red" : line.status_code >= 400 ? "yellow" : "green", String(line.status_code))}`;
  const summary =
    line.source === "api" && line.method && line.path
      ? `${line.method} ${line.path}${status}${line.duration_ms === null ? "" : out.style("dim", ` ${line.duration_ms}ms`)}`
      : line.message;
  return `${out.style("dim", time(line.occurred_at))} ${level} ${type} ${summary}`;
}
