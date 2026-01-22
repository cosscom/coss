"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/registry/default/ui/button";
import { Form } from "@/registry/default/ui/form";
import { Slider, SliderValue } from "@/registry/default/ui/slider";

export default function Particle() {
  const [loading, setLoading] = useState<boolean>(false);
  const [value, setValue] = useState<number | readonly number[]>([25, 75]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    const volumes = formData.getAll("volume");
    alert(`Volume: ${volumes.join(", ")}`);
  };

  return (
    <Form onSubmit={onSubmit}>
      <div className="flex flex-col items-start gap-3">
        <Slider
          aria-labelledby="volume-label"
          disabled={loading}
          name="volume"
          onValueChange={setValue}
          value={value}
        >
          <div className="mb-2 flex items-center justify-between gap-1">
            <span
              className="font-medium text-base/4.5 text-foreground sm:text-sm/4"
              id="volume-label"
            >
              Volume
            </span>
            <SliderValue />
          </div>
        </Slider>
        <p className="text-muted-foreground text-xs">
          Choose a value between 0 and 100
        </p>
      </div>
      <Button disabled={loading} type="submit">
        Submit
      </Button>
    </Form>
  );
}
