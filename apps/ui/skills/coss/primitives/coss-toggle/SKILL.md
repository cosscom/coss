---
name: coss-toggle
description: Use when implementing pressable two-state command buttons with coss Toggle, including active/inactive styling and icon patterns.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Toggle

## When to use

- Pressable two-state commands (formatting/tool modes).
- Single-command active/inactive interactions without group state.

## When NOT to use

- If the control is a binary preference setting -> use Switch instead.
- If multiple toggles share state -> use ToggleGroup instead.

## Install

```bash
npx shadcn@latest add @coss/toggle
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Toggle } from "@/components/ui/toggle"
```

## Minimal pattern

```tsx
<Toggle>Toggle</Toggle>
```

## Patterns from coss particles

- **Outline**: use the pattern shown in `p-toggle-2` when this variation is required.
- **Icon**: use the pattern shown in `p-toggle-3` when this variation is required.
- **Small Size**: use the pattern shown in `p-toggle-4` when this variation is required.
- **Large Size**: use the pattern shown in `p-toggle-5` when this variation is required.
- **Disabled**: use the pattern shown in `p-toggle-6` when this variation is required.

## Common pitfalls

- Using toggle for destructive/submit actions better represented by `Button`.
- Missing pressed-state semantics in controlled toggle flows.
- Using standalone toggles when mutually exclusive behavior needs `ToggleGroup`.

## Useful particle references

- outline: `p-toggle-2`
- with icon: `p-toggle-3`
- small size: `p-toggle-4`
- large size: `p-toggle-5`
- disabled: `p-toggle-6`
- icon group: `p-toggle-7`
