# Styling Rules (coss)

Use this guide when writing or updating coss primitives, particles, and docs examples.

## Core Rules

- Use semantic tokens (`text-muted-foreground`, `bg-destructive`) over raw palette classes.
- Prefer component variants/size props before custom class overrides.
- Use `flex flex-col gap-*` layouts instead of `space-x-*`/`space-y-*`.
- Use `size-*` for square sizing.
- Use `cn()` for conditional class composition.
- Avoid redundant classes that defaults already cover (for example `border-border` when border color is already inherited).
- Before adding layout classes, check whether the target part already provides that layout.
- Use Tailwind v4 syntax and conventions in coss examples and snippets.

## coss-specific Expectations

- Do not use numeric icon `size` props; prefer inherited sizing or `size-*` utility classes.
- For icons, default to `aria-hidden="true"` when icon is decorative/redundant; do not hide icons that carry unique semantic meaning.
- Many primitives already define inner SVG sizing. Check existing component styles before adding icon `size-*` classes.
- Many primitives already define inner SVG opacity (commonly around `opacity-80`). Check existing component styles before adding manual icon opacity classes.
- Prefer data-slot-aware selectors and `in-*` patterns over `group` where available.

## Global Styling Setup (when relevant)

Apply this section only when the task touches global theme/layout setup (not normal component usage edits).

- Preserve coss token architecture. Do not replace coss semantic variables with ad-hoc color classes/tokens.
- When providing manual theme setup, include complete token blocks and variable mappings; avoid partial copy/paste snippets that break variable chains.
- Keep font variables aligned with coss expectations (`--font-sans`, `--font-heading`, `--font-mono`) when changing typography setup.
- For Base UI portal layering, keep an isolated application root wrapper (for example `isolate` on the root container).
- For iOS Safari compatibility, ensure `body` has `position: relative` when configuring global layout for portaled backdrops.

## Do / Don't

```tsx
// Do
<Button variant="outline" size="sm" />
<div className="flex flex-col gap-3" />
<Badge className="text-muted-foreground" />
<Button>
  <PlusIcon aria-hidden="true" />
  Add item
</Button>
<Button>
  Save
  <ArrowRightIcon
    aria-hidden="true"
    className="transition-transform in-[[data-slot=button]:hover]:translate-x-0.5"
  />
</Button>

// Don't
<Button className="bg-blue-500 text-white" />
<div className="space-y-3" />
<Icon size={16} />
<Button className="group">
  Save
  <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
</Button>
```

## Check Before Finalizing

1. Any raw color classes that should be semantic?
2. Any duplicate layout/style logic already handled by a primitive?
3. Any icon sizing/opacities violating coss conventions?
4. Any decorative interactive icons missing `aria-hidden="true"`?
5. Any use of `group` that should be replaced with `in-*` + `data-slot`?
