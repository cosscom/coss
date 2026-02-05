"use client";

import { useState } from "react";

import { Calendar } from "@/registry/default/ui/calendar";

export default function Particle() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <Calendar
      classNames={{
        month_caption: "ms-2.5 me-20 justify-start",
        nav: "justify-end",
      }}
      mode="single"
      onSelect={setDate}
      selected={date}
    />
  );
}
