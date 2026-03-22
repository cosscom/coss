---
name: meter
description: Use when displaying bounded scalar measurements with coss Meter (not task progress), including quality/capacity indicators with min/max semantics.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Meter

## When to use

- Bounded scalar measurement display (not task progress).
- Quality/capacity indicators with min/max semantics.

## When NOT to use

- If displaying task completion or async progress -> use Progress instead.
- If the indicator is indeterminate -> use Spinner or Progress instead.

## Install

```bash
npx shadcn@latest add @coss/meter
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Meter, MeterLabel, MeterValue } from "@/components/ui/meter"
```

## Minimal pattern

```tsx
<Meter value={40}>
  <MeterLabel>Progress</MeterLabel>
  <MeterValue />
</Meter>
```

## Patterns from coss particles

- **Without Label and Value**: use the pattern shown in `p-meter-2` when this variation is required.
- **Formatted Value**: use the pattern shown in `p-meter-3` when this variation is required.
- **Range**: use the pattern shown in `p-meter-4` when this variation is required.

## Common pitfalls

- Using meter to represent completion tasks better suited for `Progress`.
- Missing min/max context when values are not obvious to the user.
- Treating meter as interactive control rather than read-only indicator.

## Useful particle references

- without label and value: `p-meter-2`
- with formatted value: `p-meter-3`
- with range: `p-meter-4`
