"use client";

import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import {
  type CalEvent,
  eventsToICS,
  expandRecurrence,
  type ICSImportResult,
  Kloq,
  parseICS,
  parseInstant,
  rangeOfView,
  useKloq,
  useKloqStore,
} from "kloq";
import { type DragEvent, useRef, useState } from "react";
import { CodePanes } from "@/components/calendar/site/code-panes";
import { Bar } from "../parts";
import { sampleFeed } from "./data";

// without this the store starts from kloq's sample week
const EMPTY: CalEvent[] = [];

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

type Shown =
  | {
      kind: "import";
      label: string;
      text: string;
      result: ICSImportResult;
      added: number;
      movedTo: string | null;
    }
  | { kind: "export"; label: string; text: string; count: number };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const dayLabel = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

function IcsBar({ onShown }: { onShown: (shown: Shown) => void }) {
  const store = useKloqStore();
  const k = useKloq();
  const file = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  // what the grid is showing right now: "day" in a narrow box, "week" in a wide one
  const span = typeof k.viewSetting === "number" ? `${k.viewSetting} days` : k.viewSetting;
  const inView = (e: CalEvent) => expandRecurrence(e, rangeOfView(k.view)).occurrences.length > 0;

  const importText = (label: string, text: string) => {
    const result = parseICS(text, { color: "amber" });
    // UIDs become ids, so re-importing the same feed is a no-op rather than a duplicate
    const fresh = result.events.filter((e) => !store.get(e.id));
    store.batch(fresh.map((event) => ({ type: "add" as const, event })));
    // an import that lands off-screen looks like nothing happened: go to the first event instead
    const first = result.events.some(inView)
      ? null
      : result.events
          .map((e) => new Date(parseInstant(e.start)))
          .sort((a, b) => a.getTime() - b.getTime())[0];
    if (first) k.goToDate(first);
    onShown({
      kind: "import",
      label,
      text,
      result,
      added: fresh.length,
      movedTo: first ? dayLabel(first) : null,
    });
  };

  const importFile = async (picked: File | undefined) => {
    if (picked) importText(picked.name, await picked.text());
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void importFile(e.dataTransfer.files[0]);
  };

  const exportVisible = () => {
    const visible = store.getSnapshot().filter(inView);
    const text = eventsToICS(visible, { prodId: "kloq-docs" });
    onShown({ kind: "export", label: `visible ${span}`, text, count: visible.length });
    if (visible.length > 0) download(text, "kloq.ics");
  };

  return (
    <Bar
      className={cn("gap-x-2 transition-colors", over && "bg-accent")}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <Button size="xs" variant="outline" onClick={() => importText("sample feed", sampleFeed())}>
        Import sample feed
      </Button>
      <Button size="xs" variant="outline" onClick={() => file.current?.click()}>
        Open your own .ics
      </Button>
      {/* a file picker has no primitive: the button above opens this one */}
      <input
        ref={file}
        type="file"
        accept=".ics,text/calendar"
        aria-label="ICS file"
        hidden
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
      <Button size="xs" variant="outline" onClick={exportVisible}>
        Export visible {span}
      </Button>
      <span>or drop a file on this bar</span>
    </Bar>
  );
}

function Outcome({ shown }: { shown: Shown | null }) {
  if (!shown) return <p>nothing imported yet — the result and the ICS text land here</p>;
  if (shown.kind === "export")
    return shown.count > 0 ? (
      <p>
        <span className="text-success-foreground">✓</span> exported{" "}
        <span className="text-foreground">kloq.ics</span> · {plural(shown.count, "event")} from the{" "}
        {shown.label}
      </p>
    ) : (
      <p>nothing to export — the {shown.label} has no events</p>
    );
  const { result, added, movedTo } = shown;
  return (
    <>
      <p>
        {added > 0 ? <span className="text-success-foreground">✓ </span> : null}
        <span className="text-foreground">{added} added</span> · {result.events.length - added}{" "}
        already there · {result.skipped.length} skipped ·{" "}
        {plural(result.warnings.length, "warning")}
        {movedTo ? ` · showing ${movedTo}, the first of them` : ""}
      </p>
      {[...result.skipped, ...result.warnings].map((n, i) => (
        <p key={i}>
          <span className="text-foreground">{n.what}</span>
          {n.uid ? ` (${n.uid})` : ""} — {n.reason}
        </p>
      ))}
    </>
  );
}

export default function IcsImportExportExample() {
  const [shown, setShown] = useState<Shown | null>(null);

  return (
    <div className="@container flex flex-col">
      <div className="h-136">
        <Kloq defaultEvents={EMPTY} persistence={false} designMode={false} storage={false}>
          <IcsBar onShown={setShown} />
          <Kloq.Toolbar />
        </Kloq>
      </div>

      <Bar edge="top" role="status" className="min-h-24 flex-col items-start gap-y-1">
        <Outcome shown={shown} />
      </Bar>
      {shown?.text ? (
        <div className="max-h-64 overflow-y-auto border-t p-4">
          <CodePanes
            panes={[
              { title: shown.kind === "export" ? "kloq.ics" : shown.label, code: shown.text },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
