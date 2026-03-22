---
name: coss-combobox
description: Use when implementing combobox patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Combobox

## When to use

- Searchable selection combining text input and list selection.
- Rich option rows with filtering and custom trigger behavior.

## Install

```bash
npx shadcn@latest add @coss/combobox
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox"
```

## Minimal pattern

```tsx
const items = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "orange", label: "Orange" },
  { value: "grape", label: "Grape" },
]

<Combobox items={items}>
  <ComboboxInput placeholder="Select an item..." />
  <ComboboxPopup>
    <ComboboxEmpty>No results found.</ComboboxEmpty>
    <ComboboxList>
      {(item) => <ComboboxItem key={item.value} value={item}>{item.label}</ComboboxItem>}
    </ComboboxList>
  </ComboboxPopup>
</Combobox>
```

For form-bound comboboxes, prefer `Field` composition (`Field` + `FieldLabel` + `FieldError`) instead of standalone controls.

## Patterns from coss particles

- **Field composition**: in forms, wrap combobox with `Field` semantics to align label/error wiring (see `p-form-1` / `p-form-2`).
- **Disabled**: follow `p-combobox-2` for this documented variation.
- **Small Size**: follow `p-combobox-3` for this documented variation.
- **Large Size**: follow `p-combobox-4` for this documented variation.
- **Label**: follow `p-combobox-5` for this documented variation.
- **Auto Highlight**: follow `p-combobox-6` for this documented variation.
- **Clear Button**: follow `p-combobox-7` for this documented variation.

## Common pitfalls

- Mixing select and combobox APIs without validating item/value wiring.
- Using object values without stable string serialization where needed.
- Missing empty/loading states for remote or filtered datasets.

## Useful particle references

- disabled: `p-combobox-2`
- small size: `p-combobox-3`
- large size: `p-combobox-4`
- with label: `p-combobox-5`
- auto highlight: `p-combobox-6`
- with clear button: `p-combobox-7`
- with groups: `p-combobox-8`
- with multiple selection: `p-combobox-9`
- related search/selection references: `p-autocomplete-1`, `p-select-1`, `p-input-group-1`
