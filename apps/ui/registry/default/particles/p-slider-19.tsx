"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/registry/default/ui/button";
import { Label } from "@/registry/default/ui/label";
import { Slider } from "@/registry/default/ui/slider";

const minValue = 0;
const maxValue = 200;
const steps = 5;

export default function Particle() {
  const [value, setValue] = useState<number | readonly number[]>(100);

  const currentValue = Array.isArray(value) ? value[0] : value;

  const decreaseValue = () =>
    setValue(Math.max(minValue, currentValue - steps));
  const increaseValue = () =>
    setValue(Math.min(maxValue, currentValue + steps));

  return (
    <div className="space-y-3">
      <Label className="tabular-nums">{currentValue} credits/mo</Label>
      <div className="flex items-center gap-4">
        <div>
          <Button
            aria-label="Decrease value"
            className="size-8"
            disabled={currentValue === minValue}
            onClick={decreaseValue}
            size="icon"
            variant="outline"
          >
            <MinusIcon aria-hidden="true" />
          </Button>
        </div>
        <Slider
          aria-label="Slider with buttons"
          className="grow"
          max={maxValue}
          min={minValue}
          onValueChange={setValue}
          step={steps}
          value={value}
        />
        <div>
          <Button
            aria-label="Increase value"
            className="size-8"
            disabled={currentValue === maxValue}
            onClick={increaseValue}
            size="icon"
            variant="outline"
          >
            <PlusIcon aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
