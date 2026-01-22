"use client";

import { useState } from "react";

import { Button } from "@/registry/default/ui/button";
import { Field, FieldLabel } from "@/registry/default/ui/field";
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
    <Field className="space-y-3" name="price-range">
      <FieldLabel className="tabular-nums">
        From {formatPrice(values[0] ?? min)} to {formatPrice(values[1] ?? max)}
      </FieldLabel>
      <div className="flex items-center gap-4">
        <Slider
          aria-label="Price range slider"
          className="flex-1"
          max={max}
          min={min}
          onValueChange={(v) => setValues(Array.isArray(v) ? [...v] : [v])}
          value={values}
        />
        <Button variant="outline">Go</Button>
      </div>
    </Field>
  );
}
