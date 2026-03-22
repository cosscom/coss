---
name: coss-spinner
description: Use when implementing spinner patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Spinner

## When to use

- Indeterminate loading indicator for ongoing work.
- Inline pending state in buttons, forms, and async panels.

## Install

```bash
npx shadcn@latest add @coss/spinner
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import { Spinner } from "@/components/ui/spinner"
```

## Minimal pattern

```tsx
<div className="flex items-center gap-2">
  <Spinner aria-label="Loading" />
  <span className="text-sm text-muted-foreground">Loading data…</span>
</div>
```

## Patterns from coss particles

- **Input Group**: use the pattern shown in `p-input-12` when this variation is required.
- **Button**: use the pattern shown in `p-button-18` when this variation is required.
- **Inline pending state**: pair spinner with status text for non-visual users.
- **Button loading**: prefer button built-in loading UI where available over ad-hoc spinner wrappers.
## Common pitfalls

- Using spinner without accessible label/context for screen readers.
- Showing spinner with no cancel/retry pathway in long-running operations.
- Using spinner when determinate progress value is available.

## Useful particle references

- input group: `p-input-12`
- button: `p-button-18`
- cross-primitive pending states: `p-button-25`, `p-autocomplete-12`, `p-toast-3`
