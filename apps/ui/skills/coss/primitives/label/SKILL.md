---
name: coss-label
description: Use when implementing label patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Label

## When to use

- Visible accessible labels for inputs and controls.
- Simple `htmlFor`/`id` associations in forms and settings UIs.

## Install

```bash
npx shadcn@latest add @coss/label
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import { Label } from "@/components/ui/label"
```

## Minimal pattern

```tsx
<Label htmlFor="email">Email</Label>
```

## Patterns from coss particles

- **Checkbox**: use the pattern shown in `checkbox-demo` when this variation is required.
- **Field integration**: prefer `FieldLabel` within `Field` for validation-aware forms.
- **Standalone controls**: use `Label htmlFor` + matching input `id` for isolated control-label pairs.
## Common pitfalls

- Using `aria-label` when visible `Label` text exists and can be associated.
- Mismatching `htmlFor`/`id` between label and control.
- Using label component as generic typography instead of form labeling.

## Useful particle references

- with checkbox: `checkbox-demo`
- label-specific particles: no dedicated `p-label-*` family; use form references `p-field-1`, `p-input-1`, `p-checkbox-1`.
