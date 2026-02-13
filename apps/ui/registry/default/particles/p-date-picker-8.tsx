"use client";

import { format } from "date-fns";
import { ChevronsUpDownIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/registry/default/ui/button";
import { Calendar } from "@/registry/default/ui/calendar";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@/registry/default/ui/popover";

export default function Particle() {
  const [date, setDate] = useState<Date | undefined>();

  return (
    <Popover>
      <PopoverTrigger
        data-empty={!date}
        render={
          <Button
            className="w-full justify-between font-normal"
            variant="outline"
          />
        }
      >
        <span className="in-data-[empty=true]:text-muted-foreground/70">
          {date ? format(date, "PPP") : "Pick a date"}
        </span>
        <ChevronsUpDownIcon
          aria-hidden="true"
          className="-me-1! size-4.5 opacity-80 sm:size-4"
        />
      </PopoverTrigger>
      <PopoverPopup>
        <Calendar
          defaultMonth={date}
          mode="single"
          onSelect={setDate}
          selected={date}
        />
      </PopoverPopup>
    </Popover>
  );
}
