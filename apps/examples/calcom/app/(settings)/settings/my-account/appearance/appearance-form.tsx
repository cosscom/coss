"use client";

import { Field } from "@coss/ui/components/field";
import { Fieldset } from "@coss/ui/components/fieldset";
import { ImageRadioOption } from "@/components/particles";

const themeItems = [
  {
    imageSrc: "https://app.cal.com/theme-system.svg",
    label: "System default",
    value: "system",
  },
  {
    imageSrc: "https://app.cal.com/theme-light.svg",
    label: "Light",
    value: "light",
  },
  {
    imageSrc: "https://app.cal.com/theme-dark.svg",
    label: "Dark",
    value: "dark",
  },
];

export function DashboardThemeSection() {
  return (
    <Field
      className="max-w-none gap-4"
      name="dashboardTheme"
      render={(props) => <Fieldset {...props} />}
    >
      <ImageRadioOption defaultValue="light" items={themeItems} />
    </Field>
  );
}

export function BookingThemeSection() {
  return (
    <Field
      className="max-w-none gap-4"
      name="theme"
      render={(props) => <Fieldset {...props} />}
    >
      <ImageRadioOption defaultValue="light" items={themeItems} />
    </Field>
  );
}
