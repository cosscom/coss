---
name: coss-pagination
description: Use when implementing pagination patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Pagination

## When to use

- Paged navigation over long result sets.
- Prev/next and index controls paired with data tables/lists.

## Install

```bash
npx shadcn@latest add @coss/pagination
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
```

## Minimal pattern

```tsx
<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="#" />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">1</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationEllipsis />
    </PaginationItem>
    <PaginationItem>
      <PaginationNext href="#" />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

## Patterns from coss particles

- **Baseline structure**: start from `p-pagination-1` and preserve part hierarchy.
- **Responsive behavior**: verify behavior across compact and wide layouts.
- **Accessibility**: ensure labels, roles, and keyboard behavior are preserved.

## Common pitfalls

- Using pagination controls without synchronizing data/page state.
- Mixing pagination with infinite-scroll UX in the same surface.
- Missing disabled-state handling on prev/next boundaries.

## Useful particle references

- core patterns: `p-pagination-1`, `p-pagination-2`, `p-pagination-3`
