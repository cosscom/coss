"use client";
import * as React from "react";

import { Calendar } from "@/registry/default/ui/calendar";

export default function Particle() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  return (
    <Calendar
      className="[--cell-size:--spacing(9)]"
      mode="single"
      onSelect={setDate}
      selected={date}
    />
  );
}
