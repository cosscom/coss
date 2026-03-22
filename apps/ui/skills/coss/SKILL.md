---
name: coss
description: Helps implement coss ui primitives correctly in app code. Use when choosing, composing, or troubleshooting coss components (especially when migrating shadcn-style patterns to coss/Base UI).
user-invocable: false
---

# coss ui

coss ui is a component library built on Base UI with a shadcn-like developer experience plus a large particle catalog.

## What this skill is for

Use this skill to:

- pick the right coss primitive(s) for a UI task
- write correct coss usage code (imports, composition, props)
- avoid common migration mistakes from shadcn/Radix assumptions
- reference particle examples to produce practical, production-like patterns

## Source of truth

- coss components docs: `apps/ui/content/docs/components/*.mdx`
  - `https://github.com/cosscom/coss/tree/main/apps/ui/content/docs/components`
- coss particle examples: `apps/ui/registry/default/particles/p-*.tsx`
  - `https://github.com/cosscom/coss/tree/main/apps/ui/registry/default/particles`
- coss particles catalog: `https://coss.com/ui/particles`
- docs map for agents: `https://coss.com/ui/llms.txt`

## Out of scope

- Maintaining coss monorepo internals/build pipelines.
- Editing registry internals unless explicitly requested.

## Principles for agent output

1. Use existing primitives and particles first before inventing custom markup.
2. Prefer composition over custom behavior reimplementation.
3. Follow coss naming and APIs from docs exactly.
4. Keep examples accessible and production-realistic.
5. Prefer concise code that mirrors coss docs/particles conventions.
6. Assume Tailwind CSS v4 conventions in coss examples and setup guidance.

## Critical usage rules

Always apply before returning coss code:

- Do not invent coss APIs. Verify against component docs first.
- For trigger-based primitives (Dialog, Menu, Select, Popover, Tooltip), follow each primitive's documented trigger/content hierarchy and composition API; do not mix patterns across components.
- Preserve accessibility labels and error semantics.
- Consult primitive-specific guides for component invariants and edge cases.
- For manual install guidance, include all required dependencies and local component files referenced by imports.
- Prefer styled coss exports first; use `*Primitive` exports only when custom composition/styling requires it.

Rule references:

- `./rules/styling.md`
- `./rules/forms.md`
- `./rules/composition.md`
- `./rules/base-vs-radix.md`

## Usage workflow

1. Identify user intent (single primitive, composed flow, form flow, overlay flow, feedback flow).
2. Select primitives from coss docs first; avoid custom fallback unless needed.
3. Check at least one particle example for practical composition patterns.
4. Write minimal code using documented imports/props.
5. Self-check accessibility and composition invariants.

## Installation reference

See `./cli.md` for full install/discovery workflow.

Quick CLI pattern:

```bash
npx shadcn@latest add @coss/<component>
```

Quick manual pattern:

- install dependencies listed in the component docs page
- copy required component file(s)
- update imports to match the target app alias setup

## Primitive Guidance

Use dedicated guides when requests involve these flows:

- **Overlay flows**: dialog/menu/select
- **Form-heavy flows**: form/input-group
- **Feedback flows**: toast

High-risk primitive guides:

- `./primitives/dialog/SKILL.md`
- `./primitives/menu/SKILL.md`
- `./primitives/select/SKILL.md`
- `./primitives/form/SKILL.md`
- `./primitives/input-group/SKILL.md`
- `./primitives/toast/SKILL.md`

## Output Checklist

Before returning code:

- imports and props match coss docs
- composition structure is valid for selected primitive(s)
- accessibility and explicit control types (`button`, `input`, etc.) are present
- migration-sensitive flows are verified (type/lint, keyboard/a11y behavior, and SSR-sensitive primitives like Select/Command)

