"use client";

import { useState } from "react";

import { Label } from "@/registry/default/ui/label";
import { Slider } from "@/registry/default/ui/slider";
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/default/ui/tooltip";

const emojis = ["😡", "🙁", "😐", "🙂", "😍"];
const labels = ["Awful", "Poor", "Okay", "Good", "Amazing"];

export default function Particle() {
  const [value, setValue] = useState<number | readonly number[]>(3);

  const currentValue = Array.isArray(value) ? value[0] : value;

  return (
    <div className="space-y-3">
      <Label>Rate your experience</Label>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip open>
            <TooltipTrigger
              className="grow"
              render={
                <Slider
                  aria-label="Rate your experience"
                  max={5}
                  min={1}
                  onValueChange={setValue}
                  value={value}
                />
              }
            />
            <TooltipPopup side="top" sideOffset={8}>
              {labels[currentValue - 1]}
            </TooltipPopup>
          </Tooltip>
        </TooltipProvider>
        <span className="text-2xl">{emojis[currentValue - 1]}</span>
      </div>
    </div>
  );
}
