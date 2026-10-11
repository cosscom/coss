"use client";

import type { LogFacets, LogFacetValue } from "@coss/logs";
import { LOG_RANGE_PRESETS, type LogFilters } from "@coss/logs/query";
import type { LogLevel, LogSource } from "@coss/logs/schemas";
import { Button } from "@coss/ui/components/button";
import { Checkbox } from "@coss/ui/components/checkbox";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@coss/ui/components/collapsible";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@coss/ui/components/popover";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { ChevronRightIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { compactCount, LEVEL_DOT, LEVEL_LABEL, SOURCE_LABEL } from "./format";
import type { ListField } from "./url";

type FacetSection = {
  field: ListField;
  title: string;
  values: LogFacetValue[];
  label?: (value: string) => ReactNode;
  defaultOpen?: boolean;
};

const CUSTOM = "custom";

function toLocalInput(iso: string): string {
  // `datetime-local` takes no zone: the dashboard shows UTC, so edit in UTC.
  return iso.slice(0, 16);
}

function CustomRange(props: { from: string; to: string; onApply: (from: Date, to: Date) => void }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(toLocalInput(props.from));
  const [to, setTo] = useState(toLocalInput(props.to));
  const fromDate = new Date(`${from}:00Z`);
  const toDate = new Date(`${to}:00Z`);
  const valid =
    !Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime()) && fromDate < toDate;
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger render={<Button className="w-full" size="sm" variant="outline" />}>
        Custom range…
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-72">
        <PopoverTitle className="mb-3 text-sm">Custom range (UTC)</PopoverTitle>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="logs-from">From</Label>
            <Input
              id="logs-from"
              onChange={(event) => setFrom(event.target.value)}
              type="datetime-local"
              value={from}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="logs-to">To</Label>
            <Input
              id="logs-to"
              onChange={(event) => setTo(event.target.value)}
              type="datetime-local"
              value={to}
            />
          </div>
          <p className="text-muted-foreground text-xs">At most 31 days, within the retention.</p>
          <Button
            disabled={!valid}
            onClick={() => {
              setOpen(false);
              props.onApply(fromDate, toDate);
            }}
            size="sm"
          >
            Apply
          </Button>
        </div>
      </PopoverPopup>
    </Popover>
  );
}

function Section(props: {
  title: string;
  defaultOpen?: boolean;
  active?: number;
  children: ReactNode;
}) {
  return (
    <Collapsible className="border-b py-1" defaultOpen={props.defaultOpen}>
      <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-md px-1 py-2 text-left font-medium text-sm hover:bg-accent/50">
        <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-data-panel-open:rotate-90" />
        <span className="flex-1">{props.title}</span>
        {props.active ? (
          <span className="rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">
            {props.active}
          </span>
        ) : null}
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="flex flex-col gap-0.5 pb-2">{props.children}</div>
      </CollapsiblePanel>
    </Collapsible>
  );
}

/** The left column: time range and one checkbox list per facet, with counts. */
export function LogFilterSidebar(props: {
  facets: LogFacets;
  filters: LogFilters;
  preset: string | null;
  from: string;
  to: string;
  apiKeyNames: Record<string, string>;
  pending: boolean;
  onPreset: (preset: string) => void;
  onRange: (from: Date, to: Date) => void;
  onToggle: (field: ListField, value: string) => void;
  onReset: () => void;
}) {
  const { facets, filters } = props;
  const sections: FacetSection[] = [
    {
      field: "levels",
      title: "Level",
      values: facets.levels,
      defaultOpen: true,
      label: (value) => (
        <span className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${LEVEL_DOT[value as LogLevel]}`} />
          {LEVEL_LABEL[value as LogLevel] ?? value}
        </span>
      ),
    },
    {
      field: "sources",
      title: "Source",
      values: facets.sources,
      defaultOpen: true,
      label: (value) => SOURCE_LABEL[value as LogSource] ?? value,
    },
    { field: "statuses", title: "Status code", values: facets.statuses, defaultOpen: true },
    { field: "methods", title: "Request method", values: facets.methods },
    {
      field: "routes",
      title: "Route",
      values: facets.routes,
      label: (value) => <span className="truncate font-mono text-xs">{value}</span>,
    },
    {
      field: "apiKeyIds",
      title: "API key",
      values: facets.apiKeyIds,
      label: (value) => (
        <span className="truncate">
          {props.apiKeyNames[value] ?? <code className="text-xs">{value}</code>}
        </span>
      ),
    },
    {
      field: "types",
      title: "Event type",
      values: facets.types,
      label: (value) => <span className="truncate font-mono text-xs">{value}</span>,
    },
  ];
  const hasFilters = sections.some(
    (section) => ((filters[section.field] as string[] | undefined) ?? []).length > 0,
  );
  const rangeValue = props.preset ?? CUSTOM;

  return (
    <aside className="flex flex-col gap-2 text-sm" aria-busy={props.pending}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Filters</h2>
        <Button disabled={!hasFilters} onClick={props.onReset} size="xs" variant="ghost">
          Reset
        </Button>
      </div>
      <Section defaultOpen title="Timeline">
        <div className="flex flex-col gap-2 px-1">
          <Select
            items={[
              ...LOG_RANGE_PRESETS.map((preset) => ({ value: preset.id, label: preset.label })),
              { value: CUSTOM, label: "Custom range" },
            ]}
            onValueChange={(value) => {
              if (typeof value === "string" && value !== CUSTOM) props.onPreset(value);
            }}
            value={rangeValue}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {LOG_RANGE_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                </SelectItem>
              ))}
              <SelectItem disabled value={CUSTOM}>
                Custom range
              </SelectItem>
            </SelectPopup>
          </Select>
          <CustomRange
            from={props.from}
            key={`${props.from}-${props.to}`}
            onApply={props.onRange}
            to={props.to}
          />
        </div>
      </Section>
      {sections.map((section) => {
        const selected = (filters[section.field] as string[] | undefined) ?? [];
        // Selected values stay listed even when nothing in the range matches them.
        const values = [
          ...section.values,
          ...selected
            .filter((value) => !section.values.some((entry) => entry.value === value))
            .map((value) => ({ value, count: 0 })),
        ];
        return (
          <Section
            active={selected.length}
            defaultOpen={section.defaultOpen || selected.length > 0}
            key={section.field}
            title={section.title}
          >
            {values.length === 0 ? (
              <p className="px-2 py-1 text-muted-foreground text-xs">Nothing in this range.</p>
            ) : (
              values.map((entry) => {
                const id = `facet-${section.field}-${entry.value}`;
                return (
                  <label
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
                    htmlFor={id}
                    key={entry.value}
                  >
                    <Checkbox
                      checked={selected.includes(entry.value)}
                      id={id}
                      onCheckedChange={() => props.onToggle(section.field, entry.value)}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {section.label ? section.label(entry.value) : entry.value}
                    </span>
                    <span className="font-mono text-muted-foreground text-xs tabular-nums">
                      {compactCount(entry.count)}
                    </span>
                  </label>
                );
              })
            )}
          </Section>
        );
      })}
    </aside>
  );
}
