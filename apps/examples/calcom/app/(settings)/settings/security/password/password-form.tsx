"use client";

import { Button } from "@coss/ui/components/button";
import { Field, FieldLabel } from "@coss/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@coss/ui/components/input-group";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";

export function PasswordFormFields() {
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
      <Field>
        <FieldLabel>Old password</FieldLabel>
        <InputGroup>
          <InputGroupInput
            aria-label="Old password"
            placeholder="Enter your current password"
            type={showOldPassword ? "text" : "password"}
          />
          <InputGroupAddon align="inline-end">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={
                      showOldPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    size="icon-xs"
                    variant="ghost"
                  />
                }
              >
                {showOldPassword ? <EyeOffIcon /> : <EyeIcon />}
              </TooltipTrigger>
              <TooltipPopup>
                {showOldPassword ? "Hide password" : "Show password"}
              </TooltipPopup>
            </Tooltip>
          </InputGroupAddon>
        </InputGroup>
      </Field>

      <Field>
        <FieldLabel>New password</FieldLabel>
        <InputGroup>
          <InputGroupInput
            aria-label="New password"
            placeholder="Enter your new password"
            type={showNewPassword ? "text" : "password"}
          />
          <InputGroupAddon align="inline-end">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={
                      showNewPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    size="icon-xs"
                    variant="ghost"
                  />
                }
              >
                {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
              </TooltipTrigger>
              <TooltipPopup>
                {showNewPassword ? "Hide password" : "Show password"}
              </TooltipPopup>
            </Tooltip>
          </InputGroupAddon>
        </InputGroup>
      </Field>

      <div className="col-span-2 text-muted-foreground text-xs">
        The password must be a minimum of 7 characters long containing at least
        one number and have a mixture of uppercase and lowercase letters.
      </div>
    </div>
  );
}
