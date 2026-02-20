"use client";

import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@coss/ui/components/collapsible";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { Switch } from "@coss/ui/components/switch";
import { useState } from "react";

export function CustomBrandColorsSection() {
  const [enabled, setEnabled] = useState(false);

  return (
    <Collapsible onOpenChange={setEnabled} open={enabled}>
      <Field>
        <FieldLabel>
          <CollapsibleTrigger
            nativeButton={false}
            render={<Switch checked={enabled} onCheckedChange={setEnabled} />}
          />
          Enable custom brand colors
        </FieldLabel>
      </Field>
      <CollapsiblePanel>
        <div className="mt-4 flex flex-col items-start gap-4">
          <Field>
            <FieldLabel>Brand color (light theme)</FieldLabel>
            <Input placeholder="#000000" type="text" />
          </Field>
          <Field>
            <FieldLabel>Brand color (dark theme)</FieldLabel>
            <Input placeholder="#000000" type="text" />
          </Field>
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}
