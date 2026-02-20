"use client";

import { Field } from "@coss/ui/components/field";
import { Fieldset } from "@coss/ui/components/fieldset";
import {
  Toggle,
  ToggleGroup,
  ToggleGroupSeparator,
} from "@coss/ui/components/toggle-group";
import { useCallback, useState } from "react";
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

const initialLayouts = ["month", "weekly", "column"];

export function BookingLayoutSection() {
  const [enabledLayouts, setEnabledLayouts] = useState(initialLayouts);
  const [defaultView, setDefaultView] = useState("month");

  const handleValueChange = useCallback((newValue: string[]) => {
    setEnabledLayouts(newValue);
    setDefaultView((prev) => {
      if (newValue.length === 0) return prev;
      if (newValue.includes(prev)) return prev;
      return newValue[0]!;
    });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <Field
        className="max-w-none gap-4"
        name="layout"
        render={(props) => <Fieldset {...props} />}
      >
        <ImageCheckboxOption
          defaultItem={defaultView}
          items={layoutItems}
          onValueChange={handleValueChange}
          value={enabledLayouts}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="font-medium text-sm">Default view</span>
        <ToggleGroup
          onValueChange={(values) => values[0] && setDefaultView(values[0])}
          value={[defaultView]}
          variant="outline"
        >
          <Toggle
            aria-label="Month"
            disabled={!enabledLayouts.includes("month")}
            value="month"
          >
            Month
          </Toggle>
          <ToggleGroupSeparator />
          <Toggle
            aria-label="Weekly"
            disabled={!enabledLayouts.includes("weekly")}
            value="weekly"
          >
            Weekly
          </Toggle>
          <ToggleGroupSeparator />
          <Toggle
            aria-label="Column"
            disabled={!enabledLayouts.includes("column")}
            value="column"
          >
            Column
          </Toggle>
        </ToggleGroup>
      </div>
    </div>
  );
}
