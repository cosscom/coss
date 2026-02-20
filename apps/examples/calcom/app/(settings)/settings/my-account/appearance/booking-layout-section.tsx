"use client";

import { Field } from "@coss/ui/components/field";
import { Fieldset } from "@coss/ui/components/fieldset";
import {
  Toggle,
  ToggleGroup,
  ToggleGroupSeparator,
} from "@coss/ui/components/toggle-group";
import { useState } from "react";
import { ImageCheckboxOption } from "@/components/particles";

const layoutItems = [
  {
    imageSrc: "https://app.cal.com/theme-light.svg",
    label: "Month",
    value: "month",
  },
  {
    imageSrc: "https://app.cal.com/theme-light.svg",
    label: "Weekly",
    value: "weekly",
  },
  {
    imageSrc: "https://app.cal.com/theme-light.svg",
    label: "Column",
    value: "column",
  },
];

export function BookingLayoutSection() {
  const [defaultView, setDefaultView] = useState("month");

  return (
    <div className="flex flex-col gap-6">
      <Field
        className="max-w-none gap-4"
        name="layout"
        render={(props) => <Fieldset {...props} />}
      >
        <ImageCheckboxOption
          defaultValue={["month", "weekly", "column"]}
          items={layoutItems}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="font-medium text-sm">Default view</span>
        <ToggleGroup
          onValueChange={(values) => values[0] && setDefaultView(values[0])}
          value={[defaultView]}
          variant="outline"
        >
          <Toggle aria-label="Month" value="month">
            Month
          </Toggle>
          <ToggleGroupSeparator />
          <Toggle aria-label="Weekly" value="weekly">
            Weekly
          </Toggle>
          <ToggleGroupSeparator />
          <Toggle aria-label="Column" value="column">
            Column
          </Toggle>
        </ToggleGroup>
      </div>
    </div>
  );
}
