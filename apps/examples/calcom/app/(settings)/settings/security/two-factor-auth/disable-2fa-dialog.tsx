"use client";

import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
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

interface Disable2FADialogProps {
  onDisabled?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function Disable2FADialog({
  onDisabled,
  onOpenChange,
  open,
}: Disable2FADialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [step2Open, setStep2Open] = useState(false);

  function handleRootOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setStep2Open(false);
    }
    onOpenChange(nextOpen);
  }

  function handleCancel() {
    setStep2Open(false);
    onOpenChange(false);
  }

  function handleDisable() {
    onDisabled?.();
    handleCancel();
  }

  return (
    <Dialog onOpenChange={handleRootOpenChange} open={open}>
      <DialogPopup showCloseButton>
        <DialogHeader>
          <DialogTitle>Disable two-factor authentication</DialogTitle>
          <DialogDescription>
            Confirm your password and enter the six-digit code from your
            authenticator app to disable two-factor authentication.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <Field>
            <FieldLabel>Password</FieldLabel>
            <InputGroup>
              <InputGroupInput
                aria-label="Password"
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
              />
              <InputGroupAddon align="inline-end">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword(!showPassword)}
                        size="icon-xs"
                        variant="ghost"
                      />
                    }
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </TooltipTrigger>
                  <TooltipPopup>
                    {showPassword ? "Hide password" : "Show password"}
                  </TooltipPopup>
                </Tooltip>
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </DialogPanel>
        <DialogFooter>
          <Button onClick={handleCancel} variant="ghost">
            Cancel
          </Button>
          <Button onClick={() => setStep2Open(true)} variant="outline">
            Continue
          </Button>
        </DialogFooter>
        <Dialog onOpenChange={setStep2Open} open={step2Open}>
          <DialogPopup showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Disable two-factor authentication</DialogTitle>
              <DialogDescription>
                Enter the six-digit code from your authenticator app to confirm.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel>
              <Field>
                <FieldLabel>Two-factor code</FieldLabel>
                <Input
                  aria-label="Two-factor code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  type="text"
                />
              </Field>
            </DialogPanel>
            <DialogFooter>
              <Button onClick={handleCancel} variant="ghost">
                Cancel
              </Button>
              <Button onClick={handleDisable}>Disable</Button>
            </DialogFooter>
          </DialogPopup>
        </Dialog>
      </DialogPopup>
    </Dialog>
  );
}
