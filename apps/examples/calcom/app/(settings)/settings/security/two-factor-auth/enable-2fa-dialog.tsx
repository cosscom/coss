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
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
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

interface Enable2FADialogProps {
  onEnabled?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const MANUAL_SETUP_KEY = "EBBDGDSAJVEA6RTUE4IGKXAJG4IBQWZ5";

export function Enable2FADialog({
  onEnabled,
  onOpenChange,
  open,
}: Enable2FADialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [step2Open, setStep2Open] = useState(false);
  const [step3Open, setStep3Open] = useState(false);

  function handleRootOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setStep2Open(false);
      setStep3Open(false);
    }
    onOpenChange(nextOpen);
  }

  function handleCancel() {
    setStep2Open(false);
    setStep3Open(false);
    onOpenChange(false);
  }

  function handleEnable() {
    onEnabled?.();
    handleCancel();
  }

  return (
    <Dialog onOpenChange={handleRootOpenChange} open={open}>
      <DialogPopup showCloseButton>
        <DialogHeader>
          <DialogTitle>Enable two-factor authentication</DialogTitle>
          <DialogDescription>
            Confirm your current password to get started.
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
              <DialogTitle>Enable two-factor authentication</DialogTitle>
              <DialogDescription>
                Scan the image below with the authenticator app on your phone or
                manually enter the text code instead.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col items-center gap-4">
              <div
                aria-hidden
                className="aspect-square size-48 shrink-0 bg-black"
              />
              <code className="font-mono text-muted-foreground text-xs">
                {MANUAL_SETUP_KEY}
              </code>
            </DialogPanel>
            <DialogFooter>
              <Button onClick={handleCancel} variant="ghost">
                Cancel
              </Button>
              <Button onClick={() => setStep3Open(true)} variant="outline">
                Continue
              </Button>
            </DialogFooter>
            <Dialog onOpenChange={setStep3Open} open={step3Open}>
              <DialogPopup showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle>Enable two-factor authentication</DialogTitle>
                  <DialogDescription>
                    Enter the six-digit code from your authenticator app below.
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
                    <FieldDescription>
                      Two-factor authentication enabled. Please enter the
                      six-digit code from your authenticator app.
                    </FieldDescription>
                  </Field>
                </DialogPanel>
                <DialogFooter>
                  <Button onClick={handleCancel} variant="ghost">
                    Cancel
                  </Button>
                  <Button onClick={handleEnable}>Enable</Button>
                </DialogFooter>
              </DialogPopup>
            </Dialog>
          </DialogPopup>
        </Dialog>
      </DialogPopup>
    </Dialog>
  );
}
