"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/registry/default/ui/button";
import { Calendar } from "@/registry/default/ui/calendar";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@/registry/default/ui/popover";

export default function Particle() {
  const [dates, setDates] = useState<Date[] | undefined>();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            className="h-auto min-h-9 w-[280px] justify-start text-left font-normal sm:min-h-8"
            variant="outline"
          />
        }
      >
        <CalendarIcon className="shrink-0" />
        <span className="flex flex-wrap gap-1">
          {dates && dates.length > 0 ? (
            dates.length <= 3 ? (
              dates.map((date) => (
                <span
                  className="rounded bg-muted px-1.5 py-0.5 text-xs"
                  key={date.toISOString()}
                >
                  {format(date, "MMM d")}
                </span>
              ))
            ) : (
              <span>{dates.length} dates selected</span>
            )
          ) : (
            <span>Pick dates</span>
          )}
        </span>
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-auto p-0">
        <Calendar mode="multiple" onSelect={setDates} selected={dates} />
      </PopoverPopup>
    </Popover>
  );
}
