import type { KloqChange } from "kloq";

export interface CommitEntry {
  id: number;
  label: string;
  ok: boolean;
}

export interface ServerState {
  latency: number;
  reject: boolean;
  inFlight: number;
  log: CommitEntry[];
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** `update seed-design`, `batch ×3` — what one commit is, in the log. */
export function describeChange(change: KloqChange): string {
  switch (change.type) {
    case "add":
      return `add ${change.event.id}`;
    case "update":
      return `update ${change.id}`;
    case "remove":
      return `remove ${change.event.id}`;
    case "batch":
      return `batch ×${change.changes.length}`;
    case "reset":
      return "reset";
  }
}

/** A stand-in for your API: one round-trip per commit, with a latency knob and a reject switch. */
export class FakeServer {
  private state: ServerState = { latency: 600, reject: false, inFlight: 0, log: [] };
  private seq = 0;
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = () => this.state;

  setLatency(latency: number) {
    this.set({ latency });
  }

  setReject(reject: boolean) {
    this.set({ reject });
  }

  /** Rejecting is what makes coss calendar revert — the thrown error is the whole protocol. */
  async commit(change: KloqChange): Promise<void> {
    this.set({ inFlight: this.state.inFlight + 1 });
    await sleep(this.state.latency);
    // coss calendar ignores the promise of a reset (nothing to revert to), so a reset never fails
    const ok = change.type === "reset" || !this.state.reject;
    const entry = { id: ++this.seq, label: describeChange(change), ok };
    this.set({ inFlight: this.state.inFlight - 1, log: [entry, ...this.state.log].slice(0, 4) });
    if (!ok) throw new Error(`server rejected ${entry.label}`);
  }

  private set(patch: Partial<ServerState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
}
