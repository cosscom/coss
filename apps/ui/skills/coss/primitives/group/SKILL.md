---
name: group
description: Use when composing connected control clusters with coss Group, including buttons, toggles, and menu triggers with shared visual boundaries.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Group

## When to use

- Connected controls with shared visual boundary.
- Composed action clusters using buttons, toggles, and menu triggers.

## Install

```bash
npx shadcn@latest add @coss/group
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Button } from "@/components/ui/button"
import { Group, GroupSeparator } from "@/components/ui/group"
```

## Minimal pattern

```tsx
<Group>
  <Button>Button</Button>
  <GroupSeparator />
  <Button>Button</Button>
</Group>
```

## Patterns from coss particles

- **Input**: use the pattern shown in `p-group-2` when this variation is required.
- **Small Size**: use the pattern shown in `p-group-3` when this variation is required.
- **Large Size**: use the pattern shown in `p-group-4` when this variation is required.
- **Disabled Button**: use the pattern shown in `p-group-5` when this variation is required.
- **Default Buttons**: use the pattern shown in `p-group-6` when this variation is required.

## Common pitfalls

- Forgetting `GroupSeparator` between controls in connected groups.
- Mixing control sizes/variants that break shared group silhouette.
- Using standalone controls where a grouped action model is expected.

## Useful particle references

- with input: `p-group-2`
- small size: `p-group-3`
- large size: `p-group-4`
- with disabled button: `p-group-5`
- with default buttons: `p-group-6`
- with start labeled text: `p-group-7`
- with end text: `p-group-8`
- vertical: `p-group-9`
