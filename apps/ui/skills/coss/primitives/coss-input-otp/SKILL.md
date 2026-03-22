---
name: coss-input-otp
description: Use when implementing one-time passcode entry with coss InputOTP, including segmented slot rendering and length synchronization.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Input Otp

## When to use

- One-time passcode entry with segmented slots.
- Verification code flows with strict length formatting.

## Install

```bash
npx shadcn@latest add @coss/input-otp
```

Manual deps from docs:

```bash
npm install @base-ui/react input-otp lucide-react
```

## Canonical imports

```tsx
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
```

## Minimal pattern

```tsx
<InputOTP aria-label="Verification code" maxLength={6}>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
    <InputOTPSlot index={2} />
  </InputOTPGroup>
  <InputOTPSeparator />
  <InputOTPGroup>
    <InputOTPSlot index={3} />
    <InputOTPSlot index={4} />
    <InputOTPSlot index={5} />
  </InputOTPGroup>
</InputOTP>
```

## Patterns from coss particles

- **Large**: use `p-input-otp-2` as the baseline implementation for this variation.
- **Separator**: use `p-input-otp-3` as the baseline implementation for this variation.
- **Label**: use `p-input-otp-4` as the baseline implementation for this variation.
- **Digits Only**: use `p-input-otp-5` as the baseline implementation for this variation.
- **Invalid**: use `p-input-otp-6` as the baseline implementation for this variation.
- **Auto Validation**: use `p-input-otp-7` as the baseline implementation for this variation.

## Common pitfalls

- Slot count mismatch with `maxLength`, causing broken OTP UX.
- Missing `aria-label` when no visible label is present.
- Using OTP slots for arbitrary text input instead of fixed verification codes.

## Useful particle references

- large: `p-input-otp-2`
- with separator: `p-input-otp-3`
- with label: `p-input-otp-4`
- digits only: `p-input-otp-5`
- invalid: `p-input-otp-6`
- auto validation: `p-input-otp-7`
