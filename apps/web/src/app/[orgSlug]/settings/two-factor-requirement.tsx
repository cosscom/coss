"use client";

import type { ReactNode } from "react";
import { SettingsSwitchRow } from "@/components/settings-switch-row";
import { setTwoFactorRequirementAction } from "./actions";

/** The organization's two-factor requirement as a settings row; the switch saves on change. */
export function TwoFactorRequirementRow(props: {
  orgSlug: string;
  required: boolean;
  /** The actor has two-factor themselves (needed to turn the requirement on). */
  canRequire: boolean;
  disabled: boolean;
  description: ReactNode;
}) {
  return (
    <SettingsSwitchRow
      action={setTwoFactorRequirementAction}
      canTurnOn={props.canRequire}
      description={props.description}
      disabled={props.disabled}
      id="require-two-factor"
      label="Require two-factor authentication"
      orgSlug={props.orgSlug}
      required={props.required}
      turnedOff="Two-factor no longer required"
      turnedOn="Two-factor now required"
    />
  );
}
