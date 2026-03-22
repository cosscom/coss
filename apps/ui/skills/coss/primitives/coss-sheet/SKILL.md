---
name: coss-sheet
description: Use when building side-panel overlays with coss Sheet for settings, details, or workflows, including header/panel/footer structure.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Sheet

## When to use

- Side-panel overlays for settings/details/workflows.
- Persistent context panels opened from main content area.

## When NOT to use

- If the overlay should be centered and focused -> use Dialog instead.
- If the overlay is a mobile-only bottom panel -> use Drawer instead.
- If the flow is a destructive confirmation -> use AlertDialog instead.

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
