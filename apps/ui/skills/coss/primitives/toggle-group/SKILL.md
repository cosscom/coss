---
name: toggle-group
description: Use when implementing grouped pressed-state controls with coss ToggleGroup, including single and multiple selection modes.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Toggle Group

## When to use

- Grouped pressed-state controls (single or multiple).
- Formatting/action sets needing button-like toggles with shared state.

## Install

```bash
npx shadcn@latest add @coss/toggle-group
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Toggle, ToggleGroup } from "@/components/ui/toggle-group"
```

## Minimal pattern

```tsx
<ToggleGroup>
  <Toggle>Bold</Toggle>
  <Toggle>Italic</Toggle>
  <Toggle>Underline</Toggle>
</ToggleGroup>
```

## Patterns from coss particles

- **Small Toggles**: use `p-toggle-group-2` as the baseline implementation for this variation.
- **Large Toggles**: use `p-toggle-group-3` as the baseline implementation for this variation.
- **Outline Toggles**: use `p-toggle-group-4` as the baseline implementation for this variation.
- **Vertical**: use `p-toggle-group-5` as the baseline implementation for this variation.
- **Disabled**: use `p-toggle-group-6` as the baseline implementation for this variation.
- **Disabled Toggle**: use `p-toggle-group-7` as the baseline implementation for this variation.

## Common pitfalls

- Using toggle-group when plain buttons (no pressed state) are more appropriate.
- Wrong value shape for mode (`multiple` array vs single selection).
- Missing accessible labels on icon-only toggle items.

## Useful particle references

- small toggles: `p-toggle-group-2`
- large toggles: `p-toggle-group-3`
- with outline toggles: `p-toggle-group-4`
- vertical: `p-toggle-group-5`
- disabled: `p-toggle-group-6`
- with disabled toggle: `p-toggle-group-7`
- multiple selection: `p-toggle-group-8`
- with tooltips: `p-toggle-group-9`
