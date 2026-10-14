"use client";

import { Button } from "@coss/ui/components/button";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@coss/ui/components/combobox";
import { Skeleton } from "@coss/ui/components/skeleton";
import { cn } from "@coss/ui/lib/utils";
import {
  formatInZone,
  listAllZones,
  listCommonZones,
  localZone,
  searchZones,
  type ZoneOption,
  zoneAbbr,
  zoneCityLabel,
  zoneOffsetLabel,
  zoneOffsetMinutes,
} from "kloq";
import { Search, X } from "lucide-react";
import {
  type CSSProperties,
  createContext,
  type KeyboardEvent,
  memo,
  type Ref,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Mono } from "@/components/calendar/site/section";
import { Pane, ToolCard } from "./tool-parts";
import { useNow } from "./use-now";

const HOURS = 24;
const MAX_MATCHES = 40;
const DEFAULT_ROWS = 4;

/* where the default rows are drawn from, best known first */
const NEIGHBOURS = [
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "America/Los_Angeles",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Australia/Sydney",
  "America/Chicago",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Europe/Athens",
  "America/Denver",
  "Asia/Bangkok",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Asia/Karachi",
  "Asia/Dhaka",
  "Pacific/Auckland",
  "Pacific/Honolulu",
];

/**
 * Up to three zones whose clocks sit within three hours of the reader's, one either side where
 * there is one: close enough that the default view always has hours everyone shares.
 */
function defaultZones(home: string, at: Date): string[] {
  const base = zoneOffsetMinutes(at, home);
  const near = NEIGHBOURS.filter((zone) => zone !== home)
    .map((zone) => {
      const hours = (zoneOffsetMinutes(at, zone) - base) / 60;
      return { zone, ahead: ((((hours + 12) % 24) + 24) % 24) - 12 };
    })
    .filter((n) => n.ahead !== 0 && Math.abs(n.ahead) <= 3)
    .sort((a, b) => Math.abs(a.ahead) - Math.abs(b.ahead));

  const picks = [near.find((n) => n.ahead < 0), near.find((n) => n.ahead > 0)].filter(
    (n) => n !== undefined,
  );
  for (const n of near) {
    if (picks.length >= DEFAULT_ROWS - 1) break;
    if (picks.every((p) => p.ahead !== n.ahead)) picks.push(n);
  }
  return picks.sort((a, b) => a.ahead - b.ahead).map((n) => n.zone);
}

type Band = "work" | "fringe" | "night";

function bandOf(hour: number): Band {
  if (hour >= 9 && hour < 17) return "work";
  if (hour >= 7 && hour < 22) return "fringe";
  return "night";
}

/* working hours carry a top rule as well as their fill, so they do not rest on hue */
const BANDS: Record<Band, { legend: string; name: string; className: string }> = {
  work: {
    legend: "09–17",
    name: "working hours",
    className: "border-t-2 border-success-foreground bg-(--tz-work)",
  },
  fringe: { legend: "07–09, 17–22", name: "awake", className: "bg-(--tz-fringe)" },
  night: { legend: "asleep", name: "asleep", className: "bg-(--tz-night)" },
};
const BAND_ORDER: Band[] = ["work", "fringe", "night"];

const BAND_VARS = {
  "--tz-work": "color-mix(in oklab, var(--success) 58%, var(--card))",
  "--tz-fringe": "color-mix(in oklab, var(--warning) 26%, var(--card))",
  "--tz-night": "color-mix(in oklab, var(--foreground) 18%, var(--card))",
} as CSSProperties;

/* column `--tz-col` of a 24-column, gap-px strip, as offsets from the strip's left edge */
const COL_START = "calc(var(--tz-col) * (100% + 1px) / 24)";
const COL_END = "calc((var(--tz-col) + 1) * (100% + 1px) / 24 - 1px)";

/* declared on the same element as `--tz-col`: a custom property resolves its var()s where it is set */
const columnVars = (col: number) =>
  ({
    "--tz-col": col,
    "--tz-before": COL_START,
    "--tz-after": `calc(100% - ${COL_END})`,
  }) as CSSProperties;

const ROW = "flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3";
const HEAD = "flex min-w-0 items-center gap-2 sm:w-44 sm:shrink-0";
const STRIP = "relative grid min-w-0 flex-1 grid-cols-24 gap-px";

const pad = (n: number) => String(n).padStart(2, "0");

type Cell = { hour: number; minute: number; band: Band };

/* the column being read: hovered, scrubbed or focused, otherwise the current hour */
const ShownColumn = createContext(0);

