"use client";

import { Checkbox } from "@coss/ui/components/checkbox";
import { Kloq, localZone, useIsClient, zoneCityLabel, zoneOffsetLabel } from "kloq";
import { useState } from "react";
import { Label } from "@/components/calendar/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/calendar/ui/select";
import { Bar } from "../parts";
import { DISPLAY_ZONES, GUTTER_ZONES, teamEvents } from "./data";

export default function MultiTimezoneExample() {
  const [events] = useState(() => teamEvents(new Date()));
  const [zone, setZone] = useState("Europe/London");
  const [columns, setColumns] = useState(GUTTER_ZONES);
  const [pickerOpen, setPickerOpen] = useState(false);
  const isClient = useIsClient();

  const displayTimeZone = zone === "local" ? undefined : zone;
  // the browser's zone is only knowable on the client; the readout waits for it
  const resolvedZone = isClient ? (displayTimeZone ?? localZone()) : null;

  const toggleColumn = (id: string, on: boolean) =>
    setColumns(GUTTER_ZONES.filter((z) => (z === id ? on : columns.includes(z))));

  return (
    <div className="@container flex flex-col">
      <Bar>
        <Label size="sm">
          Display zone
          <Select
            items={DISPLAY_ZONES}
            value={zone}
            onValueChange={(v) => setZone(v ?? "local")}
            open={pickerOpen}
            onOpenChange={setPickerOpen}
          >
            <SelectTrigger size="sm" className="w-32 min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {DISPLAY_ZONES.map((z) => (
                <SelectItem key={z.value} value={z.value}>
                  {z.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Label>

        <div
          role="group"
          aria-label="Gutter columns"
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
        >
          <span>gutter</span>
          {GUTTER_ZONES.map((id) => (
            <Label key={id} size="sm">
              <Checkbox
                checked={columns.includes(id)}
                onCheckedChange={(on) => toggleColumn(id, on)}
              />
              {zoneCityLabel(id)}
            </Label>
          ))}
        </div>
      </Bar>

      <div className="h-136">
        <Kloq
          displayTimeZone={displayTimeZone}
          timeZones={columns.filter((z) => z !== displayTimeZone)}
          onTimeZonesClick={() => setPickerOpen(true)}
          defaultEvents={events}
          defaultView={3}
          persistence={false}
          designMode={false}
          storage={false}
        >
          <Kloq.Toolbar>
            <Kloq.Nav />
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {resolvedZone
                ? `${resolvedZone} · UTC${zoneOffsetLabel(new Date(), resolvedZone)}`
                : ""}
            </span>
          </Kloq.Toolbar>
        </Kloq>
      </div>
    </div>
  );
}
