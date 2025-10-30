"use client"

import { useState } from "react"
import { getLocalTimeZone, today } from "@internationalized/date"
import type { DateValue } from "react-aria-components"

import { Calendar } from "@/registry/default/ui/calendar-rac"

export default function Component() {
  const [date, setDate] = useState<DateValue | null>(today(getLocalTimeZone()))

  return (
    <div>
      <Calendar
        className="rounded-md border p-2"
        value={date}
        onChange={setDate}
      />
      <p
        className="mt-4 text-center text-xs text-muted-foreground"
        role="region"
        aria-live="polite"
      >
        Calendar -{" "}
        <a
          className="underline hover:text-foreground"
          href="https://react-spectrum.adobe.com/react-aria/DateRangePicker.html"
          target="_blank"
          rel="noopener nofollow"
        >
          React Aria
        </a>
      </p>
    </div>
  )
}
