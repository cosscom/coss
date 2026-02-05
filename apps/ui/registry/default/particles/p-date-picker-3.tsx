"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/registry/default/ui/button";
import { Calendar } from "@/registry/default/ui/calendar";
import { Field, FieldLabel } from "@/registry/default/ui/field";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@/registry/default/ui/popover";

export default function Particle() {
  const [date, setDate] = useState<Date | undefined>();

  return (
    <Field className="flex flex-col gap-2">
      <FieldLabel>Date of birth</FieldLabel>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              className="w-[280px] justify-start text-left font-normal"
              variant="outline"
            />
          }
        >
          <CalendarIcon />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </PopoverTrigger>
        <PopoverPopup align="start" className="w-auto p-0">
          <Calendar
            captionLayout="dropdown"
            endMonth={new Date()}
            mode="single"
            onSelect={setDate}
            selected={date}
            startMonth={new Date(1900, 0)}
          />
        </PopoverPopup>
      </Popover>
    </Field>
  );
}
