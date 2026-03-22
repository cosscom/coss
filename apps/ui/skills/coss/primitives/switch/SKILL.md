---
name: coss-switch
description: Use when implementing switch patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Switch

## When to use

- Binary preference toggles in settings flows.
- Immediate on/off state controls with explicit labels.

## Install

```bash
npx shadcn@latest add @coss/switch
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Switch } from "@/components/ui/switch"
```

## Minimal pattern

```tsx
<Label>
  <Switch />
  Enable notifications
</Label>
```

## Patterns from coss particles

- **Disabled**: use the pattern shown in `p-switch-2` when this variation is required.
- **Description**: use the pattern shown in `p-switch-3` when this variation is required.
- **Customizing Size**: use the pattern shown in `p-switch-6` when this variation is required.
- **Card Style**: use the pattern shown in `p-switch-4` when this variation is required.
- **Form Integration**: use the pattern shown in `p-switch-5` when this variation is required.

## Common pitfalls

- Using switch for multi-option selection that should use radio/toggle-group.
- Omitting visible label or explicit `aria-label` for icon-only switch controls.
- Treating switch as form value without verifying checked-state wiring.

## Useful particle references

- disabled: `p-switch-2`
- with description: `p-switch-3`
- customizing size: `p-switch-6`
- card style: `p-switch-4`
- form integration: `p-switch-5`
