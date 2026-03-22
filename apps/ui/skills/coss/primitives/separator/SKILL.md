---
name: coss-separator
description: Use when implementing separator patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Separator

## When to use

- Visual/semantic separation between related blocks.
- Section dividers in menus, cards, and grouped controls.

## Install

```bash
npx shadcn@latest add @coss/separator
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Separator } from "@/components/ui/separator"
```

## Minimal pattern

```tsx
<div className="flex flex-col gap-2">
  <span className="text-sm">Section A</span>
  <Separator />
  <span className="text-sm">Section B</span>
</div>
```

## Patterns from coss particles

- **Baseline usage**: start from `p-separator-1` and add only the props/parts needed for the target flow.
- **Variant sizing**: prefer primitive variants/sizes before class overrides.
- **Accessibility**: keep explicit labels and semantic roles when used in interactive contexts.

## Common pitfalls

- Adding separators between every small element, creating visual clutter.
- Using separators where spacing alone communicates grouping better.
- Forgetting orientation/context in dense vertical command layouts.

## Useful particle references

- core patterns: `p-separator-1`
- cross-primitive dividers: `p-menu-1`, `p-group-1`, `p-input-group-7`
