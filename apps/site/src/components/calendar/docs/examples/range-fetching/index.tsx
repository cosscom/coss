"use client";

import { type CalEvent, Kloq } from "kloq";
import { useCallback, useRef, useState } from "react";
import { Bar, Dot } from "../parts";
import { EventServer } from "./data";

interface Request {
  id: number;
  start: Date;
  end: Date;
  /** null while in flight */
  count: number | null;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
// `end` is exclusive — midnight after the last day — so the label shows the day before it
const span = (r: Request) => `${day(r.start)} – ${day(new Date(r.end.getTime() - 1))}`;

const mergeById = (loaded: CalEvent[], page: CalEvent[]) => {
  const byId = new Map(loaded.map((e) => [e.id, e]));
  for (const e of page) byId.set(e.id, e);
  return [...byId.values()];
};

export default function RangeFetchingExample() {
  const [server] = useState(() => new EventServer(new Date()));
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);

  const last = useRef("");
  const seq = useRef(0);
  const onRangeChange = useCallback(
    (start: Date, end: Date) => {
      const key = `${start.getTime()}:${end.getTime()}`;
      if (key === last.current) return; // React StrictMode replays the mount call in development
      last.current = key;
      const id = ++seq.current;
      setRequests((rs) => [{ id, start, end, count: null }, ...rs]);
      void server.fetchRange(start, end).then((page) => {
        setEvents((loaded) => mergeById(loaded, page));
        setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, count: page.length } : r)));
      });
    },
    [server],
  );

  const onEventsChange = (next: CalEvent[]) => {
    server.sync(events, next);
    setEvents(next);
  };

  const inFlight = requests.some((r) => r.count === null);
  const latest = requests.find((r) => r.count !== null);

  return (
    <div className="@container flex flex-col">
      <div className="h-104">
        <Kloq
          events={events}
          onEventsChange={onEventsChange}
          onRangeChange={onRangeChange}
          rangePadding={7}
          storage={false}
          designMode={false}
        >
          <Kloq.Toolbar />
        </Kloq>
      </div>

      <Bar edge="top" className="min-h-28 flex-col items-start gap-y-1 tabular-nums">
        <p role="status" className="flex items-center gap-2 text-foreground">
          <Dot live={inFlight} />
          {latest
            ? `fetched ${span(latest)} · ${events.length} of ${server.size} events loaded · ${plural(requests.length, "request")}`
            : "fetching…"}
        </p>
        {requests.slice(0, 3).map((r) => (
          <p key={r.id} className="flex gap-3">
            <span>#{r.id}</span>
            <span>{span(r)}</span>
            <span>{r.count === null ? "…" : plural(r.count, "event")}</span>
          </p>
        ))}
      </Bar>
    </div>
  );
}
