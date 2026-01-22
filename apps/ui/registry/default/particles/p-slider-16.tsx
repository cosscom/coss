"use client";

import { useState } from "react";

import { Label } from "@/registry/default/ui/label";
import { Slider } from "@/registry/default/ui/slider";

const labels = ["Awful", "Poor", "Okay", "Good", "Amazing"];

export default function Particle() {
  const [value, setValue] = useState<number | readonly number[]>(3);

  const currentValue = Array.isArray(value) ? value[0] : value;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="leading-6">Rate your experience</Label>
        <span className="font-medium text-sm">{labels[currentValue - 1]}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-2xl">😡</span>
        <Slider
          aria-label="Rate your experience"
          max={5}
          min={1}
          onValueChange={setValue}
          value={value}
        />
        <span className="text-2xl">😍</span>
      </div>
    </div>
  );
}
