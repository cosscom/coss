"use client";

import { Slider, SliderValue } from "@coss/ui/components/slider";
import { Switch } from "@coss/ui/components/switch";
import { cn } from "@coss/ui/lib/utils";
import { buildSeedEvents, Kloq, type KloqChange } from "kloq";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { Label } from "@/components/calendar/ui/label";
import { Bar, Dot } from "../parts";
import { FakeServer } from "./data";

const idsOf = (change: KloqChange): string[] => {
  switch (change.type) {
    case "add":
      return [change.event.id];
    case "update":
      return [change.id];
    case "batch":
      return change.changes.flatMap(idsOf);
    default:
      return [];
  }
};

export default function ServerSyncExample() {
  const root = useRef<HTMLDivElement>(null);
  const latencyLabel = useId();
  const [server] = useState(() => new FakeServer());
  const [seeds] = useState(() => buildSeedEvents());
  const { latency, reject, inFlight, log } = useSyncExternalStore(
    server.subscribe,
    server.getState,
    server.getState,
  );

  // every block renders `data-cal-event="<id>"`; kloq.css pulses the ones carrying `data-syncing`
  const markSyncing = (ids: string[], on: boolean) => {
    for (const id of ids)
      for (const el of root.current?.querySelectorAll(`[data-cal-event="${CSS.escape(id)}"]`) ?? [])
        el.toggleAttribute("data-syncing", on);
  };

  const onCommit = (change: KloqChange) => {
    const ids = idsOf(change);
    markSyncing(ids, true);
    return server.commit(change).finally(() => markSyncing(ids, false));
  };

  return (
    <div ref={root} className="@container flex flex-col">
      <Bar>
        <div className="w-44">
          <Slider
            aria-labelledby={latencyLabel}
            min={0}
            max={2000}
            step={100}
            value={latency}
            onValueChange={(v) => server.setLatency(v as number)}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label size="sm" id={latencyLabel} render={<span />}>
                Latency
              </Label>
              <SliderValue className="font-mono text-xs text-foreground tabular-nums">
                {(_, values) => `${values[0]} ms`}
              </SliderValue>
            </div>
          </Slider>
        </div>
        <Label size="sm">
          Reject writes
          <Switch checked={reject} onCheckedChange={(on) => server.setReject(on)} />
        </Label>
        <span role="status" className="ms-auto inline-flex items-center gap-2 tabular-nums">
          <Dot live={inFlight > 0} />
          {inFlight > 0 ? `syncing ${inFlight}…` : "idle"}
        </span>
      </Bar>

      <div className="h-104">
        <Kloq
          defaultEvents={seeds}
          onCommit={onCommit}
          persistence={false}
          storage={false}
          designMode={false}
        >
          <Kloq.Toolbar />
        </Kloq>
      </div>

      <Bar
        edge="top"
        role="log"
        aria-label="Commits"
        className="min-h-24 flex-col items-start gap-y-1 tabular-nums"
      >
        {log.length === 0 && (
          <p>no commits yet — drag an event, then flip the switch and drag again</p>
        )}
        {log.map((entry) => (
          <p key={entry.id} className="flex gap-3">
            <span>#{entry.id}</span>
            <span className="text-foreground">{entry.label}</span>
            <span className={cn(!entry.ok && "text-destructive-foreground")}>
              {entry.ok ? "ok" : "rejected → reverted"}
            </span>
          </p>
        ))}
      </Bar>
    </div>
  );
}
