---
name: coss-textarea
description: Use when implementing textarea patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Textarea

## When to use

- Multi-line text entry (notes, feedback, descriptions).
- Comment/message inputs where text length is variable.

## Install

```bash
npx shadcn@latest add @coss/textarea
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Textarea } from "@/components/ui/textarea"
```

## Minimal pattern

```tsx
<Textarea aria-label="Message" placeholder="Write your message" />
```

For form fields, prefer wrapping `Textarea` with `Field` + `FieldLabel` + `FieldError` so labels, validation, and errors stay semantically linked.
`Textarea` already wraps Base UI `Field.Control` internally, so it works as a form control directly inside `Field` (no need to manually use `FieldControl` + `render` just to mount a textarea).

## Patterns from coss particles

- **Small Size**: use `p-textarea-2` as the baseline implementation for this variation.
- **Large Size**: use `p-textarea-3` as the baseline implementation for this variation.
- **Disabled**: use `p-textarea-4` as the baseline implementation for this variation.
- **Label**: use `p-textarea-5` as the baseline implementation for this variation.
- **Form Integration**: use `p-textarea-6` as the baseline implementation for this variation.
- **Field composition**: prefer `Field` wrappers in form-bound text areas (see `p-form-1` / `p-form-2`).

## Common pitfalls

- Using textarea when a constrained single-line input is expected.
- Missing labels/descriptions for required long-form fields.
- Forgetting explicit submit button type handling in textarea forms.
- Using `FieldControl render={<textarea .../>}` for basic textarea fields when `Textarea` already provides the correct control integration.

## Useful particle references

- small size: `p-textarea-2`
- large size: `p-textarea-3`
- disabled: `p-textarea-4`
- with label: `p-textarea-5`
- form integration: `p-textarea-6`
