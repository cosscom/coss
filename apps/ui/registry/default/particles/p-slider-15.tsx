"use client";

import { useState } from "react";

import { Field } from "@/registry/default/ui/field";
import { FieldsetLegend } from "@/registry/default/ui/fieldset";
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
    <Field name="price-range">
      <FieldsetLegend className="font-medium text-sm tabular-nums">
        From {formatPrice(values[0] ?? min)} to {formatPrice(values[1] ?? max)}
      </FieldsetLegend>
      <Slider
        aria-label="Price range slider"
        className="flex-1"
        max={max}
        min={min}
        onValueChange={(v) => setValues(Array.isArray(v) ? [...v] : [v])}
        value={values}
      />
    </Field>
  );
}
