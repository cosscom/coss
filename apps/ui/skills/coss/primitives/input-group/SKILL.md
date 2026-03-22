---
name: input-group
description: Use when composing input-like controls with addons (icons, text, buttons, badges, shortcuts) using coss InputGroup.
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Input Group

## When to use

- Inputs/textareas that need inline or block addons.
- Input composition with icons, buttons, labels, badges, and shortcuts.

## Install

```bash
npx shadcn@latest add @coss/input-group
```

Manual deps:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
```

## Minimal pattern

```tsx
<InputGroup>
  <InputGroupInput type="email" placeholder="Email" />
  <InputGroupAddon>
    <MailIcon />
  </InputGroupAddon>
</InputGroup>
```

## Critical invariant

`InputGroupAddon` must be after `InputGroupInput`/`InputGroupTextarea` in DOM order for proper focus behavior.

## Patterns from coss particles

- **Icon/text addons**: use `InputGroupAddon` + `InputGroupText` for static prefixes/suffixes (search, URL, currency, domains).
- **Interactive addons**: compose buttons, menu triggers, clear actions, and shortcut hints inside addon slots when actions belong to the input context.
- **Textarea/editor layouts**: use `InputGroupTextarea` with block-start/block-end addons while keeping input/textarea first in DOM order.

## Common pitfalls

- Using `Input`/`Textarea` directly instead of `InputGroupInput`/`InputGroupTextarea`.
- Wrong addon DOM order.
- Missing explicit input types.

## Useful particle references

- icon addon + search baseline: `p-input-group-1`, `p-input-group-2`, `p-input-group-13`, `p-input-group-14`, `p-input-group-20`
- prefix/suffix text addons (url/domain/currency): `p-input-group-3`, `p-input-group-4`, `p-input-group-5`, `p-input-group-6`
- interactive addons (buttons/badge/kbd/menu/clear/voice): `p-input-group-7`, `p-input-group-8`, `p-input-group-9`, `p-input-group-10`, `p-input-group-11`, `p-input-group-12`, `p-input-group-18`, `p-input-group-21`, `p-input-group-22`, `p-input-group-23`
- textarea/editor-style layouts with block-end/start addons: `p-input-group-17`, `p-input-group-19`, `p-input-group-27`, `p-input-group-28`, `p-input-group-29`
- stateful/validation patterns (disabled/loading/password strength): `p-input-group-15`, `p-input-group-16`, `p-input-group-24`, `p-input-group-26`

