"use client";

import { useState } from "react";

import {
  NumberField,
  NumberFieldGroup,
  NumberFieldInput,
} from "@/registry/default/ui/number-field";
import { Slider } from "@/registry/default/ui/slider";

const min = 0;
const max = 50;

export default function Particle() {
  const [values, setValues] = useState([0, 20]);

  // Clamp values to ensure they're always within the valid range
  const clampedValues = [
    Math.max(min, Math.min(values[0] ?? min, max)),
    Math.max(min, Math.min(values[1] ?? max, max)),
  ];

  const updateValue = (index: number, newValue: number | null) => {
    const v = newValue ?? min;
    setValues((prev) => {
      const next = [...prev];
      if (index === 0) {
        // Min value: clamp between slider min and the minimum of (other thumb's value, max)
        next[0] = Math.max(min, Math.min(v, Math.min(prev[1] ?? max, max)));
      } else {
        // Max value: clamp between the maximum of (other thumb's value, min) and slider max
        next[1] = Math.min(max, Math.max(v, Math.max(prev[0] ?? min, min)));
      }
      return next;
    });
  };

  const handleSliderChange = (v: number | readonly number[]) => {
    const arr = Array.isArray(v) ? [...v] : [v];
    // Clamp all values to ensure they're within the valid range
    setValues(arr.map((val) => Math.max(min, Math.min(val, max))));
  };

  return (
    <div className="flex items-center gap-2">
      <NumberField
        aria-label="Minimum value"
        className="w-10"
        max={clampedValues[1]}
        min={min}
        onValueChange={(v) => updateValue(0, v)}
        render={<NumberFieldGroup />}
        size="sm"
        value={clampedValues[0]}
      >
        <NumberFieldInput />
      </NumberField>
      <Slider
        aria-label="Dual range slider"
        className="flex-1 *:min-w-0!"
        max={max}
        min={min}
        onValueChange={handleSliderChange}
        value={clampedValues}
      />
      <NumberField
        aria-label="Maximum value"
        className="w-10"
        max={max}
        min={clampedValues[0]}
        onValueChange={(v) => updateValue(1, v)}
        render={<NumberFieldGroup />}
        size="sm"
        value={clampedValues[1]}
      >
        <NumberFieldInput />
      </NumberField>
    </div>
  );
}
