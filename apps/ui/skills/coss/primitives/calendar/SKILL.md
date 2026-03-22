---
name: coss-calendar
description: Use when implementing calendar patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Calendar

## When to use

- Date selection interfaces and calendar-based scheduling UIs.
- Single-date, range, and constrained date picking patterns.

## Install

```bash
npx shadcn@latest add @coss/calendar
```

Manual deps from docs:

```bash
npm install react-day-picker
```

## Canonical imports

```tsx
import { Calendar } from "@/components/ui/calendar"
```

## Minimal pattern

```tsx
<Calendar mode="single" />
```

## Patterns from coss particles

- **Single Date Selection**: follow `p-calendar-2` for this documented variation.
- **Date Range Selection**: follow `p-calendar-3` for this documented variation.
- **Dropdown Navigation**: follow `p-calendar-4` for this documented variation.
- **Select Dropdown for Month/Year**: follow `p-calendar-5` for this documented variation.
- **Combobox Dropdown for Month/Year**: follow `p-calendar-6` for this documented variation.

## Common pitfalls

- Using calendar for free-text date input flows better handled by date fields.
- Missing locale/disabled-date constraints for business rules.
- Treating calendar as date-time picker without explicit time UI.

## Useful particle references

- single date selection: `p-calendar-2`
- date range selection: `p-calendar-3`
- dropdown navigation: `p-calendar-4`
- select dropdown for month/year: `p-calendar-5`
- combobox dropdown for month/year: `p-calendar-6`
