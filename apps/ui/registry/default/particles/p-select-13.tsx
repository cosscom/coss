"use client";

import { useMemo } from "react";

import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select";

export default function Particle() {
  const timezones = Intl.supportedValuesOf("timeZone");

  const formattedTimezones = useMemo(() => {
    return timezones
      .map((timezone) => {
        const formatter = new Intl.DateTimeFormat("en", {
          timeZone: timezone,
          timeZoneName: "shortOffset",
        });
        const parts = formatter.formatToParts(new Date());
        const offset =
          parts.find((part) => part.type === "timeZoneName")?.value || "";
        const modifiedOffset = offset === "GMT" ? "GMT+0" : offset;

        return {
          label: `(${modifiedOffset}) ${timezone.replace(/_/g, " ")}`,
          numericOffset: Number.parseInt(
            offset.replace("GMT", "").replace("+", "") || "0",
            10,
          ),
          value: timezone,
        };
      })
      .sort((a, b) => a.numericOffset - b.numericOffset);
  }, [timezones]);

  return (
    <Select
      aria-label="Select timezone"
      defaultValue={formattedTimezones.find(
        (tz) => tz.value === "Europe/London",
      )}
      itemToStringValue={(item) => item.value}
    >
      <SelectTrigger>
        <SelectValue>
          {(item) => <span className="truncate">{item.label}</span>}
        </SelectValue>
      </SelectTrigger>
      <SelectPopup>
        {formattedTimezones.map((item) => (
          <SelectItem key={item.value} value={item}>
            {item.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
