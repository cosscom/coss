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
}

export function SettingsToggle({
  title,
  description,
  defaultChecked = false,
}: SettingsToggleProps) {
  return (
    <Card>
      <CardPanel>
        <div className="flex items-center justify-between gap-4">
          <CardFrameHeader className="gap-0 p-0!">
            <CardFrameTitle>{title}</CardFrameTitle>
            <CardFrameDescription>{description}</CardFrameDescription>
          </CardFrameHeader>
          <Switch defaultChecked={defaultChecked} />
        </div>
      </CardPanel>
    </Card>
  );
}
