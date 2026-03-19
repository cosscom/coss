import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/registry/default/ui/input-otp";

export default function Particle() {
  return (
    <InputOTP aria-label="One-time password" maxLength={4}>
      <InputOTPGroup size="lg">
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
      </InputOTPGroup>
    </InputOTP>
  );
}
