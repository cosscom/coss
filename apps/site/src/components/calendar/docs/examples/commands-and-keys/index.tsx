"use client";

import { Button } from "@coss/ui/components/button";
import { Checkbox } from "@coss/ui/components/checkbox";
import { Kbd } from "@coss/ui/components/kbd";
import { cn } from "@coss/ui/lib/utils";
import {
  type CalEvent,
  displayKey,
  expandRecurrence,
  formatDayLabel,
  formatEventWhen,
  formatInstant,
  KEY_ACTIONS,
  Kloq,
  newEventId,
  nextOccurrence,
  parseInstant,
  rangeOfView,
  registerCommands,
  resolveKeymap,
  useKloq,
  useKloqStore,
  writeEventsToClipboard,
} from "kloq";
import { useCallback, useEffect, useState } from "react";
import { Label } from "@/components/calendar/ui/label";
import { Bar, Dot } from "../parts";
import { EVENTS, KEYMAP } from "./data";

const FOCUS_MIN = 90;

/** The first 90-minute gap today, from the next half hour, that no busy event touches. */
function nextFreeSlot(events: CalEvent[], now: Date) {
  const cursor = new Date(now);
  cursor.setMinutes(now.getMinutes() < 30 ? 30 : 60, 0, 0);
  for (let i = 0; i < 30; i++) {
    const start = new Date(cursor.getTime() + i * 30 * 60_000);
    const end = new Date(start.getTime() + FOCUS_MIN * 60_000);
    if (end.getDate() !== now.getDate()) return null;
    const busy = events.some(
      (e) =>
        !e.allDay && e.busy !== false && expandRecurrence(e, { start, end }).occurrences.length > 0,
    );
    if (!busy) return { start: formatInstant(start), end: formatInstant(end) };
  }
  return null;
}

function DomainCommands({
  shade,
  onToggleShade,
  onStatus,
}: {
  shade: boolean;
  onToggleShade: () => void;
  onStatus: (status: string) => void;
}) {
  const store = useKloqStore();
  const k = useKloq();

  useEffect(
    () =>
      registerCommands(
        {
          id: "docs:focus-block",
          label: "Book a focus block",
          keywords: "deep work 90 minutes free slot",
          group: "Focus",
          run: () => {
            const now = new Date();
            const slot = nextFreeSlot(store.getSnapshot(), now);
            if (!slot) return onStatus("no free 90 minutes left today");
            const event: CalEvent = {
              id: newEventId(),
              title: "Focus block",
              color: "emerald",
              ...slot,
            };
            store.add(event);
            if (!k.atToday) k.goToday();
            onStatus(`booked · ${formatEventWhen(event, now)}`);
          },
        },
        {
          id: "docs:next-standup",
          label: "Jump to the next standup",
          keywords: "series occurrence go to",
          group: "Focus",
          run: () => {
            const now = new Date();
            const standup = store.get("standup");
            const next = standup ? nextOccurrence(standup, formatInstant(now)) : null;
            if (!next) return onStatus("no standup ahead");
            const day = new Date(parseInstant(next.start));
            k.goToDate(day);
            onStatus(`next standup · ${formatDayLabel(day, now)}`);
          },
        },
        {
          id: "docs:shade",
          label: "Shade hours outside 9–5",
          keywords: "working hours tint",
          group: "Focus",
          checked: shade,
          run: onToggleShade,
        },
        {
          id: "docs:copy-week",
          label: "Copy this week as ICS",
          keywords: "export calendar file clipboard",
          group: "Focus",
          run: () => {
            const range = rangeOfView(k.view);
            const visible = store
              .getSnapshot()
              .filter((e) => expandRecurrence(e, range).occurrences.length > 0);
            void writeEventsToClipboard(visible).then(() =>
              onStatus(`copied ${visible.length} events — paste into any calendar app`),
            );
          },
        },
      ),
    [store, k, shade, onToggleShade, onStatus],
  );
  return null;
}

function Bindings() {
  const { byAction } = resolveKeymap(KEYMAP);
  return (
    <Bar edge="top" className="gap-y-1.5">
      {KEY_ACTIONS.map((a) => {
        const key = byAction[a.id];
        return (
          <span
            key={a.id}
            className={cn("inline-flex items-center gap-1.5", a.id in KEYMAP && "text-foreground")}
          >
            {a.label}
            {key ? <Kbd>{displayKey(key)}</Kbd> : <span>unbound</span>}
          </span>
        );
      })}
    </Bar>
  );
}

const WORKING_HOURS = { start: 9, end: 17 };

export default function CommandsAndKeysExample() {
  const [shade, setShade] = useState(true);
  const [global, setGlobal] = useState(false);
  const [bindings, setBindings] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const toggleShade = useCallback(() => setShade((s) => !s), []);

  return (
    <div className="@container flex flex-col">
      <Bar>
        <span className="inline-flex items-center gap-1.5">
          press <Kbd>⌘K</Kbd> · try <span className="text-foreground">“focus”</span>
        </span>
        <span className="hidden items-center gap-1 @lg:inline-flex">
          <Kbd>G</Kbd> today <Kbd>H</Kbd> <Kbd>L</Kbd> range <Kbd>?</Kbd> sheet
        </span>
        <span role="status" className="inline-flex items-center gap-2">
          {status ? (
            <>
              <Dot className="bg-brand" />
              {status}
            </>
          ) : (
            "click inside the calendar first — keys are scoped to it"
          )}
        </span>
        <div className="ms-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          <Label size="sm">
            <Checkbox checked={global} onCheckedChange={setGlobal} />
            ⌘K from anywhere
          </Label>
          <Button
            variant="outline"
            size="xs"
            aria-expanded={bindings}
            onClick={() => setBindings((b) => !b)}
          >
            Bindings
          </Button>
        </div>
      </Bar>

      <div className="h-136">
        <Kloq
          defaultEvents={EVENTS}
          keymap={KEYMAP}
          onCustomizeKeybinds={() => setBindings(true)}
          globalShortcuts={global}
          workingHours={shade ? WORKING_HOURS : false}
          persistence={false}
          designMode={false}
          storage={false}
        >
          <Kloq.Toolbar />
          <DomainCommands shade={shade} onToggleShade={toggleShade} onStatus={setStatus} />
        </Kloq>
      </div>

      {bindings ? <Bindings /> : null}
    </div>
  );
}
