---
name: coss-drawer
description: Use when implementing drawer patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Drawer

## When to use

- Mobile-first overlay panels and bottom sheets.
- Form-heavy or multi-step overlays where popover is too constrained.

## Install

```bash
npx shadcn@latest add @coss/drawer
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Drawer,
  DrawerCreateHandle,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerMenu,
  DrawerMenuCheckboxItem,
  DrawerMenuGroup,
  DrawerMenuGroupLabel,
  DrawerMenuItem,
  DrawerMenuRadioGroup,
  DrawerMenuRadioItem,
  DrawerMenuSeparator,
  DrawerPanel,
  DrawerPopup,
  DrawerMenuTrigger,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
```

## Minimal pattern

```tsx
<Drawer>
  <DrawerTrigger>Open</DrawerTrigger>
  <DrawerPopup>
    <DrawerHeader>
      <DrawerTitle>Drawer Title</DrawerTitle>
      <DrawerDescription>Drawer Description</DrawerDescription>
    </DrawerHeader>
    <DrawerPanel>Content</DrawerPanel>
    <DrawerFooter>
      <DrawerClose>Close</DrawerClose>
    </DrawerFooter>
  </DrawerPopup>
</Drawer>
```

## Patterns from coss particles

- **Inset variant**: follow `p-drawer-4` for this documented variation.
- **Straight variant**: follow `p-drawer-5` for this documented variation.
- **Scrollable content**: follow `p-drawer-6` for this documented variation.
- **Nested drawers**: follow `p-drawer-7` for this documented variation.
- **Snap points**: follow `p-drawer-9` for this documented variation.
- **Mobile menu**: follow `p-drawer-11` for this documented variation.

## Common pitfalls

- Using drawer for desktop modal flows where dialog/sheet is clearer.
- Forgetting responsive switch logic when drawer is mobile-only variant.
- Breaking section layout by wrapping header/panel/footer without `contents` where required.

## Useful particle references

- inset variant: `p-drawer-4`
- straight variant: `p-drawer-5`
- scrollable content: `p-drawer-6`
- nested drawers: `p-drawer-7`
- snap points: `p-drawer-9`
- mobile menu: `p-drawer-11`
- responsive dialog: `p-drawer-12`
- responsive menu: `p-drawer-13`
- cross-overlay references: `p-dialog-1`, `p-popover-1`, `p-menu-2`
