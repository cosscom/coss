---
name: coss-checkbox
description: Use when implementing single boolean toggles with coss Checkbox, including indeterminate state and render composition for custom visuals.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Checkbox

## When to use

- Single boolean consent/selection controls.
- Standalone yes/no options with explicit labeling.

## When NOT to use

- If the control is a preference toggle (on/off) in settings -> use Switch instead.
- If selecting from mutually exclusive options -> use RadioGroup instead.
- If multiple checkboxes share grouped state -> use CheckboxGroup instead.

## Install

```bash
npx shadcn@latest add @coss/checkbox
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Checkbox } from "@/components/ui/checkbox"
```

## Minimal pattern

```tsx
<Label>
  <Checkbox value="terms" />
  Accept terms and conditions
</Label>
```

## Patterns from coss particles

- **Disabled**: use `p-checkbox-2` as the baseline implementation for this variation.
- **Description**: use `p-checkbox-3` as the baseline implementation for this variation.
- **Card Style**: use `p-checkbox-4` as the baseline implementation for this variation.
- **Form Integration**: use `p-checkbox-5` as the baseline implementation for this variation.

## Common pitfalls

- Using checkbox for exclusive single-choice options that should be radios.
- Missing visible label association (`Label` or `FieldLabel`) for each checkbox.
- Treating `onCheckedChange` values as plain boolean without handling indeterminate where relevant.

## Useful particle references

- disabled: `p-checkbox-2`
- with description: `p-checkbox-3`
- card style: `p-checkbox-4`
- form integration: `p-checkbox-5`
