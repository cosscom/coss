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

export default function Particle() {
  const [value, setValue] = useState<number | readonly number[]>(50);

  return (
    <div className="space-y-4">
      <Label>Slider with tooltip</Label>
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger
            className="w-full"
            render={
              <Slider
                aria-label="Slider with tooltip"
                onValueChange={setValue}
                value={value}
              />
            }
          />
          <TooltipPopup side="top" sideOffset={8}>
            {Array.isArray(value) ? value[0] : value}
          </TooltipPopup>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
