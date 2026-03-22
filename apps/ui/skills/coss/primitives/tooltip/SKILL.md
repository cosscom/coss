---
name: coss-tooltip
description: Use when implementing tooltip patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Tooltip

## When to use

- Short helper text on hover/focus for controls and icons.
- Non-blocking contextual hints without modal behavior.

## Install

```bash
npx shadcn@latest add @coss/tooltip
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Tooltip,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
```

## Minimal pattern

```tsx
<Tooltip>
  <TooltipTrigger render={<Button variant="outline" />}>
    Hover me
  </TooltipTrigger>
  <TooltipPopup>Helpful hint</TooltipPopup>
</Tooltip>
```

## Patterns from coss particles

- **Grouped Tooltips**: follow `p-tooltip-2` for this documented variation.
- **Animated Tooltips**: follow `p-tooltip-3` for this documented variation.
- **Delay tuning**: adjust show/hide delay only when interaction density requires it.
- **Icon controls**: combine tooltip with explicit `aria-label` on icon-only buttons.
## Common pitfalls

- Placing interactive controls inside tooltip content (tooltip should stay informational).
- Relying on tooltip as sole label for icon-only controls (still provide accessible name).
- Using tooltip for long-form content that should be popover/dialog.

## Useful particle references

- grouped tooltips: `p-tooltip-2`
- animated tooltips: `p-tooltip-3`
- cross-overlay references: `p-dialog-1`, `p-popover-1`, `p-menu-2`
