"use client";

import type { ChangeEvent } from "react";

import { useCallback, useRef, useState } from "react";

import { Input } from "@/registry/default/ui/input";
import { Slider } from "@/registry/default/ui/slider";

const minValue = 0;
const maxValue = 200;
const initialValue = [50, 150];

function extractValues(value: number | readonly number[]): number[] {
  return Array.isArray(value) ? [...value] : [value];
}

export default function Particle() {
  const [sliderValue, setSliderValue] = useState<number | readonly number[]>(
    initialValue,
  );
  const [inputValues, setInputValues] = useState(
    initialValue.map((v) => v.toString()),
  );
  const sliderValueRef = useRef(sliderValue);
  const inputValuesRef = useRef(inputValues);

  sliderValueRef.current = sliderValue;
  inputValuesRef.current = inputValues;

  const validateAndUpdateValue = useCallback(
    (rawValue: string, index: number) => {
      const currentSliderValues = extractValues(sliderValueRef.current);

      if (rawValue === "" || rawValue === "-") {
        const newInputValues = [...inputValuesRef.current];
        newInputValues[index] = "0";
        setInputValues(newInputValues);

        const newSliderValues = [...currentSliderValues];
        newSliderValues[index] = 0;
        setSliderValue(newSliderValues);
        return;
      }

      const numValue = Number.parseFloat(rawValue);

      if (Number.isNaN(numValue)) {
        const newInputValues = [...inputValuesRef.current];
        newInputValues[index] = currentSliderValues[index]?.toString() ?? "0";
        setInputValues(newInputValues);
        return;
      }

      let clampedValue = Math.min(maxValue, Math.max(minValue, numValue));

      if (currentSliderValues.length > 1) {
        if (index === 0) {
          clampedValue = Math.min(clampedValue, currentSliderValues[1]);
        } else {
          clampedValue = Math.max(clampedValue, currentSliderValues[0]);
        }
      }

      const newSliderValues = [...currentSliderValues];
      newSliderValues[index] = clampedValue;
      setSliderValue(newSliderValues);

      const newInputValues = [...inputValuesRef.current];
      newInputValues[index] = clampedValue.toString();
      setInputValues(newInputValues);
    },
    [maxValue, minValue],
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>, index: number) => {
      const newValue = e.target.value;
      if (newValue === "" || /^-?\d*\.?\d*$/.test(newValue)) {
        const newInputValues = [...inputValuesRef.current];
        newInputValues[index] = newValue;
        setInputValues(newInputValues);
      }
    },
    [],
  );

  const handleSliderChange = useCallback(
    (newValue: number | readonly number[]) => {
      setSliderValue(newValue);
      const values = extractValues(newValue);
      setInputValues(values.map((v) => v.toString()));
    },
    [],
  );

  return (
    <div className="flex items-center gap-4">
      <Input
        aria-label="Enter minimum value"
        className="h-8 w-12 px-2 py-1"
        inputMode="decimal"
        onBlur={() => validateAndUpdateValue(inputValues[0] ?? "0", 0)}
        onChange={(e) => handleInputChange(e, 0)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            validateAndUpdateValue(inputValues[0] ?? "0", 0);
          }
        }}
        type="text"
        value={inputValues[0] ?? "0"}
      />
      <Slider
        aria-label="Dual range slider with input"
        className="grow"
        max={maxValue}
        min={minValue}
        onValueChange={handleSliderChange}
        value={sliderValue}
      />
      <Input
        aria-label="Enter maximum value"
        className="h-8 w-12 px-2 py-1"
        inputMode="decimal"
        onBlur={() => validateAndUpdateValue(inputValues[1] ?? "0", 1)}
        onChange={(e) => handleInputChange(e, 1)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            validateAndUpdateValue(inputValues[1] ?? "0", 1);
          }
        }}
        type="text"
        value={inputValues[1] ?? "0"}
      />
    </div>
  );
}