function Ruler({ nowColumn }: { nowColumn: number }) {
  const shown = useContext(ShownColumn);
  const marked = (i: number) => i === nowColumn || i === shown;
  const crowded = (i: number) => Math.abs(i - nowColumn) <= 1 || Math.abs(i - shown) <= 1;
  return (
    <div aria-hidden className={ROW}>
      <Mono className={cn(HEAD, "text-2xs")}>your day, hour by hour</Mono>
      <div className={STRIP}>
        {Array.from({ length: HOURS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "flex justify-center font-mono text-3xs whitespace-nowrap tabular-nums",
              i === nowColumn
                ? "font-semibold text-brand-foreground"
                : i === shown
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground",
            )}
          >
            {marked(i) || (i % 3 === 0 && !crowded(i)) ? pad(i) : " "}
          </span>
        ))}
      </div>
    </div>
  );
}

/* phones have no room for the hour inside a cell, so each row states it beside its name */
function RowTime({ cells }: { cells: Cell[] }) {
  const cell = cells[useContext(ShownColumn)];
  return (
    <span aria-hidden className="font-mono text-xs tabular-nums sm:hidden">
      {pad(cell.hour)}:{pad(cell.minute)}
    </span>
  );
}

const ZoneRow = memo(function ZoneRow({
  zone,
  row,
  cells,
  overlap,
  offset,
  nowColumn,
  tabColumn,
  onRemove,
}: {
  zone: string;
  row: number;
  cells: Cell[];
  overlap: boolean[];
  offset: string;
  nowColumn: number;
  /** the column holding the grid's one tab stop, when it is in this row */
  tabColumn: number | null;
  onRemove?: (zone: string, button: HTMLElement) => void;
}) {
  const city = zoneCityLabel(zone);
  return (
    <div role="row" className={ROW}>
      <div role="rowheader" className={HEAD}>
        <span className="truncate text-sm">{city}</span>
        <span className="shrink-0 font-mono text-3xs text-muted-foreground tabular-nums">
          {offset}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-2">
          <RowTime cells={cells} />
          {onRemove && (
            <Button
              data-remove
              size="icon-xs"
              variant="ghost"
              className="text-muted-foreground"
              aria-label={`Remove ${city}`}
              onClick={(e) => onRemove(zone, e.currentTarget)}
            >
              <X />
            </Button>
          )}
        </span>
      </div>

      <div data-strip className={cn(STRIP, "touch-pan-y overflow-hidden rounded-md")}>
        {cells.map((cell, i) => (
          <div
            key={i}
            role="gridcell"
            tabIndex={i === tabColumn ? 0 : -1}
            data-row={row}
            data-col={i}
            aria-current={i === nowColumn ? "time" : undefined}
            aria-label={[
              `${city} ${pad(cell.hour)}:${pad(cell.minute)}`,
              BANDS[cell.band].name,
              i === nowColumn && "now",
              overlap[i] && "everyone at work",
            ]
              .filter(Boolean)
              .join(", ")}
            className={cn(
              "h-8 -outline-offset-2",
              BANDS[cell.band].className,
              i === nowColumn && "inset-ring inset-ring-brand",
            )}
          />
        ))}
        {/* the hour, shown only through the active column */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden grid-cols-24 gap-px [clip-path:inset(0_var(--tz-after)_0_var(--tz-before))] sm:grid"
        >
          {cells.map((cell, i) => (
            <span key={i} className="grid place-items-center font-mono text-3xs tabular-nums">
              {pad(cell.hour)}
            </span>
          ))}
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-(--tz-before) bg-card/50 group-data-[active=true]/map:block"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-(--tz-after) bg-card/50 group-data-[active=true]/map:block"
        />
      </div>
    </div>
  );
});

function ZonePicker({
  now,
  taken,
  onAdd,
  inputRef,
}: {
  now: Date;
  taken: string[];
  onAdd: (zone: string) => void;
  inputRef: Ref<HTMLInputElement>;
}) {
  /* the full list costs one Intl.DateTimeFormat per zone, so it waits for the first open */
  const [pool, setPool] = useState<ZoneOption[] | null>(null);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    if (!pool) return [];
    return (query.trim() ? searchZones(query, pool) : listCommonZones()).slice(0, MAX_MATCHES);
  }, [pool, query]);

  return (
    <div className="w-full sm:w-72">
      <Combobox<ZoneOption>
        items={pool ?? []}
        filteredItems={matches}
        value={null}
        inputValue={query}
        itemToStringLabel={(zone) => zone.label}
        autoHighlight
        onInputValueChange={(value, details) =>
          setQuery(details.reason === "item-press" ? "" : value)
        }
        onOpenChange={(open) => {
          if (open && !pool) setPool(listAllZones());
        }}
        onValueChange={(zone) => {
          if (!zone) return;
          onAdd(zone.id);
          setQuery("");
        }}
      >
        <ComboboxInput
          ref={inputRef}
          aria-label="Add a time zone"
          placeholder="Add a zone…"
          startAddon={<Search />}
          showTrigger={false}
        />
        <ComboboxPopup>
          <ComboboxEmpty>
            No zone matches that. Try a city: Lagos, Auckland, Kathmandu.
          </ComboboxEmpty>
          <ComboboxList>
            {(zone: ZoneOption) => {
              const added = taken.includes(zone.id);
              return (
                <ComboboxItem key={zone.id} value={zone} disabled={added}>
                  <span className="flex items-baseline justify-between gap-4">
                    {zone.label}
                    <span className="font-mono text-2xs text-muted-foreground tabular-nums">
                      {added ? "on the map" : zoneOffsetLabel(now, zone.id)}
                    </span>
                  </span>
                </ComboboxItem>
              );
            }}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
    </div>
  );
}

