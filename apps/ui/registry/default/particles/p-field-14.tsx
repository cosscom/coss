"use client";

import {
  Field,
  FieldDescription,
  FieldItem,
  FieldLabel,
} from "@/registry/default/ui/field";
import { Fieldset, FieldsetLegend } from "@/registry/default/ui/fieldset";
import { Radio, RadioGroup } from "@/registry/default/ui/radio-group";

export default function Particle() {
  return (
    <Field name="plan">
      <Fieldset
        className="gap-4"
        render={(props) => <RadioGroup {...props} defaultValue="free" />}
      >
        <FieldsetLegend className="font-medium text-sm">
          Choose Plan
        </FieldsetLegend>
        <FieldItem>
          <Radio value="free" />
          <FieldLabel>Free</FieldLabel>
        </FieldItem>
        <FieldItem>
          <Radio value="pro" />
          <FieldLabel>Pro</FieldLabel>
        </FieldItem>
        <FieldItem>
          <Radio value="enterprise" />
          <FieldLabel>Enterprise</FieldLabel>
        </FieldItem>
      </Fieldset>
      <FieldDescription>Select the plan that fits your needs.</FieldDescription>
    </Field>
  );
}
