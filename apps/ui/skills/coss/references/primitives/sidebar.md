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

### Key patterns

Sidebar with grouped navigation:

```tsx
<Sidebar>
  <SidebarHeader>
    <h2 className="text-lg font-semibold">App Name</h2>
  </SidebarHeader>
  <SidebarPanel>
    <SidebarGroup>
      <SidebarGroupLabel>Main</SidebarGroupLabel>
      <SidebarItem href="/dashboard">Dashboard</SidebarItem>
      <SidebarItem href="/projects">Projects</SidebarItem>
    </SidebarGroup>
    <SidebarGroup>
      <SidebarGroupLabel>Settings</SidebarGroupLabel>
      <SidebarItem href="/settings">General</SidebarItem>
      <SidebarItem href="/settings/team">Team</SidebarItem>
    </SidebarGroup>
  </SidebarPanel>
</Sidebar>
```

Follow docs composition before custom styling. Ensure responsive collapse strategy for narrow/mobile layouts.

### More examples

See `p-toolbar-1`, `p-breadcrumb-1`, `p-tabs-1`, `p-menu-1` for related app-shell patterns.

## Common pitfalls

- Treating sidebar as a single component without structuring sections/groups.
- Overloading sidebar with dense controls better suited for toolbar/header regions.
- Missing responsive collapse strategy for narrow/mobile layouts.

## Useful particle references

- sidebar-specific particles: no dedicated `p-sidebar-*` family currently.
- app-shell references: `p-toolbar-1`, `p-breadcrumb-1`, `p-tabs-1`, `p-menu-1`
