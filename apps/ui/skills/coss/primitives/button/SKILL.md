---
name: coss-button
description: Use when implementing button patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Button

## When to use

- Primary and secondary action triggers.
- Icon, loading, and shortcut-enhanced actions across forms and toolbars.

## Install

```bash
npx shadcn@latest add @coss/button
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Button } from "@/components/ui/button"
```

## Minimal pattern

```tsx
<Button type="button">Button</Button>
```

`Button` defaults to `type="button"` when rendered as the native button part. In form flows, set `type` explicitly (`button` / `submit` / `reset`) to match intent, especially when using `render` composition.

## Patterns from coss particles

- **Default**: use the pattern shown in `p-button-1` when this variation is required.
- **Outline**: use the pattern shown in `p-button-2` when this variation is required.
- **Secondary**: use the pattern shown in `p-button-3` when this variation is required.
- **Destructive**: use the pattern shown in `p-button-4` when this variation is required.
- **Destructive Outline**: use the pattern shown in `p-button-5` when this variation is required.

## Common pitfalls

- Omitting explicit `type` inside forms/dialogs and triggering unintended submit behavior.
- Using icon-only buttons without `aria-label` on the button.
- Rebuilding button state styling with ad-hoc classes instead of variants/sizes.
- Using `SelectButton` as if it were a general-purpose `Button`; `SelectButton` is a select-flavored trigger helper and should be treated as a `select`/`combobox` pattern.

## Useful particle references

- default: `p-button-1`
- outline: `p-button-2`
- secondary: `p-button-3`
- destructive: `p-button-4`
- destructive outline: `p-button-5`
- ghost: `p-button-6`
- link: `p-button-7`
- extra-small size: `p-button-8`
