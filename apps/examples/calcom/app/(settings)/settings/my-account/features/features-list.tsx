"use client";

import { Field, FieldLabel } from "@coss/ui/components/field";
import { Switch } from "@coss/ui/components/switch";
import { toastManager } from "@coss/ui/components/toast";
import { ToggleGroup, ToggleGroupItem } from "@coss/ui/components/toggle-group";
import { useState } from "react";

interface Feature {
  slug: string;
  name: string;
  description: string;
}

const features: Feature[] = [
  {
    description:
      "Try the redesigned bookings page with improved navigation and filtering.",
    name: "New bookings experience",
    slug: "bookings-v3",
  },
];

type FeatureState = "disabled" | "enabled" | "inherit";

export function FeaturesList() {
  const [featureStates, setFeatureStates] = useState<
    Record<string, FeatureState>
  >({
    "bookings-v3": "inherit",
  });

  function handleFeatureChange(slug: string, values: readonly string[]) {
    const newValue = values[0];
    if (!newValue) return;
    const state = newValue as FeatureState;
    setFeatureStates((prev) => ({ ...prev, [slug]: state }));
    toastManager.add({
      title: `Feature "${features.find((f) => f.slug === slug)?.name}" set to ${state}`,
      type: "success",
    });
  }

  return (
    <div className="space-y-6">
      {features.map((feature) => (
        <div
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          key={feature.slug}
        >
          <div>
            <p className="font-medium text-sm">{feature.name}</p>
            <p className="text-muted-foreground text-sm">
              {feature.description}
            </p>
          </div>
          <ToggleGroup
            className="shrink-0"
            onValueChange={(values) =>
              handleFeatureChange(feature.slug, values)
            }
            value={[featureStates[feature.slug]]}
            variant="outline"
          >
            <ToggleGroupItem value="disabled">Off</ToggleGroupItem>
            <ToggleGroupItem value="enabled">On</ToggleGroupItem>
            <ToggleGroupItem value="inherit">Default</ToggleGroupItem>
          </ToggleGroup>
        </div>
      ))}
    </div>
  );
}

export function AutoOptInToggle() {
  const [autoOptIn, setAutoOptIn] = useState(false);

  function handleToggle(checked: boolean) {
    setAutoOptIn(checked);
    toastManager.add({
      title: checked ? "Auto opt-in enabled" : "Auto opt-in disabled",
      type: "success",
    });
  }

  return (
    <Field>
      <FieldLabel>
        <Switch checked={autoOptIn} onCheckedChange={handleToggle} />
        Automatically opt in to new experimental features
      </FieldLabel>
    </Field>
  );
}
