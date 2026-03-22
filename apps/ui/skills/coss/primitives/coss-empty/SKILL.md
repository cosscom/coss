---
name: coss-empty
description: Use when displaying empty-state placeholders with coss Empty, including illustrations, messages, and call-to-action buttons.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Empty

## When to use

- No-data/no-results states with guidance.
- Action-oriented recovery UIs when content lists are empty.

## Install

```bash
npx shadcn@latest add @coss/empty
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
```

## Minimal pattern

```tsx
<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon">
      <Icon />
    </EmptyMedia>
    <EmptyTitle>No data</EmptyTitle>
    <EmptyDescription>No data found</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button>Add data</Button>
  </EmptyContent>
</Empty>
```

## Patterns from coss particles

- **Baseline usage**: start from `p-empty-1` and add only the props/parts needed for the target flow.
- **Variant sizing**: prefer primitive variants/sizes before class overrides.
- **Accessibility**: keep explicit labels and semantic roles when used in interactive contexts.

## Common pitfalls

- Presenting empty states without actionable next step.
- Using empty state component for loading/error states instead of dedicated primitives.
- Copy-only empty states with no context-specific guidance for recovery.

## Useful particle references

- core patterns: `p-empty-1`
