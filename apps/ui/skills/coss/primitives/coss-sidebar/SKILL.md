---
name: coss-sidebar
description: Use when implementing persistent app shell navigation with coss Sidebar, including collapsible groups, sections, and responsive layouts.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Sidebar

## When to use

- Persistent app shell navigation and grouped links.
- Collapsible/structured side navigation for dashboard layouts.

## Install

```bash
npx shadcn@latest add @coss/sidebar
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Sidebar } from "@/components/ui/sidebar"
```

## Minimal pattern

```tsx
<Sidebar>
  <SidebarHeader>Workspace</SidebarHeader>
  <SidebarPanel>
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
    </SidebarGroup>
  </SidebarPanel>
</Sidebar>
```

## Patterns from coss particles

- **Baseline structure**: follow docs composition before custom styling.
- **Responsive behavior**: verify behavior across compact and wide layouts.
- **Accessibility**: ensure labels, roles, and keyboard behavior are preserved.

## Common pitfalls

- Treating sidebar as a single component without structuring sections/groups.
- Overloading sidebar with dense controls better suited for toolbar/header regions.
- Missing responsive collapse strategy for narrow/mobile layouts.

## Useful particle references

- sidebar-specific particles: no dedicated `p-sidebar-*` family currently.
- app-shell references: `p-toolbar-1`, `p-breadcrumb-1`, `p-tabs-1`, `p-menu-1`
