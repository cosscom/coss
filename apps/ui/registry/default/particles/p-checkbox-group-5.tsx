"use client";

import * as React from "react";

import { Button } from "@/registry/default/ui/button";
import { Checkbox } from "@/registry/default/ui/checkbox";
import { CheckboxGroup } from "@/registry/default/ui/checkbox-group";
import {
  Field,
  FieldDescription,
  FieldItem,
  FieldLabel,
} from "@/registry/default/ui/field";
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
    <Form className="max-w-xl" onSubmit={onSubmit}>
      <Field name="frameworks">
        <Fieldset
          className="gap-4"
          render={<CheckboxGroup defaultValue={["next"]} disabled={loading} />}
        >
          <FieldsetLegend className="font-medium text-sm">
            Frameworks
          </FieldsetLegend>
          <FieldItem>
            <Checkbox value="next" />
            <div className="flex flex-col items-start gap-2">
              <FieldLabel>Next.js</FieldLabel>
              <FieldDescription>
                Next.js is a React framework for building web applications.
              </FieldDescription>
            </div>
          </FieldItem>
          <FieldItem>
            <Checkbox value="vite" />
            <FieldLabel>Vite</FieldLabel>
          </FieldItem>
          <FieldItem>
            <Checkbox value="astro" />
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
