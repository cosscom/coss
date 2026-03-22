---
name: number-field
description: Use when implementing numeric entry with coss NumberField, including increment/decrement controls and bounded stepper inputs.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Number Field

## When to use

- Numeric entry with increment/decrement controls.
- Bounded stepper-style quantity/amount inputs.

## Install

```bash
npx shadcn@latest add @coss/number-field
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldScrubArea,
} from "@/components/ui/number-field"
```

## Minimal pattern

```tsx
<NumberField defaultValue={0}>
  <NumberFieldScrubArea label="Quantity" />
  <NumberFieldGroup>
    <NumberFieldDecrement />
    <NumberFieldInput />
    <NumberFieldIncrement />
  </NumberFieldGroup>
</NumberField>
```

For form-bound numeric inputs, prefer wrapping `NumberField` with `Field` + `FieldLabel` + `FieldError` instead of standalone usage.

## Patterns from coss particles

- **Field composition**: use `Field` wrappers for form-bound numeric controls and error messaging.
- **Small Size**: use `p-number-field-2` as the baseline implementation for this variation.
- **Large Size**: use `p-number-field-3` as the baseline implementation for this variation.
- **Disabled**: use `p-number-field-4` as the baseline implementation for this variation.
- **External Label**: use `p-number-field-5` as the baseline implementation for this variation.
- **Scrub**: use `p-number-field-6` as the baseline implementation for this variation.
- **Range**: use `p-number-field-7` as the baseline implementation for this variation.

## Common pitfalls

- Treating number field value as free-form text without numeric bounds/steps.
- Missing increment/decrement controls in stepper-style UIs where expected.
- Not validating min/max constraints and resulting clamped behavior.

## Useful particle references

- small size: `p-number-field-2`
- large size: `p-number-field-3`
- disabled: `p-number-field-4`
- with external label: `p-number-field-5`
- with scrub: `p-number-field-6`
- with range: `p-number-field-7`
- with formatted value: `p-number-field-8`
- with step: `p-number-field-9`
