"use client";

import { useState } from "react";

import { Slider } from "@/registry/default/ui/slider";

const min = 5;
const max = 1240;

export default function Particle() {
  const [values, setValues] = useState([min, max]);

  const formatPrice = (price: number) =>
    price === max
      ? `$${price.toLocaleString()}+`
      : `$${price.toLocaleString()}`;

  return (
    <div className="space-y-3">
      <div
        className="font-medium text-base/4.5 text-foreground tabular-nums sm:text-sm/4"
        id="price-range-label"
      >
        From {formatPrice(values[0] ?? min)} to {formatPrice(values[1] ?? max)}
      </div>
      <Slider
        aria-labelledby="price-range-label"
        className="flex-1"
        max={max}
        min={min}
        name="price-range"
        onValueChange={(v) => setValues(Array.isArray(v) ? [...v] : [v])}
        value={values}
      />
    </div>
  );
}
