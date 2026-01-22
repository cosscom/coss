"use client";

import { useState } from "react";

import { Label } from "@/registry/default/ui/label";
import { Slider } from "@/registry/default/ui/slider";

export default function Particle() {
  const [value, setValue] = useState<number | readonly number[]>(25);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Label className="leading-6">Slider with output</Label>
        <output className="font-medium text-sm tabular-nums">
          {Array.isArray(value) ? value[0] : value}
        </output>
      </div>
      <Slider
        aria-label="Slider with output"
        onValueChange={setValue}
        value={value}
      />
    </div>
  );
}
