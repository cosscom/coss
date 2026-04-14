"use client";

import { Button } from "@coss/ui/components/button";
import { Calendar } from "@coss/ui/components/calendar";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@coss/ui/components/popover";
import { ChevronsUpDownIcon } from "lucide-react";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { FilterChipShell } from "./filter-chip-shell";
import type { ActiveFilter, FilterField } from "./filter-chip-types";

function subDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function daysSinceMonday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function startOfWeekMonday(date: Date): Date {
  return startOfDay(subDays(date, daysSinceMonday(date)));
}

function endOfWeekMonday(date: Date): Date {
  const start = startOfWeekMonday(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return endOfDay(end);
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateStr(s: string): Date | null {
  const parts = s.split("-");
  if (parts.length !== 3) {
    return null;
  }
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    return null;
  }
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function valuesToRange(v: string[] | undefined): DateRange | undefined {
  const fromStr = v?.[0];
  const toStr = v?.[1];
  if (!fromStr || !toStr) {
    return undefined;
  }
  const from = parseDateStr(fromStr);
  const to = parseDateStr(toStr);
  if (!from || !to) {
    return undefined;
  }
  return { from, to };
}

function rangeToValues(range: DateRange | undefined): string[] {
  if (!range?.from || !range?.to) {
    return [];
  }
  return [toDateStr(range.from), toDateStr(range.to)];
}

function rangeMatchesPreset(
  committed: DateRange | undefined,
  presetFrom: Date,
  presetTo: Date,
): boolean {
  if (!committed?.from || !committed?.to) {
    return false;
  }
  return (
    toDateStr(committed.from) === toDateStr(presetFrom) &&
    toDateStr(committed.to) === toDateStr(presetTo)
  );
}

type DateRangePreset = {
  focusMonth: Date;
  label: string;
  range: DateRange;
  value: string;
};

function inferDatePresetId(
  committed: DateRange | undefined,
  presets: ReadonlyArray<DateRangePreset>,
): string | null {
  if (!committed?.from || !committed?.to) {
    return null;
  }
  for (const p of presets) {
    if (
      p.range.from &&
      p.range.to &&
      rangeMatchesPreset(committed, p.range.from, p.range.to)
    ) {
      return p.value;
    }
  }
  return null;
}

function formatRangeLabel(range: DateRange): string {
  const fmt = (d: Date): string =>
    new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  if (!range.from) {
    return "";
  }
  if (!range.to) {
    return fmt(range.from);
  }
  return `${fmt(range.from)} – ${fmt(range.to)}`;
}

function dateRangeTriggerLabel(
  committed: DateRange | undefined,
  presets: DateRangePreset[],
): string {
  if (!committed?.from || !committed?.to) {
    return "Select";
  }
  const id = inferDatePresetId(committed, presets);
  if (id) {
    const preset = presets.find((p) => p.value === id);
    if (preset) {
      return preset.label;
    }
  }
  return formatRangeLabel(committed);
}

export function DateRangeFilterChip({
  autoOpen = false,
  field,
  filter,
  onRemove,
  onUpdate,
}: {
  autoOpen?: boolean;
  field: Extract<FilterField, { kind: "dateRange" }>;
  filter: ActiveFilter;
  onRemove: () => void;
  onUpdate: (values: string[]) => void;
}): React.ReactElement {
  const [open, setOpen] = useState(autoOpen);
  const hasAutoOpened = useRef(false);
  const today = new Date();
  const yesterday = subDays(today, 1);
  const thisWeekStart = startOfWeekMonday(today);
  const thisWeekEnd = endOfWeekMonday(today);
  const lastWeekStart = startOfWeekMonday(subDays(today, 7));
  const lastWeekEnd = endOfWeekMonday(subDays(today, 7));
  const thisMonthStart = startOfDay(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const thisMonthEnd = endOfDay(
    new Date(today.getFullYear(), today.getMonth() + 1, 0),
  );
  const lastMonthStart = startOfDay(
    new Date(today.getFullYear(), today.getMonth() - 1, 1),
  );
  const lastMonthEnd = endOfDay(
    new Date(today.getFullYear(), today.getMonth(), 0),
  );

  const committedRange = valuesToRange(filter.v);
  const [month, setMonth] = useState<Date>(
    committedRange?.to ?? committedRange?.from ?? today,
  );
  const [range, setRange] = useState<DateRange | undefined>(committedRange);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const presets: DateRangePreset[] = [
    {
      value: "today",
      label: "Today",
      range: { from: startOfDay(today), to: endOfDay(today) },
      focusMonth: today,
    },
    {
      value: "yesterday",
      label: "Yesterday",
      range: {
        from: startOfDay(yesterday),
        to: endOfDay(yesterday),
      },
      focusMonth: yesterday,
    },
    {
      value: "this-week",
      label: "This week",
      range: { from: thisWeekStart, to: thisWeekEnd },
      focusMonth: thisWeekEnd,
    },
    {
      value: "last-week",
      label: "Last week",
      range: { from: lastWeekStart, to: lastWeekEnd },
      focusMonth: lastWeekEnd,
    },
    {
      value: "this-month",
      label: "This month",
      range: { from: thisMonthStart, to: thisMonthEnd },
      focusMonth: thisMonthEnd,
    },
    {
      value: "last-month",
      label: "Last month",
      range: { from: lastMonthStart, to: lastMonthEnd },
      focusMonth: lastMonthEnd,
    },
  ];

  useEffect(() => {
    if (autoOpen && !hasAutoOpened.current) {
      setOpen(true);
      hasAutoOpened.current = true;
    }
  }, [autoOpen]);

  const applyRange = (next: DateRange | undefined): void => {
    setRange(next);
    const values = rangeToValues(next);
    if (values.length === 2) {
      onUpdate(values);
    }
  };

  const handleOpenChange = (isOpen: boolean): void => {
    setOpen(isOpen);
    if (isOpen) {
      const next = valuesToRange(filter.v);
      setRange(next);
      setMonth(next?.to ?? next?.from ?? today);
      setSelectedPresetId(inferDatePresetId(next, presets));
    } else if (!filter.v || filter.v.length < 2) {
      onRemove();
    }
  };

  return (
    <FilterChipShell label={field.label} onRemove={onRemove}>
      <Popover onOpenChange={handleOpenChange} open={open}>
        <PopoverTrigger
          render={
            <Button
              className={!committedRange ? "justify-between" : undefined}
              size="xs"
              variant="outline"
            />
          }
        >
          {dateRangeTriggerLabel(committedRange, presets)}
          {!committedRange && <ChevronsUpDownIcon className="-me-1!" />}
        </PopoverTrigger>
        <PopoverPopup
          align="start"
          className="p-0 transition-none"
          portalProps={{
            className: "*:data-[slot=popover-positioner]:transition-none",
          }}
        >
          <div className="flex max-sm:flex-col">
            <div className="relative py-1 ps-1 max-sm:order-1 max-sm:border-t">
              <div className="flex h-full flex-col gap-0.5 sm:border-e sm:pe-3">
                {presets.map((preset) => (
                  <Button
                    className="w-full justify-start"
                    data-pressed={
                      selectedPresetId === preset.value ? "" : undefined
                    }
                    key={preset.value}
                    onClick={(): void => {
                      setSelectedPresetId(preset.value);
                      applyRange(preset.range);
                      setMonth(preset.focusMonth);
                      setOpen(false);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
            <Calendar
              className="max-sm:pb-3 sm:ps-2"
              mode="range"
              month={month}
              numberOfMonths={1}
              required
              onMonthChange={setMonth}
              onSelect={(next: DateRange | undefined): void => {
                setRange(next);
                if (next?.from && next.to) {
                  onUpdate(rangeToValues(next));
                  setSelectedPresetId(inferDatePresetId(next, presets));
                } else {
                  setSelectedPresetId(null);
                }
              }}
              selected={range}
            />
          </div>
        </PopoverPopup>
      </Popover>
    </FilterChipShell>
  );
}
