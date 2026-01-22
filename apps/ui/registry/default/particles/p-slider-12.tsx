"use client";

import { Volume2Icon, VolumeXIcon } from "lucide-react";
import { useState } from "react";

import { Label } from "@/registry/default/ui/label";
import { Slider } from "@/registry/default/ui/slider";

export default function Particle() {
  const [value, setValue] = useState<number | readonly number[]>(25);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="leading-6">Volume</Label>
        <output className="font-medium text-sm tabular-nums">
          {Array.isArray(value) ? value[0] : value}
        </output>
      </div>
      <div className="flex items-center gap-2">
        <VolumeXIcon
          aria-hidden="true"
          className="size-4 shrink-0 opacity-60"
        />
        <Slider
          aria-label="Volume slider"
          onValueChange={setValue}
          value={value}
        />
        <Volume2Icon
          aria-hidden="true"
          className="size-4 shrink-0 opacity-60"
        />
      </div>
    </div>
  );
}
