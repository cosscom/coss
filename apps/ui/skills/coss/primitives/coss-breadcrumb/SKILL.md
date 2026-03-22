---
name: coss-breadcrumb
description: Use when building hierarchical navigation trails with coss Breadcrumb, including link composition, separators, and collapsed paths.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Breadcrumb

## When to use

- Hierarchy/location indicators for current page context.
- Compact navigation trails for nested routes and detail pages.

## Install

```bash
npx shadcn@latest add @coss/breadcrumb
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
```

## Minimal pattern

```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbEllipsis />
    </BreadcrumbItem>
    <BreadcrumbItem>
      <BreadcrumbLink href="/components">Components</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

## Patterns from coss particles

- **custom separator**: mirror `p-breadcrumb-2` for this navigation/layout scenario.
- **Collapsed paths**: use compact breadcrumb variants in deeply nested routes to reduce header noise.
- **Icon-only home links**: provide `aria-label` for icon-only breadcrumb items.
## Common pitfalls

- Using breadcrumb as primary nav menu instead of contextual trail.
- Omitting `aria-label` on icon-only breadcrumb items.
- Adding deep breadcrumb chains without meaningful hierarchy.

## Useful particle references

- with custom separator: `p-breadcrumb-2`
