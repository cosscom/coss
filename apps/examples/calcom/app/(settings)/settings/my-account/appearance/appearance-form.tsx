"use client";

import { Field, FieldItem, FieldLabel } from "@coss/ui/components/field";
import { Fieldset, FieldsetLegend } from "@coss/ui/components/fieldset";
import { Radio, RadioGroup } from "@coss/ui/components/radio-group";
import Image from "next/image";

const items = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
] as const;

const themePreviewUrls = {
  dark: "https://app.cal.com/theme-dark.svg",
  light: "https://app.cal.com/theme-light.svg",
  system: "https://app.cal.com/theme-system.svg",
} as const;

export function AppearanceForm() {
  return (
    <Field
      className="max-w-none gap-4"
      name="theme"
      render={(props) => <Fieldset {...props} />}
    >
      <div>
        <FieldsetLegend className="font-medium text-sm">
          Choose a theme
        </FieldsetLegend>
        <p className="text-muted-foreground text-sm">
          This only applies to your logged in dashboard
        </p>
      </div>
      <RadioGroup className="w-full flex-row gap-4" defaultValue="system">
        {items.map((item) => (
          <FieldItem className="flex-1" key={item.value}>
            <FieldLabel className="flex w-full cursor-pointer flex-col gap-3">
              <Radio className="peer sr-only absolute" value={item.value} />
              <span className="relative block w-full overflow-hidden rounded-lg not-peer-data-checked:opacity-80 shadow-xs transition-[box-shadow,opacity] peer-data-disabled:cursor-not-allowed peer-data-disabled:opacity-64 peer-data-checked:ring-2 peer-data-checked:ring-primary peer-data-checked:ring-offset-2 peer-data-checked:ring-offset-background">
                <Image
                  alt={item.label}
                  className="w-full object-cover shadow-xs"
                  height={120}
                  src={themePreviewUrls[item.value]}
                  width={208}
                />
              </span>
              <span className="not-peer-data-checked:text-muted-foreground/72">
                {item.label}
              </span>
            </FieldLabel>
          </FieldItem>
        ))}
      </RadioGroup>
    </Field>
  );
}
