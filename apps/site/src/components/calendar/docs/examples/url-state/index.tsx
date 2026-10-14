"use client";

import {
  buildSeedEvents,
  Kloq,
  type KloqView,
  MAX_N_DAY_VIEW,
  MIN_N_DAY_VIEW,
  parseInstant,
  toDateOnlyString,
} from "kloq";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CopyButton } from "@/components/calendar/site/copy-button";
import { Bar } from "../parts";

const NAMED: KloqView[] = ["day", "week", "month", "agenda", "year"];

function parseView(s: string | null): KloqView | null {
  if (NAMED.includes(s as KloqView)) return s as KloqView;
  const n = Number(s);
  return Number.isInteger(n) && n >= MIN_N_DAY_VIEW && n <= MAX_N_DAY_VIEW ? n : null;
}

/** `YYYY-MM-DD` at local midnight; anything else — including a rolled-over 2026-02-31 — is rejected. */
function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(parseInstant(s));
  return Number.isNaN(d.getTime()) || toDateOnlyString(d) !== s ? null : d;
}

function fromQuery(search: string) {
  const params = new URLSearchParams(search);
  return {
    view: parseView(params.get("view")) ?? "week",
    date: parseDate(params.get("date")) ?? new Date(),
  };
}

const toQuery = (view: KloqView, date: Date) => `?view=${view}&date=${toDateOnlyString(date)}`;

export default function UrlStateExample() {
  const pathname = usePathname();
  // the query string is the state; null until the location has been read
  const [search, setSearch] = useState<string | null>(null);
  const { view, date } = useMemo(() => fromQuery(search ?? ""), [search]);
  const [seeds] = useState(() => buildSeedEvents());

  useEffect(() => {
    const read = () => setSearch(window.location.search);
    // normalise the incoming link: missing or invalid params become today's week
    const initial = fromQuery(window.location.search);
    window.history.replaceState(null, "", toQuery(initial.view, initial.date));
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  // a date is somewhere you went, so it gets a history entry; a view is how you are looking at it —
  // and a narrow box reports the view it collapsed to — so it rewrites the entry it is on
  const navigate = (next: { view?: KloqView; date?: Date }) => {
    const query = toQuery(next.view ?? view, next.date ?? date);
    if (query === search) return;
    if (next.date) window.history.pushState(null, "", query);
    else window.history.replaceState(null, "", query);
    setSearch(query);
  };

  return (
    <div className="@container flex flex-col">
      <div className="h-104">
        <Kloq
          view={view}
          onViewChange={(v) => navigate({ view: v })}
          date={date}
          onDateChange={(d) => navigate({ date: d })}
          defaultEvents={seeds}
          persistence={false}
          storage={false}
          designMode={false}
        >
          <Kloq.Toolbar />
        </Kloq>
      </div>

      <Bar edge="top">
        <span className="min-w-0 flex-1 wrap-anywhere">
          {pathname}
          <span className="text-foreground">{search ?? ""}</span>
        </span>
        <CopyButton
          size="xs"
          variant="outline"
          showLabel
          label="Copy link"
          text={() => window.location.href}
        />
      </Bar>
    </div>
  );
}
