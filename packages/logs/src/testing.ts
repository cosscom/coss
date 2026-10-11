/** Test helpers for code that writes logs. */
import type { LogEntryInput } from "./entries.ts";
import type { LogWriter } from "./writer.ts";

/** A writer that keeps lines in memory (`entries`) instead of inserting them. */
export function memoryLogWriter(): LogWriter & { entries: LogEntryInput[] } {
  const entries: LogEntryInput[] = [];
  return {
    entries,
    write(entry) {
      entries.push(entry);
    },
    flush: async () => {},
    close: async () => {},
  };
}
