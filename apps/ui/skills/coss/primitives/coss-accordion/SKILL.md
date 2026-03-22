---
name: coss-accordion
description: Use when implementing collapsible content sections with coss Accordion (single, multiple, and controlled modes).
compatibility: Requires React 19+, Tailwind CSS v4, and @base-ui-components/react. Designed for Next.js projects using the coss component registry.
metadata:
  author: cosscom
  version: "1.0"
---

# coss Accordion

## When to use

- Expandable multi-section content regions.
- FAQs and settings pages with progressive disclosure.

## Install

```bash
npx shadcn@latest add @coss/accordion
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion"
```

## Minimal pattern

```tsx
<Accordion defaultValue={["item-1"]}>
  <AccordionItem value="item-1">
    <AccordionTrigger>What is Base UI?</AccordionTrigger>
    <AccordionPanel>
      Base UI is a library of high-quality unstyled React components.
    </AccordionPanel>
  </AccordionItem>
</Accordion>
```

## Patterns from coss particles

- **Item invariants**: each `AccordionItem` needs a stable `value`; trigger and panel must be children of the same item.
- **Single vs multiple**: use default single behavior for one-open-at-a-time, add `multiple` when several panels should stay open.
- **Controlled mode**: use `value: string[]` with `onValueChange` for external orchestration (for example, "Open First Two" actions).
- **Default expansion**: use `defaultValue={["..."]}` for pre-opened sections.

## Common pitfalls

- Placing `AccordionTrigger`/`AccordionPanel` outside `AccordionItem`.
- Omitting `value` on `AccordionItem`, which breaks item identity and controlled behavior.
- Applying Radix mental models like `type="single" | "multiple"` instead of coss `multiple` + array values.
- Treating controlled `value` as scalar instead of `string[]`.

## Useful particle references

- baseline mapped-items accordion: `p-accordion-1`
- single-open static sections: `p-accordion-2`
- multiple-open behavior: `p-accordion-3`
- controlled value + external actions: `p-accordion-4`

