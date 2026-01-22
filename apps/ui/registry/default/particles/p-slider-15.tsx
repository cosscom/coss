"use client";

import type { ChangeEvent } from "react";

import { useCallback, useRef, useState } from "react";

import { Input } from "@/registry/default/ui/input";
import { Slider } from "@/registry/default/ui/slider";

const minValue = 0;
const maxValue = 100;
const initialValue = 25;

function extractValue(value: number | readonly number[]): number {
  if (Array.isArray(value)) {
    return (value[0] ?? 0) as number;
  }
  return value as number;
}

export default function Particle() {
  const [sliderValue, setSliderValue] = useState<number | readonly number[]>(
    initialValue,
  );
  const [inputValue, setInputValue] = useState(initialValue.toString());
  const sliderValueRef = useRef(sliderValue);

  sliderValueRef.current = sliderValue;

  const validateAndUpdateValue = useCallback((rawValue: string) => {
    if (rawValue === "" || rawValue === "-") {
      setInputValue("0");
      setSliderValue(0);
      return;
    }

    const numValue = Number.parseFloat(rawValue);

    if (Number.isNaN(numValue)) {
      const currentValue = extractValue(sliderValueRef.current);
      setInputValue(currentValue.toString());
      return;
    }

    const clampedValue = Math.min(maxValue, Math.max(minValue, numValue));
    setSliderValue(clampedValue);
    setInputValue(clampedValue.toString());
  }, []);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue === "" || /^-?\d*\.?\d*$/.test(newValue)) {
      setInputValue(newValue);
    }
  }, []);

  const handleSliderChange = useCallback(
    (newValue: number | readonly number[]) => {
      setSliderValue(newValue);
      const val = extractValue(newValue);
      setInputValue(val.toString());
    },
    [],
  );

  return (
    <div className="flex items-center gap-4">
      <Slider
        aria-label="Slider with input"
        className="grow"
        max={maxValue}
        min={minValue}
        onValueChange={handleSliderChange}
        value={sliderValue}
      />
      <Input
        aria-label="Enter slider value"
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
  );
}
