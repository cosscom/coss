"use client";

import { addDays } from "date-fns";
import { useState } from "react";

import { Button } from "@/registry/default/ui/button";
import { Calendar } from "@/registry/default/ui/calendar";

export default function Component() {
  const today = new Date();
  const selectedDay = addDays(today, -28);
  const [month, setMonth] = useState(selectedDay);
  const [date, setDate] = useState<Date | undefined>(selectedDay);

  return (
    <div>
      <div className="rounded-md border p-2">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          month={month}
          onMonthChange={setMonth}
        />
        <Button
          variant="outline"
          size="sm"
          className="mt-2 mb-1"
          onClick={() => setMonth(today)}
        >
          Current month
        </Button>
      </div>
      <p
        className="mt-4 text-center text-muted-foreground text-xs"
        role="region"
        aria-live="polite"
      >
        With button -{" "}
        <a
          className="underline hover:text-foreground"
          href="https://daypicker.dev/"
          target="_blank"
          rel="noreferrer noopener nofollow"
        >
          React DayPicker
        </a>
      </p>
    </div>
  );
}
