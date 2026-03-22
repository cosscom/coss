---
name: skeleton
description: Use when rendering loading placeholders with coss Skeleton, matching final layout density for perceived-performance improvement.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Skeleton

## When to use

- Loading placeholders matching final layout density.
- Perceived-performance improvement during fetch/render latency.

## Install

```bash
npx shadcn@latest add @coss/skeleton
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import { Skeleton } from "@/components/ui/skeleton"
```

## Minimal pattern

```tsx
<Skeleton className="size-10 rounded-full" />
```

## Patterns from coss particles

- **Skeleton Only**: use the pattern shown in `p-skeleton-2` when this variation is required.
- **Shape matching**: mirror final text/image/button geometry to reduce content shift.
- **State handoff**: remove skeleton immediately when data is ready to avoid double-render confusion.
## Common pitfalls

- Mismatch between skeleton layout and final content layout causing jarring swap.
- Leaving skeleton visible after load completion due missing state transition.
- Using skeleton for very short operations where spinner/text is clearer.

## Useful particle references

- skeleton only: `p-skeleton-2`
