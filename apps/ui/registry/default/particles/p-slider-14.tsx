"use client";

import { RotateCcwIcon } from "lucide-react";
import type { ChangeEvent } from "react";
import { useCallback, useRef, useState } from "react";

import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";
import { Input } from "@/registry/default/ui/input";
import { Label } from "@/registry/default/ui/label";
import { Slider } from "@/registry/default/ui/slider";
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/default/ui/tooltip";

const minValue = 0;
const maxValue = 2;
const initialValue = 1.25;
const defaultValue = 1;

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

  const currentSliderValue = extractValue(sliderValue);
  const showReset = currentSliderValue !== defaultValue;

  const validateAndUpdateValue = useCallback(
    (rawValue: string) => {
      if (rawValue === "" || rawValue === "-") {
        setInputValue("0");
        setSliderValue(0);
        return;
      }

      const numValue = Number.parseFloat(rawValue);

      if (Number.isNaN(numValue)) {
        // Use ref to avoid stale closure
        const currentValue = extractValue(sliderValueRef.current);
        setInputValue(currentValue.toString());
        return;
      }

      const clampedValue = Math.min(maxValue, Math.max(minValue, numValue));
      setSliderValue(clampedValue);
      setInputValue(clampedValue.toString());
    },
    [maxValue, minValue],
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
      const val = extractValue(newValue);
      setInputValue(val.toString());
    },
    [],
  );

  const resetToDefault = useCallback(() => {
    setSliderValue(defaultValue);
    setInputValue(defaultValue.toString());
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Temperature</Label>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label="Reset"
                    className={cn(
                      "size-7 transition-opacity",
                      showReset ? "opacity-100" : "opacity-0",
                    )}
                    onClick={resetToDefault}
                    size="icon"
                    variant="ghost"
                  />
                }
              >
                <RotateCcwIcon aria-hidden="true" />
              </TooltipTrigger>
              <TooltipPopup className="px-2 py-1 text-xs">
                Reset to default
              </TooltipPopup>
            </Tooltip>
          </TooltipProvider>
          <Input
            aria-label="Enter temperature value"
            className="h-7 w-12 px-2 py-0"
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
      <div className="flex items-center gap-4">
        <Slider
          aria-label="Temperature"
          className="grow"
          max={maxValue}
          min={minValue}
          onValueChange={handleSliderChange}
          step={0.01}
          value={sliderValue}
        />
      </div>
    </div>
  );
}
