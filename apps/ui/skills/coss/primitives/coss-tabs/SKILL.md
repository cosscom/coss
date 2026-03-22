---
name: coss-tabs
description: Use when building mutually exclusive tabbed content panels with coss Tabs, including TabsTab and TabsPanel naming conventions.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Tabs

## When to use

- Mutually exclusive content panels in one region.
- Settings/detail screens split into scoped views.

## Install

```bash
npx shadcn@latest add @coss/tabs
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
```

## Minimal pattern

```tsx
<Tabs defaultValue="tab-1">
  <TabsList>
    <TabsTab value="tab-1">Tab 1</TabsTab>
    <TabsTab value="tab-2">Tab 2</TabsTab>
    <TabsTab value="tab-3">Tab 3</TabsTab>
  </TabsList>
  <TabsPanel value="tab-1">Tab 1 content</TabsPanel>
  <TabsPanel value="tab-2">Tab 2 content</TabsPanel>
  <TabsPanel value="tab-3">Tab 3 content</TabsPanel>
</Tabs>
```

## Patterns from coss particles

- **Underline Variant**: use `p-tabs-2` as the baseline implementation for this variation.
- **Vertical Orientation**: use `p-tabs-3` as the baseline implementation for this variation.
- **Underline Vertical Orientation**: use `p-tabs-4` as the baseline implementation for this variation.

## Common pitfalls

- Mismatching `TabsTrigger value` and `TabsPanel value` pairs.
- Using tabs for workflows that require route-level navigation instead.
- Mounting expensive panel content without considering visibility/performance.

## Useful particle references

- underline variant: `p-tabs-2`
- vertical orientation: `p-tabs-3`
- underline with vertical orientation: `p-tabs-4`
- related navigation composition: `p-toolbar-1`, `p-card-1`
