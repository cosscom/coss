---
name: badge
description: Use when displaying status indicators, counts, or labels with coss Badge, including variant styling and render composition.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Badge

## When to use

- Short status/category labels and counts.
- Inline metadata chips paired with buttons, tables, and cards.

## Install

```bash
npx shadcn@latest add @coss/badge
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Badge } from "@/components/ui/badge"
```

## Minimal pattern

```tsx
<Badge>Badge</Badge>
```

## Patterns from coss particles

- **Outline**: use the pattern shown in `p-badge-2` when this variation is required.
- **Secondary**: use the pattern shown in `p-badge-3` when this variation is required.
- **Destructive**: use the pattern shown in `p-badge-4` when this variation is required.
- **Info**: use the pattern shown in `p-badge-5` when this variation is required.
- **Success**: use the pattern shown in `p-badge-6` when this variation is required.

## Common pitfalls

- Using badge as interactive button without proper button semantics.
- Applying raw palette classes instead of semantic tokens/variants for status.
- Overloading badge content with long text that should be normal body copy.

## Useful particle references

- outline: `p-badge-2`
- secondary: `p-badge-3`
- destructive: `p-badge-4`
- info: `p-badge-5`
- success: `p-badge-6`
- warning: `p-badge-7`
- error: `p-badge-8`
- small: `p-badge-9`
