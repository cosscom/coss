import type { CalEvent, CalEventPatch, KloqBatchOp, KloqChange, StoreId } from "./shared.ts";

const applyPatch = (event: CalEvent, patch: CalEventPatch): CalEvent =>
  ({ ...event, ...patch }) as CalEvent;

/** Apply one committed change. `reset` is a no-op here — the caller swaps in the seed list. */
export function reduceEvents(events: readonly CalEvent[], change: KloqChange): CalEvent[] {
  switch (change.type) {
    case "add":
      return events.some((event) => event.id === change.event.id)
        ? events.map((event) => (event.id === change.event.id ? change.event : event))
        : [...events, change.event];
    case "update":
      return events.map((event) =>
        event.id === change.id ? applyPatch(event, change.patch) : event,
      );
    case "remove":
      return events.filter((event) => event.id !== change.event.id);
    case "reset":
      return [...events];
    case "batch":
      return change.changes.reduce<CalEvent[]>((acc, part) => reduceEvents(acc, part), [...events]);
    default: {
      const unreachable: never = change;
      return unreachable;
    }
  }
}

export function changeForAdd(event: CalEvent): KloqChange {
  return { type: "add", event };
}

export function changeForUpdate(
  events: readonly CalEvent[],
  id: StoreId | string,
  patch: CalEventPatch,
): KloqChange | null {
  const prev = events.find((event) => event.id === id);
  if (!prev) return null;
  return { type: "update", id: prev.id, patch, prev };
}

export function changeForRemove(
  events: readonly CalEvent[],
  id: StoreId | string,
): KloqChange | null {
  const event = events.find((item) => item.id === id);
  if (!event) return null;
  return { type: "remove", event };
}

/** Fold a batch op into a change against the list as it stands. */
export function changeForOp(events: readonly CalEvent[], op: KloqBatchOp): KloqChange | null {
  if (op.type === "add") return changeForAdd(op.event);
  if (op.type === "update") return changeForUpdate(events, op.id, op.patch);
  return changeForRemove(events, op.id);
}

export function changeForBatch(
  events: readonly CalEvent[],
  ops: readonly KloqBatchOp[],
): KloqChange {
  const changes: KloqChange[] = [];
  let cursor = [...events];
  for (const op of ops) {
    const change = changeForOp(cursor, op);
    if (!change) continue;
    changes.push(change);
    cursor = reduceEvents(cursor, change);
  }
  return { type: "batch", changes };
}
