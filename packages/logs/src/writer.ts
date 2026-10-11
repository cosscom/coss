import { db, type Executor } from "@coss/db";
import { appendLogEntries, type LogEntryInput } from "./entries.ts";

/**
 * Buffers lines written off the request path (API requests) and inserts them in batches.
 * **Fails open**: a failed insert is logged and its batch dropped; a full buffer drops the oldest
 * lines. Logging must never slow down or fail what it logs.
 */
export type LogWriter = {
  write(entry: LogEntryInput): void;
  /** Inserts everything buffered so far. */
  flush(): Promise<void>;
  /** Flushes and stops the timer (SIGTERM). */
  close(): Promise<void>;
};

export type LogWriterOptions = {
  executor?: Executor;
  /** Lines per INSERT (default 500). */
  maxBatch?: number;
  /** How long a line may wait (default 1 s). */
  flushMs?: number;
  /** Lines kept while the database is slow or down (default 10,000). */
  maxBuffer?: number;
  onError?: (error: unknown, dropped: number) => void;
};

export function createLogWriter(options: LogWriterOptions = {}): LogWriter {
  const executor = options.executor ?? db;
  const maxBatch = options.maxBatch ?? 500;
  const flushMs = options.flushMs ?? 1000;
  const maxBuffer = options.maxBuffer ?? 10_000;
  const onError =
    options.onError ??
    ((error: unknown, dropped: number) =>
      console.error(`[logs] dropped ${dropped} log lines:`, error));

  let buffer: LogEntryInput[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let flushing: Promise<void> = Promise.resolve();
  let closed = false;
  let overflow = 0;

  function schedule(): void {
    if (timer !== null || closed) return;
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, flushMs);
    // Never keeps a process alive on its own.
    (timer as { unref?: () => void }).unref?.();
  }

  async function drain(): Promise<void> {
    if (overflow > 0) {
      onError(new Error("log buffer full"), overflow);
      overflow = 0;
    }
    while (buffer.length > 0) {
      const batch = buffer.slice(0, maxBatch);
      buffer = buffer.slice(maxBatch);
      try {
        await appendLogEntries(executor, batch);
      } catch (error) {
        onError(error, batch.length);
      }
    }
  }

  function flush(): Promise<void> {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    flushing = flushing.then(drain);
    return flushing;
  }

  return {
    write(entry) {
      if (closed) return;
      buffer.push(entry);
      if (buffer.length > maxBuffer) {
        buffer.shift();
        overflow++;
      }
      if (buffer.length >= maxBatch) void flush();
      else schedule();
    },
    flush,
    async close() {
      await flush();
      closed = true;
    },
  };
}

/** Writes nothing (the API's default, so `createApp` stays free of side effects). */
export const noopLogWriter: LogWriter = {
  write() {},
  flush: async () => {},
  close: async () => {},
};
