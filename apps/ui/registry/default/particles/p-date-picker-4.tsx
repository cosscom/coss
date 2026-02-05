"use client";

import { addDays, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/registry/default/ui/button";
import { Calendar } from "@/registry/default/ui/calendar";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@/registry/default/ui/popover";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select";

const presets = [
  { label: "Select a preset", value: null },
  { label: "Today", value: "0" },
  { label: "Tomorrow", value: "1" },
  { label: "In 3 days", value: "3" },
  { label: "In a week", value: "7" },
];

export default function Particle() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  });

  const handlePresetChange = (value: string | null) => {
    if (value) {
      const days = Number.parseInt(value, 10);
      setDate({
        from: new Date(),
        to: addDays(new Date(), days),
      });
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            className="w-[300px] justify-start text-left font-normal"
            variant="outline"
          />
        }
      >
        <CalendarIcon />
        {date?.from ? (
          date.to ? (
            <>
              {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
            </>
          ) : (
            format(date.from, "LLL dd, y")
          )
        ) : (
          <span>Pick a date</span>
        )}
      </PopoverTrigger>
      <PopoverPopup align="start" className="flex w-auto flex-col gap-2 p-2">
        <Select items={presets} onValueChange={handlePresetChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {presets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <Calendar
          defaultMonth={date?.from}
          mode="range"
          numberOfMonths={2}
          onSelect={setDate}
          selected={date}
        />
      </PopoverPopup>
    </Popover>
  );
}
