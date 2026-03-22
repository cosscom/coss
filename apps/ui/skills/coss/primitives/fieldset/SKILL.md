---
name: coss-fieldset
description: Use when implementing fieldset patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Fieldset

## When to use

- Grouped related controls under one legend/description.
- Complex forms requiring semantic grouping for radios/checkboxes.

## Install

```bash
npx shadcn@latest add @coss/fieldset
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset"
```

## Minimal pattern

```tsx
<Fieldset>
  <FieldsetLegend>Fieldset legend</FieldsetLegend>
</Fieldset>
```

## Patterns from coss particles

- **Semantic group scaffold**: start from `p-fieldset-1` with `FieldsetLegend` as the accessible group heading.
- **Validation integration**: pair labels/descriptions/errors with the same control context.
- **Value-shape correctness**: keep controlled state types aligned with the primitive API.

## Common pitfalls

- Using ad-hoc div wrappers instead of semantic fieldset for grouped controls.
- Omitting `FieldsetLegend`, reducing accessibility context.
- Placing unrelated controls inside one fieldset, hurting form clarity.

## Useful particle references

- core patterns: `p-fieldset-1`
- form composition references: `p-form-1`, `p-form-2`, `p-input-group-24`
