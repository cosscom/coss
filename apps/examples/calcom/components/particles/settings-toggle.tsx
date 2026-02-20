"use client";

import {
  Card,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Switch } from "@coss/ui/components/switch";

interface SettingsToggleProps {
  title: string;
  description: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function SettingsToggle({
  title,
  description,
  defaultChecked = false,
  checked,
  onCheckedChange,
}: SettingsToggleProps) {
  const isControlled = checked !== undefined;
  return (
    <Card>
      <CardPanel>
        <div className="flex items-center justify-between gap-4">
          <CardFrameHeader className="gap-0 p-0!">
            <CardFrameTitle>{title}</CardFrameTitle>
            <CardFrameDescription>{description}</CardFrameDescription>
          </CardFrameHeader>
          <Switch
            checked={isControlled ? checked : undefined}
            defaultChecked={isControlled ? undefined : defaultChecked}
            onCheckedChange={onCheckedChange}
          />
        </div>
      </CardPanel>
    </Card>
  );
}
