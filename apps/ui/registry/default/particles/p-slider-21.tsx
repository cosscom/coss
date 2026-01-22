"use client";

import type { ChangeEvent } from "react";

import { useCallback, useState } from "react";

import { Input } from "@/registry/default/ui/input";
import { Label } from "@/registry/default/ui/label";
import { Slider } from "@/registry/default/ui/slider";

const minValue = 0;
const maxValue = 100;
const initialValue = 25;

export default function Particle() {
  const [sliderValue, setSliderValue] = useState<number | readonly number[]>(
    initialValue,
  );
  const [inputValue, setInputValue] = useState(initialValue.toString());

  const validateAndUpdateValue = useCallback(
    (rawValue: string) => {
      if (rawValue === "" || rawValue === "-") {
        setInputValue("0");
        setSliderValue(0);
        return;
      }

      const numValue = Number.parseFloat(rawValue);

      if (Number.isNaN(numValue)) {
        const currentValue = Array.isArray(sliderValue)
          ? sliderValue[0]
          : sliderValue;
        setInputValue(currentValue.toString());
        return;
      }

      const clampedValue = Math.min(maxValue, Math.max(minValue, numValue));
      setSliderValue(clampedValue);
      setInputValue(clampedValue.toString());
    },
    [sliderValue],
  );

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue === "" || /^-?\d*\.?\d*$/.test(newValue)) {
      setInputValue(newValue);
    }
  }, []);

  const handleSliderChange = useCallback(
    (newValue: number | readonly number[]) => {
      setSliderValue(newValue);
      const val = Array.isArray(newValue) ? newValue[0] : newValue;
      setInputValue(val.toString());
    },
    [],
  );

  return (
    <div className="space-y-4">
      <Label>Vertical slider with input</Label>
      <div className="flex h-40 flex-col items-center justify-center gap-4">
        <Slider
          aria-label="Slider with input"
          className="data-[orientation=vertical]:min-h-0"
          max={maxValue}
          min={minValue}
          onValueChange={handleSliderChange}
          orientation="vertical"
          value={sliderValue}
        />
        <Input
          aria-label="Enter value"
          className="h-8 w-12 px-2 py-1"
          inputMode="decimal"
          onBlur={() => validateAndUpdateValue(inputValue)}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              validateAndUpdateValue(inputValue);
            }
          }}
          type="text"
          value={inputValue}
        />
      </div>
    </div>
  );
}
