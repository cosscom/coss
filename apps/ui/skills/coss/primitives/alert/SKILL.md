---
name: alert
description: Use when displaying inline status messages with coss Alert, including semantic variants (info, success, warning, error) with icons and actions.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Alert

## When to use

- Inline status messaging in content flows.
- Semantic feedback variants (`info`, `success`, `warning`, `error`) with optional icons and actions.

## When NOT to use

- If the message is transient and should auto-dismiss -> use Toast instead.
- If the message requires user action before proceeding -> use AlertDialog instead.
- If it's a brief hover hint -> use Tooltip instead.

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
