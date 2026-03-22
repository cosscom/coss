---
name: coss-checkbox-group
description: Use when implementing checkbox group patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Checkbox Group

## When to use

- Multi-select option groups with shared label context.
- Collecting multiple values under one field name.

## Install

```bash
npx shadcn@latest add @coss/checkbox-group
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Checkbox } from "@/components/ui/checkbox"
import { CheckboxGroup } from "@/components/ui/checkbox-group"
```

## Minimal pattern

```tsx
<CheckboxGroup>
  <Label>
    <Checkbox defaultChecked />
    Next.js
  </Label>
  <Label>
    <Checkbox />
    Vite
  </Label>
  <Label>
    <Checkbox />
    Astro
  </Label>
</CheckboxGroup>
```

For form-bound option groups, prefer `Field` + `Fieldset` composition so legend, labels, and errors are grouped correctly.

## Patterns from coss particles

- **Disabled Item**: use `p-checkbox-group-2` as the baseline implementation for this variation.
- **Parent Checkbox**: use `p-checkbox-group-3` as the baseline implementation for this variation.
- **Nested Parent Checkbox**: use `p-checkbox-group-4` as the baseline implementation for this variation.
- **Form Integration**: use `p-checkbox-group-5` as the baseline implementation for this variation.

## Common pitfalls

- Using checkbox group when only one option should be selected.
- Missing group label/legend context for assistive technology.
- Incorrectly handling submitted values as scalar instead of array/list.

## Useful particle references

- with disabled item: `p-checkbox-group-2`
- parent checkbox: `p-checkbox-group-3`
- nested parent checkbox: `p-checkbox-group-4`
- form integration: `p-checkbox-group-5`
- form composition references: `p-form-1`, `p-form-2`, `p-input-group-24`
