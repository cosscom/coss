---
name: command
description: Use when building searchable command palettes with coss Command. Note: API differs materially from cmdk-style composition.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Command

## When to use

- Command palette and keyboard-navigable action menus.
- Fast action discovery for power-user and app shortcut workflows.

## When NOT to use

- If the list is a simple set of actions without search -> use Menu instead.
- If the user is selecting from a predefined list -> use Select or Combobox instead.
- If the flow is a data form -> use Form instead.

## Install

```bash
npx shadcn@latest add @coss/command
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandDialogTrigger,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
```

## Minimal pattern

```tsx
const items = [
  { value: "linear", label: "Linear" },
  { value: "figma", label: "Figma" },
  { value: "slack", label: "Slack" },
]

<CommandDialog>
  <CommandDialogTrigger render={<Button variant="outline" />}>
    Open Command Palette
  </CommandDialogTrigger>

  <CommandDialogPopup>
    <Command items={items}>
      <CommandInput placeholder="Search..." />
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandList>
        {(item) => (
          <CommandItem key={item.value} value={item.value}>
            {item.label}
          </CommandItem>
        )}
      </CommandList>
    </Command>
  </CommandDialogPopup>
</CommandDialog>
```

## Patterns from coss particles

- **Dialog palette scaffold**: start from `p-command-1` and preserve dialog-trigger -> popup -> command list structure.
- **Controlled state**: use controlled open/value state for cross-component flows when needed.
- **Accessibility behavior**: validate keyboard open/close, focus movement, and accessible labels.

## Common pitfalls

- Using command list without clear grouping and action labels.
- Binding critical destructive actions without confirmation pathway.
- Missing keyboard accessibility checks for arrow/select/escape interactions.

## Useful particle references

- core patterns: `p-command-1`, `p-command-2`
- related search/selection references: `p-autocomplete-1`, `p-select-1`, `p-input-group-1`
