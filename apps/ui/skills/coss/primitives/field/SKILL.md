---
name: field
description: Use when composing form fields with coss Field, including label, description, error, and control wiring for accessible form inputs.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Field

## When to use

- Accessible field wrappers with labels, descriptions, and errors.
- Form control state wiring (`invalid`, `required`, touched/error messaging).

## Install

```bash
npx shadcn@latest add @coss/field
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldValidity,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
```

## Minimal pattern

```tsx
<Field>
  <FieldLabel>Name</FieldLabel>
  <Input type="text" placeholder="Enter your name" />
  <FieldDescription>Visible on your profile</FieldDescription>
  <FieldError>Please enter a valid name</FieldError>
  <FieldValidity>
    {(validity) => (
      {validity.error && <p>{validity.error}</p>}
    )}
  </FieldValidity>
</Field>
```

## Patterns from coss particles

- **Required Field**: use `p-field-2` as the baseline implementation for this variation.
- **Disabled Field**: use `p-field-3` as the baseline implementation for this variation.
- **Error**: use `p-field-4` as the baseline implementation for this variation.
- **Validity**: use `p-field-5` as the baseline implementation for this variation.
- **Input Group**: use `p-field-6` as the baseline implementation for this variation.
- **Autocomplete Field**: use `p-field-7` as the baseline implementation for this variation.

## Common pitfalls

- Rendering errors detached from the related control, breaking context.
- Missing `name` in form flows, causing silent submit omissions.
- Using field wrapper without corresponding label/description/error semantics.

## Useful particle references

- required field: `p-field-2`
- disabled field: `p-field-3`
- with error: `p-field-4`
- with validity: `p-field-5`
- input group: `p-field-6`
- autocomplete field: `p-field-7`
- combobox field: `p-field-8`
- combobox multiple field: `p-field-9`
- form composition references: `p-form-1`, `p-form-2`, `p-input-group-24`
