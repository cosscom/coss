---
name: coss-slider
description: Use when implementing slider patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Slider

## When to use

- Continuous or ranged numeric tuning interactions.
- Volume/brightness/threshold controls with immediate feedback.

## Install

```bash
npx shadcn@latest add @coss/slider
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Slider, SliderValue } from "@/components/ui/slider"
```

## Minimal pattern

```tsx
<Slider aria-label="Volume" defaultValue={40} max={100} min={0} />
```

## Patterns from coss particles

- **Label and Value**: use `p-slider-2` as the baseline implementation for this variation.
- **Range Slider**: use `p-slider-3` as the baseline implementation for this variation.
- **Vertical**: use `p-slider-4` as the baseline implementation for this variation.
- **Form Integration**: use `p-slider-5` as the baseline implementation for this variation.

## Common pitfalls

- Using slider for discrete option labels where select/radio is clearer.
- Not exposing current value context in nearby UI text when needed.
- Confusing single-value vs range value shapes in controlled mode.

## Useful particle references

- with label and value: `p-slider-2`
- range slider: `p-slider-3`
- vertical: `p-slider-4`
- form integration: `p-slider-5`
