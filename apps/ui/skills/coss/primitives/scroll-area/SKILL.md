---
name: coss-scroll-area
description: Use when implementing scroll area patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Scroll Area

## When to use

- Constrained-height scroll containers with styled viewport.
- Scrollable lists/logs/panels embedded in fixed layouts.

## Install

```bash
npx shadcn@latest add @coss/scroll-area
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { ScrollArea } from "@/components/ui/scroll-area"
```

## Minimal pattern

```tsx
<ScrollArea className="h-64 rounded-md border">
  <div className="p-4">
    Just as suddenly as it had begun, the sensation stopped, leaving Alice
    feeling slightly disoriented. She looked around and realized that the room
    hadn't changed at all - it was she who had grown smaller, shrinking down to
    a fraction of her previous size. Alice felt herself growing larger and
    larger, filling up the entire room until she feared she might burst. The
    sensation was both thrilling and terrifying, as if she were expanding beyond
    the confines of her own body. She wondered if this was what it felt like to
    be a balloon, swelling with air until it could hold no more.
  </div>
</ScrollArea>
```

## Patterns from coss particles

- **Scroll Fade**: mirror `p-scroll-area-4` for this navigation/layout scenario.
- **Horizontal Scroll**: mirror `p-scroll-area-2` for this navigation/layout scenario.
- **Scrollbar Gutter**: mirror `p-scroll-area-5` for this navigation/layout scenario.
- **Both Scrollbars**: mirror `p-scroll-area-3` for this navigation/layout scenario.

## Common pitfalls

- Forgetting explicit height/constraint, resulting in non-scrollable container.
- Nesting multiple scroll areas that compete for wheel/touch events.
- Using scroll area where native page scrolling is simpler and clearer.

## Useful particle references

- scroll fade: `p-scroll-area-4`
- horizontal scroll: `p-scroll-area-2`
- scrollbar gutter: `p-scroll-area-5`
- both scrollbars: `p-scroll-area-3`
