"use client";

import { RotateCcwIcon } from "lucide-react";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/registry/default/ui/button";
import { Input } from "@/registry/default/ui/input";
import { Label } from "@/registry/default/ui/label";
import { Slider } from "@/registry/default/ui/slider";

function useSliderWithInput({
  minValue,
  maxValue,
  initialValue,
  defaultValue,
}: {
  minValue: number;
  maxValue: number;
  initialValue: number;
  defaultValue: number;
}) {
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
    [sliderValue, minValue, maxValue],
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

  const resetToDefault = useCallback(() => {
    setSliderValue(defaultValue);
    setInputValue(defaultValue.toString());
  }, [defaultValue]);

  return {
    handleInputChange,
    handleSliderChange,
    inputValue,
    resetToDefault,
    sliderValue,
    validateAndUpdateValue,
  };
}

function SliderWithInput({
  minValue,
  maxValue,
  initialValue,
  defaultValue,
  label,
  onRegisterReset,
}: {
  minValue: number;
  maxValue: number;
  initialValue: number;
  defaultValue: number;
  label: string;
  onRegisterReset: (resetFn: () => void) => void;
}) {
  const {
    sliderValue,
    inputValue,
    validateAndUpdateValue,
    handleInputChange,
    handleSliderChange,
    resetToDefault,
  } = useSliderWithInput({ defaultValue, initialValue, maxValue, minValue });

  useEffect(() => {
    onRegisterReset(resetToDefault);
  }, [onRegisterReset, resetToDefault]);

  return (
    <div className="flex items-center gap-2">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <Slider
        aria-label={label}
        className="grow"
        max={maxValue}
        min={minValue}
        onValueChange={handleSliderChange}
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
  );
}

export default function Particle() {
  const resetFunctionsRef = useRef<(() => void)[]>([]);

  const resetAll = () => {
    for (const resetFn of resetFunctionsRef.current) {
      resetFn();
    }
  };

  const registerResetFunction = (resetFn: () => void, index: number) => {
    resetFunctionsRef.current[index] = resetFn;
  };

  return (
    <div className="space-y-4">
      <legend className="font-medium text-foreground text-sm">
        Object position
      </legend>
      <div className="space-y-2">
        <SliderWithInput
          defaultValue={0}
          initialValue={-2}
          label="X"
          maxValue={10}
          minValue={-10}
          onRegisterReset={(resetFn) => registerResetFunction(resetFn, 0)}
        />
        <SliderWithInput
          defaultValue={0}
          initialValue={4}
          label="Y"
          maxValue={10}
          minValue={-10}
          onRegisterReset={(resetFn) => registerResetFunction(resetFn, 1)}
        />
        <SliderWithInput
          defaultValue={0}
          initialValue={2}
          label="Z"
          maxValue={10}
          minValue={-10}
          onRegisterReset={(resetFn) => registerResetFunction(resetFn, 2)}
        />
      </div>
      <Button className="w-full" onClick={resetAll} variant="outline">
        <RotateCcwIcon aria-hidden="true" className="-ms-1 opacity-60" />
        Reset
      </Button>
    </div>
  );
}
