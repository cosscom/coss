"use client";

/**
 * A simulated server for the async demo — implements the package's
 * PersistenceAdapter + onCommit seam with configurable latency and an
 * injectable failure rate, and exposes a NetworkSimHandle so design mode's
 * Network section can drive it live.
 *
 * No network involved: an in-memory copy plus artificial round-trips, so
 * the demo still deploys static while exercising the exact async paths a
 * real backend consumer hits.
 */

import type { CalEvent, KloqChange, PersistenceAdapter } from "kloq";
import type { NetworkSimHandle } from "kloq/design-mode";

export class FakeServer {
  /** Off by default: registered from mount, but inert until switched on. */
  private enabled = false;
  private latency = 400;
  private failureRate = 0.25;
  private inFlight = 0;
  private lastResult: "ok" | "fail" | null = null;
  private db: CalEvent[] | null = null;
  private listeners = new Set<() => void>();

  private notify() {
    for (const l of this.listeners) l();
  }

  /** One simulated round-trip; throws on an injected failure. */
  private async roundTrip(canFail: boolean): Promise<void> {
    // Disabled means "behave like a local store": no delay, no failure, and
    // no stat churn — not "a round trip with the knobs at zero".
    if (!this.enabled) return;
    this.inFlight += 1;
    this.notify();
    await new Promise((r) => setTimeout(r, this.latency));
    const failed = canFail && Math.random() < this.failureRate;
    this.inFlight -= 1;
    this.lastResult = failed ? "fail" : "ok";
    this.notify();
    if (failed) throw new Error("simulated network failure");
  }

  /** Uncontrolled-store persistence — async load, sync in-memory save. */
  readonly adapter: PersistenceAdapter = {
    load: async () => {
      // initial load never hard-fails; it just takes a round-trip
      await this.roundTrip(false).catch(() => {});
      return this.db;
    },
    save: (events) => {
      this.db = events;
    },
    clear: () => {
      this.db = null;
    },
  };

  /** The optimistic seam — reject and the calendar reverts with a spring. */
  readonly commit = async (change: KloqChange): Promise<void> => {
    await this.roundTrip(true);
    if (this.db) this.db = applyChange(this.db, change);
  };

  /** Replace the server's copy — the paged demo's source of truth. */
  seed(events: CalEvent[]) {
    this.db = events;
  }

  /** Events touching `[start, end)`, after one round-trip. */
  async fetchRange(start: Date, end: Date): Promise<CalEvent[]> {
    await this.roundTrip(false).catch(() => {});
    const lo = start.getTime();
    const hi = end.getTime();
    return (this.db ?? []).filter((e) => {
      const s = Date.parse(e.start);
      const f = Date.parse(e.end);
      return s < hi && f > lo;
    });
  }

  /** Design-mode Network section drives these knobs. */
  readonly handle: NetworkSimHandle = {
    getEnabled: () => this.enabled,
    setEnabled: (on) => {
      this.enabled = on;
      // dropping in-flight state on the way out, so the readout doesn't
      // freeze showing a request that will never settle
      if (!on) {
        this.inFlight = 0;
        this.lastResult = null;
      }
      this.notify();
    },
    getLatency: () => this.latency,
    setLatency: (ms) => {
      this.latency = Math.max(0, ms);
      this.notify();
    },
    getFailureRate: () => this.failureRate,
    setFailureRate: (rate) => {
      this.failureRate = Math.max(0, Math.min(1, rate));
      this.notify();
    },
    getInFlight: () => this.inFlight,
    getLastResult: () => this.lastResult,
    subscribe: (l) => {
      this.listeners.add(l);
      return () => this.listeners.delete(l);
    },
  };
}

function applyChange(db: CalEvent[], change: KloqChange): CalEvent[] {
  switch (change.type) {
    case "add":
      return [...db, change.event];
    case "update":
      return db.map((e) => (e.id === change.id ? ({ ...e, ...change.patch } as CalEvent) : e));
    case "remove":
      return db.filter((e) => e.id !== change.event.id);
    case "batch":
      return change.changes.reduce(applyChange, db);
    case "reset":
      return db;
  }
}
