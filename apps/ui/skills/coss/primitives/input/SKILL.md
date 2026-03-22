---
name: input
description: Use when implementing single-line text entry with coss Input, including size variants, typed inputs (email, password, search), and addon composition.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Input

## When to use

- Single-line text entry with variants and addons.
- Email/password/search/file and other typed input flows.

## Install

```bash
npx shadcn@latest add @coss/input
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Input } from "@/components/ui/input"
```

## Minimal pattern

```tsx
<Input aria-label="Email" type="email" placeholder="name@company.com" />
```

Always set `type` explicitly on `Input` (`text`, `email`, `password`, `search`, `file`, etc.). Do not rely on browser defaults.
For form fields, prefer wrapping `Input` with `Field` + `FieldLabel` + `FieldError` instead of standalone usage.

## Patterns from coss particles

- **Small Size**: use `p-input-2` as the baseline implementation for this variation.
- **Large Size**: use `p-input-3` as the baseline implementation for this variation.
- **Disabled**: use `p-input-4` as the baseline implementation for this variation.
- **File**: use `p-input-5` as the baseline implementation for this variation.
- **Label**: use `p-input-6` as the baseline implementation for this variation.
- **Button**: use `p-input-7` as the baseline implementation for this variation.
- **Field composition**: use `Field` wrappers for form-bound inputs (see `p-form-1` / `p-form-2`).

## Common pitfalls

- Omitting explicit `type` and relying on browser defaults.
- Using icon-only affordances without label/aria context.
- Applying heavy class overrides before using built-in size/variant props.

## Useful particle references

- small size: `p-input-2`
- large size: `p-input-3`
- disabled: `p-input-4`
- file: `p-input-5`
- with label: `p-input-6`
- with button: `p-input-7`
- form integration: `p-form-1`
