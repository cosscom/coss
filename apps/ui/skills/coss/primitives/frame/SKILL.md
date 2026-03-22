---
name: coss-frame
description: Use when implementing frame patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Frame

## When to use

- Bordered app surfaces around content blocks.
- Container wrapper for data components like table, cards, and panes.

## Install

```bash
npx shadcn@latest add @coss/frame
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame"
```

## Minimal pattern

```tsx
<Frame>
  <FrameHeader>
    <FrameTitle>Title</FrameTitle>
    <FrameDescription>Description</FrameDescription>
  </FrameHeader>
  <FramePanel>Content</FramePanel>
  <FrameFooter>Footer</FrameFooter>
</Frame>
```

## Patterns from coss particles

- **Separated Panels**: use the pattern shown in `p-frame-3` when this variation is required.
- **Surface consistency**: use `Frame` to normalize border/radius around heterogeneous inner content.
- **Composed containers**: pair frame with footer/header parts when controls live around content.
## Common pitfalls

- Using nested frames excessively, causing dense double borders.
- Applying frame as layout grid replacement instead of content surface wrapper.
- Forgetting to align inner component width expectations (table/list full width).

## Useful particle references

- separated panels: `p-frame-3`
