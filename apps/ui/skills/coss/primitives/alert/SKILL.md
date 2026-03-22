---
name: coss-alert
description: Use when implementing alert patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Alert

## When to use

- Inline status messaging in content flows.
- Semantic feedback variants (`info`, `success`, `warning`, `error`) with optional icons and actions.

## Install

```bash
npx shadcn@latest add @coss/alert
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
```

## Minimal pattern

```tsx
<Alert>
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components and dependencies to your app using the cli.
  </AlertDescription>
</Alert>
```

## Patterns from coss particles

- **Icon**: use the pattern shown in `p-alert-2` when this variation is required.
- **Icon and Action Buttons**: use the pattern shown in `p-alert-3` when this variation is required.
- **Info Alert**: use the pattern shown in `p-alert-4` when this variation is required.
- **Success Alert**: use the pattern shown in `p-alert-5` when this variation is required.
- **Warning Alert**: use the pattern shown in `p-alert-6` when this variation is required.

## Common pitfalls

- Using alert variants for passive decoration instead of meaningful semantic status.
- Missing title/description structure in complex alerts, reducing scannability.
- Hiding semantic alert icons with `aria-hidden` when they convey status meaning.

## Useful particle references

- with icon: `p-alert-2`
- with icon and action buttons: `p-alert-3`
- info alert: `p-alert-4`
- success alert: `p-alert-5`
- warning alert: `p-alert-6`
- error alert: `p-alert-7`
