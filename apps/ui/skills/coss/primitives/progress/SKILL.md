---
name: progress
description: Use when displaying task completion or async operation progress with coss Progress, including determinate and indeterminate modes.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Progress

## When to use

- Task completion and async operation progress bars.
- Indeterminate or determinate status during loading pipelines.

## When NOT to use

- If displaying a bounded measurement (not task completion) -> use Meter instead.
- If the loading state is indeterminate with no percentage -> consider Spinner.

## Install

```bash
npx shadcn@latest add @coss/progress
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
```

## Minimal pattern

```tsx
<Progress value={40} />
```

## Patterns from coss particles

- **Label and Value**: use the pattern shown in `p-progress-2` when this variation is required.
- **Formatted Value**: use the pattern shown in `p-progress-3` when this variation is required.
- **Determinate progress**: bind numeric value for known completion states.
- **Indeterminate loading**: switch to indeterminate mode when progress cannot be measured.
## Common pitfalls

- Using progress without text/context for what operation is progressing.
- Using determinate values when state is actually unknown/indeterminate.
- Using progress for static score displays that should use `Meter`.

## Useful particle references

- with label and value: `p-progress-2`
- with formatted value: `p-progress-3`
