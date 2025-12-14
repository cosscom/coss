"use client";

import * as React from "react";

import { Button } from "@/registry/default/ui/button";
import { Field, FieldItem, FieldLabel } from "@/registry/default/ui/field";
import { Fieldset, FieldsetLegend } from "@/registry/default/ui/fieldset";
import { Form } from "@/registry/default/ui/form";
import { Radio, RadioGroup } from "@/registry/default/ui/radio-group";

export default function Particle() {
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    alert(`Selected: ${formData.get("frameworks")}`);
  };

  return (
    <Form className="max-w-[160px]" onSubmit={onSubmit}>
      <Field name="frameworks">
        <Fieldset
          className="gap-4"
          render={(props) => <RadioGroup {...props} defaultValue="next" />}
        >
          <FieldsetLegend className="font-medium text-sm">
            Frameworks
          </FieldsetLegend>
          <FieldItem>
            <Radio disabled={loading} value="next" />
            <FieldLabel>Next.js</FieldLabel>
          </FieldItem>
          <FieldItem>
            <Radio disabled={loading} value="vite" />
            <FieldLabel>Vite</FieldLabel>
          </FieldItem>
          <FieldItem>
            <Radio disabled={loading} value="astro" />
            <FieldLabel>Astro</FieldLabel>
          </FieldItem>
        </Fieldset>
      </Field>
      <Button disabled={loading} type="submit">
        Submit
      </Button>
    </Form>
  );
}
