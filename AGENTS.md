# AGENTS.md

Guidelines for AI agents working on this codebase.

## Component Patterns

### Select Components

When using Select components, always follow the standard Base UI approach:

1. Define an items array with `{ label, value }` objects
2. Pass the items array to the Select component via the `items` prop
3. Map over the items array to render SelectItem components

```tsx
const items = [
  { label: "Option 1", value: "option1" },
  { label: "Option 2", value: "option2" },
];

<Select defaultValue="option1" items={items}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectPopup>
    {items.map(({ label, value }) => (
      <SelectItem key={value} value={value}>
        {label}
      </SelectItem>
    ))}
  </SelectPopup>
</Select>
```

See `p-select-1` for a reference implementation.
