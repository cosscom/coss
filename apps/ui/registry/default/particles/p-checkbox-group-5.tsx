"use client";

import * as React from "react";

import { Button } from "@/registry/default/ui/button";
import { Checkbox } from "@/registry/default/ui/checkbox";
import { CheckboxGroup } from "@/registry/default/ui/checkbox-group";
import { Field, FieldLabel } from "@/registry/default/ui/field";
import { Fieldset, FieldsetLegend } from "@/registry/default/ui/fieldset";
import { Form } from "@/registry/default/ui/form";

export default function Particle() {
  const [loading, setLoading] = React.useState(false);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    const frameworks = formData.getAll("frameworks") as string[];
    alert(`Selected: ${frameworks.join(", ") || "none"}`);
  };

  return (
    <Form className="max-w-[160px]" onSubmit={onSubmit}>
      <Fieldset className="gap-4">
        <FieldsetLegend className="font-medium text-sm">
          Frameworks
        </FieldsetLegend>
        <CheckboxGroup defaultValue={["next"]} disabled={loading}>
          <Field name="frameworks">
            <FieldLabel>
              <Checkbox value="next" />
              Next.js
            </FieldLabel>
          </Field>
          <Field name="frameworks">
            <FieldLabel>
              <Checkbox value="vite" />
              Vite
            </FieldLabel>
          </Field>
          <Field name="frameworks">
            <FieldLabel>
              <Checkbox value="astro" />
              Astro
            </FieldLabel>
          </Field>
        </CheckboxGroup>
      </Fieldset>
      <Button disabled={loading} type="submit">
        Submit
      </Button>
    </Form>
  );
}
