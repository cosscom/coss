# Component Migration Index (shadcn/Radix -> coss)

This reference covers every component section in the Radix migration guide. Load this file when you need per-component migration details.

For any component below, when uncertain: check component docs + at least one particle before finalizing output.

- `Accordion`: `type/collapsible` -> `multiple`/array-based `defaultValue`; prefer `AccordionPanel`.
- `Alert`: includes additional semantic variants (`info`, `success`, `warning`, `error`).
- `AlertDialog`: prefer `AlertDialogPopup`/`AlertDialogPanel`; action/cancel patterns map to `AlertDialogClose`.
- `Avatar`: apply `render` composition only where needed.
- `Badge`: supports `render` composition and coss size/variant differences.
- `Button`: supports `render` composition and coss size/variant differences.
- `Card`: prefer `CardPanel` (legacy `CardContent` may still exist).
- `Checkbox`: apply composition patterns per docs when replacing wrapped elements.
- `Collapsible`: prefer `CollapsiblePanel`; migrate trigger composition patterns.
- `Command`: API differs materially from cmdk-style composition; verify against coss docs.
- `Dialog`: prefer `DialogPopup`/`DialogPanel`; migrate trigger/close composition patterns.
- `Group`: prefer `Group*` names; keep required separators and documented structure.
- `Input`: account for coss size mapping differences.
- `InputGroup`: use `InputGroupAddon` + direct controls; preserve documented DOM order patterns.
- `Menu`: `onSelect` -> `onClick`; prefer `Menu*` names and popup aliases.
- `Popover`: prefer `PopoverPopup`; use title/description/close parts where relevant.
- `PreviewCard`: prefer `PreviewCard*` names over hover-card naming.
- `Progress`: when composing custom children, include required track/indicator parts.
- `RadioGroup`: prefer current `Radio` naming where documented.
- `ScrollArea`: migrate composition patterns and aliases per docs.
- `Select`: prefer `items`-first patterns; `SelectValue` supports `placeholder`; use `SelectPopup`.
- `Sheet`: prefer `SheetPopup`/`SheetPanel`; migrate trigger/close composition patterns.
- `Slider`: verify value-shape semantics and controlled/uncontrolled patterns from coss docs.
- `Switch`: migrate composition patterns where wrapped rendering is used.
- `Tabs`: prefer `TabsTab`/`TabsPanel` naming where documented.
- `Textarea`: account for coss size mapping differences.
- `Toast`: API differs from Sonner patterns; verify provider and action APIs from coss docs.
- `Toggle`: migrate composition patterns where wrapped rendering is used.
- `ToggleGroup`: Radix `type` semantics map to coss `multiple` + current item naming.
- `Tooltip`: prefer `TooltipPopup`; migrate trigger composition patterns.
