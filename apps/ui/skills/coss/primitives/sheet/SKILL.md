---
name: coss-sheet
description: Use when implementing sheet patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Sheet

## When to use

- Side-panel overlays for settings/details/workflows.
- Persistent context panels opened from main content area.

## Install

```bash
npx shadcn@latest add @coss/sheet
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
```

## Minimal pattern

```tsx
<Sheet>
  <SheetTrigger>Open</SheetTrigger>
  <SheetPopup>
    <SheetHeader>
      <SheetTitle>Are you absolutely sure?</SheetTitle>
      <SheetDescription>
        This action cannot be undone. This will permanently delete your account
        and remove your data from our servers.
      </SheetDescription>
    </SheetHeader>
    <SheetPanel>Content</SheetPanel>
    <SheetFooter>
      <SheetClose>Close</SheetClose>
    </SheetFooter>
  </SheetPopup>
</Sheet>
```

## Patterns from coss particles

- **Sheet Inset**: follow `p-sheet-2` for this documented variation.
- **Side sheets**: follow `p-sheet-3` for this documented variation.
- **Side variants**: tune side/size for settings vs detail panels.
- **Action footer**: keep close/confirm actions explicit in panel footer regions.
## Common pitfalls

- Using sheet for simple tooltip/popover hints that do not need panel behavior.
- Missing close actions and focus-return verification on open/close cycle.
- Overloading sheet with multi-step form logic better handled by dedicated route/modal flow.

## Useful particle references

- sheet with inset: `p-sheet-2`
- side sheets: `p-sheet-3`
- cross-overlay references: `p-dialog-1`, `p-popover-1`, `p-menu-2`
