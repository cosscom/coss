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

### InputGroup Components

When using `InputGroupAddon`, it must always come **after** an `InputGroupInput` or `InputGroupTextarea` in the DOM order. The addon's `onMouseDown` handler uses `querySelector` to find the input/textarea element to focus, so if the addon appears before the input element, it won't be able to find it.

```tsx
// Correct order
<InputGroup>
  <InputGroupTextarea placeholder="Enter code..." />
  <InputGroupAddon align="block-end">
    <Button>Submit</Button>
  </InputGroupAddon>
</InputGroup>

// Incorrect - addon won't find the textarea
<InputGroup>
  <InputGroupAddon align="block-start">
    <Button>Submit</Button>
  </InputGroupAddon>
  <InputGroupTextarea placeholder="Enter code..." />
</InputGroup>
```

Note: The `align` prop controls visual positioning (e.g., `block-start` renders at top, `block-end` at bottom), but the DOM order must still have the input/textarea first for the focus behavior to work.
