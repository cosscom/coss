# coss Component Registry Index

Use this file to quickly identify the right coss primitive for a UI task. Each entry includes the component name, a one-line purpose, and the skill path for detailed guidance.

## Overlays & Popups
- **Dialog** — Centered modal requiring user focus. `primitives/dialog/`
- **AlertDialog** — Destructive/critical confirmation modal. `primitives/alert-dialog/`
- **Sheet** — Side-panel overlay for settings/details. `primitives/sheet/`
- **Drawer** — Bottom/side drawer, often mobile-responsive. `primitives/drawer/`
- **Popover** — Anchored non-modal floating content. `primitives/popover/`
- **Tooltip** — Short hover/focus hint text. `primitives/tooltip/`
- **PreviewCard** — Hover-triggered rich entity preview. `primitives/preview-card/`
- **Menu** — Dropdown action list with groups/submenus. `primitives/menu/`
- **Command** — Searchable command palette (not cmdk). `primitives/command/`

## Selection & Input
- **Select** — Single-choice from predefined list (no search). `primitives/select/`
- **Combobox** — Searchable selection with filtering. `primitives/combobox/`
- **Autocomplete** — Free-text with suggestions. `primitives/autocomplete/`
- **Input** — Single-line text entry. `primitives/input/`
- **Textarea** — Multi-line text entry. `primitives/textarea/`
- **InputGroup** — Input with addons (icons, buttons, badges). `primitives/input-group/`
- **InputOTP** — One-time passcode segmented slots. `primitives/input-otp/`
- **NumberField** — Numeric entry with stepper controls. `primitives/number-field/`
- **Slider** — Continuous/ranged numeric control. `primitives/slider/`
- **Calendar** — Date picker / calendar views. `primitives/calendar/`

## Forms & Validation
- **Form** — Form validation/submission with Zod. `primitives/form/`
- **Field** — Label + description + error wiring. `primitives/field/`
- **Fieldset** — Grouped form controls with legend. `primitives/fieldset/`
- **Label** — Accessible label for controls. `primitives/label/`

## Toggle & Choice
- **Checkbox** — Single boolean toggle. `primitives/checkbox/`
- **CheckboxGroup** — Multiple-selection set. `primitives/checkbox-group/`
- **RadioGroup** — Mutually exclusive single choice. `primitives/radio-group/`
- **Switch** — Binary on/off preference toggle. `primitives/switch/`
- **Toggle** — Pressable two-state command button. `primitives/toggle/`
- **ToggleGroup** — Grouped pressed-state controls. `primitives/toggle-group/`

## Layout & Navigation
- **Tabs** — Mutually exclusive tabbed panels. `primitives/tabs/`
- **Accordion** — Collapsible content sections. `primitives/accordion/`
- **Collapsible** — Single expand/collapse region. `primitives/collapsible/`
- **Sidebar** — Persistent app shell navigation. `primitives/sidebar/`
- **Breadcrumb** — Hierarchical navigation trail. `primitives/breadcrumb/`
- **Pagination** — Paged navigation controls. `primitives/pagination/`
- **Toolbar** — Grouped command/action strip. `primitives/toolbar/`
- **ScrollArea** — Styled scroll container. `primitives/scroll-area/`

## Content & Display
- **Card** — Content container with sections. `primitives/card/`
- **Frame** — Bordered content surface. `primitives/frame/`
- **Table** — Tabular data presentation. `primitives/table/`
- **Avatar** — User/entity profile image. `primitives/avatar/`
- **Badge** — Status indicator / label. `primitives/badge/`
- **Kbd** — Keyboard shortcut hints. `primitives/kbd/`
- **Separator** — Visual/semantic divider. `primitives/separator/`
- **Group** — Connected control cluster. `primitives/group/`
- **Empty** — Empty-state placeholder. `primitives/empty/`

## Feedback & Status
- **Alert** — Inline persistent status message. `primitives/alert/`
- **Toast** — Transient notification (toastManager). `primitives/toast/`
- **Progress** — Task completion / async progress bar. `primitives/progress/`
- **Meter** — Bounded scalar measurement. `primitives/meter/`
- **Spinner** — Indeterminate loading indicator. `primitives/spinner/`
- **Skeleton** — Loading placeholder. `primitives/skeleton/`

## Actions
- **Button** — Primary/secondary action trigger. `primitives/button/`
