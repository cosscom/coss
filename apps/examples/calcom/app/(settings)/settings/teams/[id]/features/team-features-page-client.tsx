"use client";

import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { toastManager } from "@coss/ui/components/toast";
import {
  Toggle,
  ToggleGroup,
  ToggleGroupSeparator,
} from "@coss/ui/components/toggle-group";
import { useState } from "react";
import { SettingsToggle } from "@/components/particles";

type EnhancedBookingsState = "disabled" | "enabled" | "inherit";

export function TeamFeaturesPageClient() {
  const [enhancedBookings, setEnhancedBookings] =
    useState<EnhancedBookingsState>("inherit");
  const [autoOptIn, setAutoOptIn] = useState(false);

  function handleEnhancedBookingsChange(values: readonly string[]) {
    const newValue = values[0] as EnhancedBookingsState | undefined;
    if (!newValue) return;
    setEnhancedBookings(newValue);
    toastManager.add({
      title: "Settings updated successfully",
      type: "success",
    });
  }

  function handleAutoOptInChange(checked: boolean) {
    setAutoOptIn(checked);
    toastManager.add({
      title: "Settings updated successfully",
      type: "success",
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Features</CardFrameTitle>
          <CardFrameDescription>
            Manage experimental features for your team
          </CardFrameDescription>
        </CardFrameHeader>

        <Card>
          <CardPanel>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-sm">Enhanced bookings</p>
                <p className="text-muted-foreground text-sm">
                  A redesigned booking page including a calendar view.
                </p>
              </div>
              <ToggleGroup
                className="shrink-0"
                onValueChange={handleEnhancedBookingsChange}
                value={[enhancedBookings]}
                variant="outline"
              >
                <Toggle aria-label="Disable" value="disabled">
                  Disable
                </Toggle>
                <ToggleGroupSeparator />
                <Toggle aria-label="Enable" value="enabled">
                  Enable
                </Toggle>
                <ToggleGroupSeparator />
                <Toggle aria-label="Let users decide" value="inherit">
                  Let users decide
                </Toggle>
              </ToggleGroup>
            </div>
          </CardPanel>
        </Card>
      </CardFrame>

      <SettingsToggle
        checked={autoOptIn}
        description="Automatically opt team members into new experimental features, unless configured by the organization or opted out by members"
        onCheckedChange={handleAutoOptInChange}
        title="Automatically opt-in for future experimental features"
      />
    </div>
  );
}
