---
name: coss-avatar
description: Use when implementing avatar patterns with coss primitives and particle-backed conventions.
user-invocable: false
---

# coss Avatar

## When to use

- Identity visuals for users/teams in compact spaces.
- Image + fallback initials patterns in cards, lists, and menus.

## Install

```bash
npx shadcn@latest add @coss/avatar
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
```

## Minimal pattern

```tsx
<Avatar>
  <AvatarImage src="/avatars/01.png" alt="User avatar" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

## Patterns from coss particles

- **Fallback Only**: use the pattern shown in `p-avatar-2` when this variation is required.
- **Different Sizes**: use the pattern shown in `p-avatar-3` when this variation is required.
- **Different Radius**: use the pattern shown in `p-avatar-4` when this variation is required.
- **Group Avatars**: use the pattern shown in `p-avatar-5` when this variation is required.

## Common pitfalls

- Omitting `AvatarFallback`, causing broken image states with no identity fallback.
- Using non-descriptive `alt` text on `AvatarImage` in accessible contexts.
- Relying on oversized custom wrappers instead of built-in size variants/classes.

## Useful particle references

- fallback only: `p-avatar-2`
- different sizes: `p-avatar-3`
- different radius: `p-avatar-4`
- group avatars: `p-avatar-5`
