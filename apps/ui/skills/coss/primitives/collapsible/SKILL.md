---
name: collapsible
description: Use when building expandable/collapsible content regions with coss Collapsible, including trigger and panel composition.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Collapsible

## When to use

- Progressive disclosure of optional content.
- Expandable help/settings sections without leaving the page.

## Install

```bash
npx shadcn@latest add @coss/collapsible
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
```

## Minimal pattern

```tsx
<Collapsible>
  <CollapsibleTrigger>Can I access the file in the cloud?</CollapsibleTrigger>
  <CollapsiblePanel>
    Yes, you can access the file in the cloud.
  </CollapsiblePanel>
</Collapsible>
```

## Patterns from coss particles

- **Baseline usage**: start from `p-collapsible-1` and add only the props/parts needed for the target flow.
- **Variant sizing**: prefer primitive variants/sizes before class overrides.
- **Accessibility**: keep explicit labels and semantic roles when used in interactive contexts.

## Common pitfalls

- Placing trigger/panel outside the same collapsible root.
- Assuming panel content is always visible/mounted for dependent logic.
- Using modal-like interactions where collapsible disclosure is more appropriate.

## Useful particle references

- core patterns: `p-collapsible-1`
