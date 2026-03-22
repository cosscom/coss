---
name: coss-preview-card
description: Use when implementing preview card patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Preview Card

## When to use

- Hover/focus-triggered rich preview content.
- Contextual details for users/entities without full navigation.

## Install

```bash
npx shadcn@latest add @coss/preview-card
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Button } from "@/components/ui/button"
import {
  PreviewCard,
  PreviewCardPopup,
  PreviewCardTrigger,
} from "@/components/ui/preview-card"
```

## Minimal pattern

```tsx
<PreviewCard>
  <PreviewCardTrigger>Open Preview Card</PreviewCardTrigger>
  <PreviewCardPopup>Preview Card Content</PreviewCardPopup>
</PreviewCard>
```

## Patterns from coss particles

- **Baseline structure**: start from `p-preview-card-1` and preserve part hierarchy.
- **Responsive behavior**: verify behavior across compact and wide layouts.
- **Accessibility**: ensure labels, roles, and keyboard behavior are preserved.

## Common pitfalls

- Using preview card for critical workflows requiring explicit modal interaction.
- Missing accessible trigger labels when using icon-only triggers.
- Rendering heavy async content on every hover without throttling/caching strategy.

## Useful particle references

- core patterns: `p-preview-card-1`