function Legend() {
  return (
    <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-2xs text-muted-foreground sm:pl-47">
      {BAND_ORDER.map((band) => (
        <span key={band} className="flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2.5 rounded-xs", BANDS[band].className)} />
          {BANDS[band].legend}
        </span>
      ))}
    </p>
  );
}

function Pending() {
  return (
    <ToolCard>
      <Pane className="flex flex-col gap-1.5">
        <span role="status" className="sr-only">
          Reading the clock…
        </span>
        {Array.from({ length: DEFAULT_ROWS + 2 }, (_, i) => (
          <div key={i} className={ROW}>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 min-w-0 flex-1 rounded-md" />
          </div>
        ))}
      </Pane>
      <Pane>
        <Skeleton className="h-28" />
      </Pane>
      <Pane>
        <Skeleton className="h-8 w-full sm:w-72" />
      </Pane>
    </ToolCard>
  );
}

const cellOf = (target: EventTarget) => {
  const el = (target as HTMLElement).closest<HTMLElement>("[data-col]");
  return el ? { row: Number(el.dataset.row), col: Number(el.dataset.col) } : null;
};

const columnAt = (strip: DOMRect, x: number) =>
  Math.max(0, Math.min(HOURS - 1, Math.floor(((x - strip.left) / strip.width) * HOURS)));

