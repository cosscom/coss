"use client";

import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/registry/default/ui/button";
import { Calendar } from "@/registry/default/ui/calendar";
import { Input } from "@/registry/default/ui/input";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@/registry/default/ui/popover";

export default function Particle() {
  const [date, setDate] = useState<Date | undefined>();
  const [inputValue, setInputValue] = useState("");
  const [month, setMonth] = useState<Date>(new Date());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const parsedDate = parse(value, "MM/dd/yyyy", new Date());
    if (isValid(parsedDate)) {
      setDate(parsedDate);
      setMonth(parsedDate);
    }
  };

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      setInputValue(format(selectedDate, "MM/dd/yyyy"));
    } else {
      setInputValue("");
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            className="w-[280px] justify-start gap-0 pe-2 text-left font-normal"
            variant="outline"
          />
        }
      >
        <CalendarIcon className="me-2" />
        <Input
          className="h-auto grow border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          onChange={handleInputChange}
          onClick={(e) => e.stopPropagation()}
          placeholder="MM/DD/YYYY"
          value={inputValue}
        />
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          onSelect={handleSelect}
          selected={date}
        />
      </PopoverPopup>
    </Popover>
  );
}
