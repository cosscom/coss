"use client";

import { Checkbox } from "@/registry/default/ui/checkbox";
import { CheckboxGroup } from "@/registry/default/ui/checkbox-group";
import { Field, FieldItem, FieldLabel } from "@/registry/default/ui/field";
import { Fieldset, FieldsetLegend } from "@/registry/default/ui/fieldset";

export default function Particle() {
  return (
    <Field name="frameworks">
      <Fieldset
        className="gap-4"
        render={<CheckboxGroup defaultValue={["react"]} />}
      >
        <FieldsetLegend className="font-medium text-sm">
          Frameworks
        </FieldsetLegend>
        <FieldItem>
          <Checkbox value="react" />
          <FieldLabel>React</FieldLabel>
        </FieldItem>
        <FieldItem>
          <Checkbox value="vue" />
          <FieldLabel>Vue</FieldLabel>
        </FieldItem>
        <FieldItem>
          <Checkbox value="svelte" />
          <FieldLabel>Svelte</FieldLabel>
        </FieldItem>
      </Fieldset>
    </Field>
  );
}
