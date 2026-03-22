---
name: composition
description: Use when composing complex UI from multiple coss primitives, including trigger/popup hierarchies, grouped controls, and render-based composition.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# Composition Rules (coss)

Use this when composing complex UI from coss primitives and particles.

## Core Rules

- Prefer composing existing primitives over custom wrappers with duplicated behavior.
- For trigger-based primitives (Dialog, Menu, Select, Popover, Tooltip), follow each primitive's documented trigger/content hierarchy and composition API; do not mix patterns across components.
- Use coss/Base UI trigger APIs consistently (typically `render`-based composition).
- Use complete sub-structures where required (for example title/description regions in dialogs where relevant).

## Patterns

### Trigger + Popup

```tsx
<Dialog>
  <DialogTrigger render={<Button variant="outline" />}>Open</DialogTrigger>
  <DialogPopup>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <DialogPanel>Body</DialogPanel>
  </DialogPopup>
</Dialog>
```

### Grouped Controls

```tsx
<Group>
  <Button variant="outline">A</Button>
  <GroupSeparator />
  <Button variant="outline">B</Button>
</Group>
```

## Anti-patterns

- Building bespoke dropdown/dialog behavior instead of using primitives.
- Mixing APIs from other ecosystems (`asChild`-only mental model) without checking coss equivalents.
- Omitting key subcomponents that preserve accessibility and layout conventions.
