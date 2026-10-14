"use client";

import {
  describeRRule,
  formatEventWhen,
  formatInstant,
  Kloq,
  nextOccurrence,
  parseInstant,
  RRuleBuilder,
  useIsClient,
  useKloqStore,
} from "kloq";
import { useState, useSyncExternalStore } from "react";
import { SegmentedControl, SegmentedControlItem } from "@/components/calendar/ui/segmented-control";
import { Bar } from "../parts";
import { SERIES } from "./data";

const MASTERS = SERIES.filter((e) => e.rrule).map((e) => e.id);

function SeriesPanel() {
  const store = useKloqStore();
  const events = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const isClient = useIsClient();
  const [selectedId, setSelectedId] = useState(MASTERS[0]);

  const masters = MASTERS.map((id) => events.find((e) => e.id === id)).filter(
    (e) => e !== undefined,
  );
  const selected = masters.find((e) => e.id === selectedId);
  const now = isClient ? new Date() : null;
  const next = selected && now ? nextOccurrence(selected, formatInstant(now)) : null;

  return (
    <>
      <Bar>
        <SegmentedControl
          fill
          size="sm"
          className="max-w-80"
          aria-label="Series"
          value={selectedId}
          onValueChange={setSelectedId}
        >
          {masters.map((e) => (
            <SegmentedControlItem key={e.id} value={e.id}>
              {e.title}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        {selected ? (
          <RRuleBuilder
            value={selected.rrule}
            date={new Date(parseInstant(selected.start))}
            onChange={(rule) => store.update(selected.id, { rrule: rule })}
            className="w-72 max-w-full"
          />
        ) : null}
      </Bar>
      {selected ? (
        <Bar className="gap-y-1">
          <span className="text-foreground">
            {selected.rrule ? describeRRule(selected.rrule) : "Does not repeat"}
          </span>
          <span className="min-w-0 wrap-anywhere">{selected.rrule ?? "—"}</span>
          <span className="tabular-nums">
            next ·{" "}
            {next && now
              ? formatEventWhen({ ...selected, start: next.start, end: next.end }, now)
              : "—"}
          </span>
        </Bar>
      ) : null}
    </>
  );
}

export default function RecurringEventsExample() {
  return (
    <div className="@container flex flex-col">
      <div className="h-136">
        <Kloq defaultEvents={SERIES} persistence={false} designMode={false} storage={false}>
          <SeriesPanel />
          <Kloq.Toolbar />
        </Kloq>
      </div>
    </div>
  );
}
