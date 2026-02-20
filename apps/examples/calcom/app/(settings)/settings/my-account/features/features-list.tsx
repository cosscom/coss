"use client";

import { toastManager } from "@coss/ui/components/toast";
import {
  Toggle,
  ToggleGroup,
  ToggleGroupSeparator,
} from "@coss/ui/components/toggle-group";
import { useState } from "react";
import { SettingsToggle } from "@/components/particles";

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
      title: "Settings updated successfully",
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
            value={[featureStates[feature.slug] ?? "inherit"]}
            variant="outline"
          >
            <Toggle aria-label="Off" value="disabled">
              Off
            </Toggle>
            <ToggleGroupSeparator />
            <Toggle aria-label="On" value="enabled">
              On
            </Toggle>
            <ToggleGroupSeparator />
            <Toggle aria-label="Default" value="inherit">
              Default
            </Toggle>
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
      title: "Settings updated successfully",
      type: "success",
    });
  }

  return (
    <SettingsToggle
      checked={autoOptIn}
      description="Automatically opt into new experimental features, unless disabled by your team or organization"
      onCheckedChange={handleToggle}
      title="Automatically opt-in for future experimental features"
    />
  );
}
