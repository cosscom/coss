---
name: card
description: Use when composing content containers with coss Card, including header, panel (body), footer, and action sections.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Card

## When to use

- Structured surface sections for grouped content.
- Settings, dashboard, and preview layouts with header/panel/footer semantics.

## Install

```bash
npx shadcn@latest add @coss/card
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card"
```

## Minimal pattern

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardPanel>Content</CardPanel>
  <CardFooter>Footer</CardFooter>
</Card>
```

## Patterns from coss particles

- **Baseline usage**: start from `p-card-1` and add only the props/parts needed for the target flow.
- **Variant sizing**: prefer primitive variants/sizes before class overrides.
- **Accessibility**: keep explicit labels and semantic roles when used in interactive contexts.

## Common pitfalls

- Skipping `CardHeader`/`CardPanel`/`CardFooter` structure in composed cards.
- Mixing unrelated layout wrappers that break spacing between card sections.
- Using cards as generic wrappers when `Frame` or plain layout would be clearer.

## Useful particle references

- core patterns: `p-card-1`, `p-card-2`, `p-card-3`, `p-card-4`, `p-card-5`, `p-card-6`, `p-card-7`, `p-card-8`
