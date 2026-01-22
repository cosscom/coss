"use client";

import { useState } from "react";

import { Button } from "@/registry/default/ui/button";
import { Label } from "@/registry/default/ui/label";
import { Slider } from "@/registry/default/ui/slider";

const minPrice = 5;
const maxPrice = 1240;

export default function Particle() {
  const [value, setValue] = useState<number | readonly number[]>([
    minPrice,
    maxPrice,
  ]);

  const values = Array.isArray(value) ? value : [value];

  const formatPrice = (price: number) => {
    return price === maxPrice
      ? `$${price.toLocaleString()}+`
      : `$${price.toLocaleString()}`;
  };

  return (
    <div className="space-y-3">
      <Label className="tabular-nums">
        From {formatPrice(values[0])} to {formatPrice(values[1])}
      </Label>
      <div className="flex items-center gap-4">
        <Slider
          aria-label="Price range slider"
          max={maxPrice}
          min={minPrice}
          onValueChange={setValue}
          value={value}
        />
        <Button variant="outline">Go</Button>
      </div>
    </div>
  );
}
