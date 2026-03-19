import { useId } from "react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/registry/default/ui/input-otp";
import { Label } from "@/registry/default/ui/label";

export default function Particle() {
  const id = useId();

  return (
    <div className="flex flex-col items-center gap-2">
      <Label htmlFor={id}>Verification code</Label>
      <InputOTP aria-label="Verification code" id={id} maxLength={4}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
      <p className="text-muted-foreground text-xs">
        Enter the 4-digit code sent to your email.
      </p>
    </div>
  );
}