export function TimezoneMap() {
  const now = useNow(30_000);
  const [picked, setPicked] = useState<string[] | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [cursor, setCursor] = useState<{ row: number; col: number } | null>(null);
  const [focused, setFocused] = useState(false);
  const scrubbing = useRef<DOMRect | null>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  /* midnight today in the reader's zone; stable across clock ticks, so the grid is too */
  const dayStart = now ? new Date(now).setHours(0, 0, 0, 0) : null;
  const defaults = useMemo(
    () => (dayStart === null ? [] : defaultZones(localZone(), new Date(dayStart))),
    [dayStart],
  );
  const zones = picked ?? defaults;

  const rows = useMemo(() => {
    if (dayStart === null) return [];
    const home = localZone();
    return [home, ...zones.filter((z) => z !== home)];
  }, [zones, dayStart]);

  const columns = useMemo(
    () =>
      dayStart === null
        ? []
        : Array.from({ length: HOURS }, (_, i) => new Date(dayStart + i * 3_600_000)),
    [dayStart],
  );

  const grid = useMemo(() => {
    const cells = rows.map((zone) =>
      columns.map((instant): Cell => {
        /* from the offset, so half-hour zones land in the right band */
        const utcMinutes = instant.getUTCHours() * 60 + instant.getUTCMinutes();
        const local = (((utcMinutes + zoneOffsetMinutes(instant, zone)) % 1440) + 1440) % 1440;
        const hour = Math.floor(local / 60);
        return { hour, minute: local % 60, band: bandOf(hour) };
      }),
    );
    const overlap = columns.map((_, i) => cells.every((row) => row[i].band === "work"));
    return { cells, overlap };
  }, [rows, columns]);

  const remove = useCallback(
    (zone: string, button: HTMLElement) => {
      /* a keyboard removal hands focus to a neighbouring row, or to the picker once none is left */
      if (button.matches(":focus-visible")) {
        const all = [
          ...(button.closest("[role=grid]")?.querySelectorAll<HTMLElement>("[data-remove]") ?? []),
        ];
        const at = all.indexOf(button);
        (all[at + 1] ?? all[at - 1] ?? pickerRef.current)?.focus();
      }
      setPicked((prev) => (prev ?? defaults).filter((z) => z !== zone));
    },
    [defaults],
  );
  const add = useCallback(
    (zone: string) =>
      setPicked((prev) =>
        (prev ?? defaults).includes(zone) ? prev : [...(prev ?? defaults), zone],
      ),
    [defaults],
  );

  if (!now) return <Pending />;

  const nowColumn = now.getHours();
  const tab = { row: Math.min(cursor?.row ?? 0, rows.length - 1), col: cursor?.col ?? nowColumn };
  const active = hover ?? (focused ? tab.col : null);
  const overlapCount = grid.overlap.filter(Boolean).length;
  const instant = active === null ? now : columns[active];

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const at = cellOf(e.target);
    if (!at) return;
    const next = { ...at };
    if (e.key === "ArrowLeft") next.col -= 1;
    else if (e.key === "ArrowRight") next.col += 1;
    else if (e.key === "ArrowUp") next.row -= 1;
    else if (e.key === "ArrowDown") next.row += 1;
    else if (e.key === "Home") next.col = 0;
    else if (e.key === "End") next.col = HOURS - 1;
    else return;
    e.preventDefault();
    setHover(null);
    next.col = Math.max(0, Math.min(HOURS - 1, next.col));
    next.row = Math.max(0, Math.min(rows.length - 1, next.row));
    e.currentTarget
      .querySelector<HTMLElement>(`[data-row="${next.row}"][data-col="${next.col}"]`)
      ?.focus();
  };

  return (
    <ToolCard style={BAND_VARS}>
      <Pane>
        <div
          role="grid"
          aria-label="Each zone's day, hour by hour. Arrow keys move between hours and zones."
          data-active={active !== null}
          style={columnVars(active ?? nowColumn)}
          className="group/map flex flex-col gap-1.5"
          onPointerDown={(e) => {
            /* a finger on a strip scrubs the column; the strips only give vertical pans to the page */
            const strip =
              e.pointerType === "mouse" ? null : (e.target as HTMLElement).closest("[data-strip]");
            if (!strip) return;
            scrubbing.current = strip.getBoundingClientRect();
            setHover(columnAt(scrubbing.current, e.clientX));
          }}
          onPointerMove={(e) => {
            if (e.pointerType === "mouse") setHover(cellOf(e.target)?.col ?? null);
            else if (scrubbing.current) setHover(columnAt(scrubbing.current, e.clientX));
          }}
          onPointerUp={() => {
            scrubbing.current = null;
          }}
          onPointerCancel={() => {
            scrubbing.current = null;
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setHover(null);
          }}
          onFocus={(e) => {
            const at = cellOf(e.target);
            if (at) setCursor(at);
            setFocused(at !== null);
          }}
          onBlur={(e) => {
            if (e.currentTarget.contains(e.relatedTarget)) return;
            setFocused(false);
            setHover(null);
          }}
          onKeyDown={onKeyDown}
        >
          <ShownColumn value={active ?? nowColumn}>
            <Ruler nowColumn={nowColumn} />
            {rows.map((zone, r) => (
              <ZoneRow
                key={zone}
                zone={zone}
                row={r}
                cells={grid.cells[r]}
                overlap={grid.overlap}
                offset={zoneOffsetLabel(now, zone)}
                nowColumn={nowColumn}
                tabColumn={r === tab.row ? tab.col : null}
                onRemove={r > 0 ? remove : undefined}
              />
            ))}
          </ShownColumn>
          <div aria-hidden className={cn(ROW, "mt-1.5")}>
            <Mono className={cn(HEAD, "text-2xs")}>everyone at work</Mono>
            <div className={STRIP}>
              {grid.overlap.map((ok, i) => (
                <span key={i} className={cn("h-1.5 rounded-full", ok ? "bg-brand" : "bg-border")} />
              ))}
            </div>
          </div>
        </div>
        <Legend />
      </Pane>

      <Pane className="flex flex-col gap-6 md:flex-row md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="flex">
            <Mono>{active === null ? "right now" : `at ${pad(active)}:00 your time`}</Mono>
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-x-8 overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((zone) => (
              <li
                key={zone}
                className="-mt-px flex min-w-0 items-baseline justify-between gap-3 border-t py-1.5"
              >
                <span className="truncate text-sm text-muted-foreground">
                  {zoneCityLabel(zone)}
                </span>
                <span className="shrink-0 font-mono text-sm tabular-nums">
                  {formatInZone(instant, zone, {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                  <span className="ml-1.5 text-3xs text-muted-foreground">
                    {zoneAbbr(instant, zone)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <h2 className="flex">
            <Mono>overlapping work hours</Mono>
          </h2>
          <p role="status" className="font-heading text-3xl font-semibold tabular-nums">
            {overlapCount}
            <span className="ml-1 text-base font-normal text-muted-foreground">
              {overlapCount === 1 ? "hour" : "hours"}
            </span>
            <span className="sr-only"> when every zone on the map is at work</span>
          </p>
          <p className="max-w-56 text-xs text-muted-foreground md:text-right">
            {overlapCount === 0
              ? "No hour of the day has all of these zones inside 09:00–17:00. Somebody is taking this one early or late."
              : "Hours where every zone above is between 09:00 and 17:00: the red band on the map."}
          </p>
        </div>
      </Pane>

      <Pane>
        <ZonePicker now={now} taken={rows} onAdd={add} inputRef={pickerRef} />
      </Pane>
    </ToolCard>
  );
}
