"use client";

import { useState } from "react";

import { Calendar } from "@/registry/default/ui/calendar";

export default function Component() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div>
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border p-2"
      />
      <p
        className="mt-4 text-center text-muted-foreground text-xs"
        role="region"
        aria-live="polite"
      >
        Calendar -{" "}
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
