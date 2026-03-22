---
name: coss-meter
description: Use when implementing meter patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Meter

## When to use

- Bounded scalar measurement display (not task progress).
- Quality/capacity indicators with min/max semantics.

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
