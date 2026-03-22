---
name: coss-kbd
description: Use when displaying keyboard shortcut hints with coss Kbd and KbdGroup, including multi-key sequences adjacent to action controls.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Kbd

## When to use

- Keyboard shortcut keycaps near commands.
- Single or grouped key hint display in action UIs.

## Install

```bash
npx shadcn@latest add @coss/kbd
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import { Kbd, KbdGroup } from "@/components/ui/kbd"
```

## Minimal pattern

```tsx
<Kbd>K</Kbd>
```

## Patterns from coss particles

- **Input Group**: use the pattern shown in `p-input-group-11` when this variation is required.
- **Shortcut pairs**: use `KbdGroup` for multi-key shortcuts (`cmd` + key) instead of cramming into one badge.
- **Action adjacency**: keep key hints adjacent to the command they trigger.
## Common pitfalls

- Placing multi-key sequences in a single `Kbd` when `KbdGroup` is clearer.
- Using decorative keycaps without tying them to nearby actionable controls.
- Overusing kbd hints in simple UIs, adding noise instead of clarity.

## Useful particle references

- input group: `p-input-group-11`
