---
name: radio-group
description: Use when implementing mutually exclusive single-choice selection with coss RadioGroup, including option labels and field composition.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Radio Group

## When to use

- Mutually exclusive option selection.
- Single-choice settings with clear option labels.

## When NOT to use

- If multiple options can be selected -> use CheckboxGroup instead.
- If options are many and need search/filtering -> use Select or Combobox instead.
- If the choices are binary (on/off) -> use Switch or Checkbox instead.

## Install

```bash
npx shadcn@latest add @coss/radio-group
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Label } from "@/components/ui/label"
import { Radio, RadioGroup } from "@/components/ui/radio-group"
```

## Minimal pattern

```tsx
<RadioGroup defaultValue="next">
  <Label>
    <Radio value="next" /> Next.js
  </Label>
  <Label>
    <Radio value="vite" /> Vite
  </Label>
  <Label>
    <Radio value="astro" /> Astro
  </Label>
</RadioGroup>
```

For form-bound single-choice groups, prefer `Field` + `Fieldset` composition to keep legend and validation semantics consistent.

## Patterns from coss particles

- **Disabled**: use `p-radio-group-2` as the baseline implementation for this variation.
- **Description**: use `p-radio-group-3` as the baseline implementation for this variation.
- **Card Style**: use `p-radio-group-4` as the baseline implementation for this variation.
- **Form Integration**: use `p-radio-group-5` as the baseline implementation for this variation.

## Common pitfalls

- Using radios for multi-select behavior that requires checkbox group.
- Missing label association for each radio option.
- Handling selected value as array when radio group returns single value.

## Useful particle references

- disabled: `p-radio-group-2`
- with description: `p-radio-group-3`
- card style: `p-radio-group-4`
- form integration: `p-radio-group-5`
- form composition references: `p-form-1`, `p-form-2`, `p-input-group-24`
