---
name: coss-particles
description: Index of all COSS UI particle examples. Use when implementing UI features to find copy-paste-ready component patterns built on coss primitives. Each particle has a description and a JSON URL for easy installation.
compatibility: Requires coss UI components installed in the project.
license: MIT
metadata:
  author: cosscom
---

# COSS UI Particles Index

Particles are copy-paste-ready UI patterns built on [coss](https://coss.com/ui) primitives. Browse them visually at <https://coss.com/ui/particles>.

## How to use this skill

1. Describe the UI you need (e.g. "a form with validation", "a dialog with a form inside", "tabs with icons").
2. Search this index for matching particles by component type and description.
3. Fetch the JSON URL to get the full source code of the particle.
4. Adapt the particle code to your needs.

## JSON URL pattern

Each particle has a JSON manifest at:
```
https://coss.com/ui/r/<particle-name>.json
```
For example: `https://coss.com/ui/r/p-accordion-1.json`

## Source code

Particle source files live in this repo at `apps/ui/registry/default/particles/`.

## Updating this index

Run the generator script from the coss repo root:
```bash
node apps/ui/skills/coss-particles/scripts/generate-particle-index.cjs
```

Total: **474 particles** across **52 component types**

## Component types

- [accordion](#accordion) (4)
- [alert](#alert) (7)
- [alert-dialog](#alert-dialog) (2)
- [autocomplete](#autocomplete) (15)
- [avatar](#avatar) (14)
- [badge](#badge) (20)
- [breadcrumb](#breadcrumb) (7)
- [button](#button) (40)
- [calendar](#calendar) (24)
- [card](#card) (11)
- [checkbox](#checkbox) (5)
- [checkbox-group](#checkbox-group) (5)
- [collapsible](#collapsible) (1)
- [combobox](#combobox) (18)
- [command](#command) (2)
- [date-picker](#date-picker) (9)
- [dialog](#dialog) (6)
- [drawer](#drawer) (14)
- [empty](#empty) (1)
- [field](#field) (18)
- [fieldset](#fieldset) (1)
- [form](#form) (2)
- [frame](#frame) (4)
- [group](#group) (22)
- [input](#input) (19)
- [input-group](#input-group) (28)
- [input-otp](#input-otp) (7)
- [kbd](#kbd) (1)
- [menu](#menu) (9)
- [meter](#meter) (4)
- [number-field](#number-field) (11)
- [pagination](#pagination) (3)
- [popover](#popover) (3)
- [preview-card](#preview-card) (1)
- [progress](#progress) (3)
- [radio-group](#radio-group) (6)
- [scroll-area](#scroll-area) (5)
- [select](#select) (23)
- [separator](#separator) (1)
- [sheet](#sheet) (3)
- [skeleton](#skeleton) (2)
- [slider](#slider) (23)
- [spinner](#spinner) (1)
- [switch](#switch) (6)
- [table](#table) (4)
- [tabs](#tabs) (13)
- [textarea](#textarea) (15)
- [toast](#toast) (9)
- [toggle](#toggle) (8)
- [toggle-group](#toggle-group) (9)
- [toolbar](#toolbar) (1)
- [tooltip](#tooltip) (4)

---

### accordion

- **p-accordion-1** - Basic accordion | [JSON](https://coss.com/ui/r/p-accordion-1.json)
- **p-accordion-2** - Accordion with one panel open | [JSON](https://coss.com/ui/r/p-accordion-2.json)
- **p-accordion-3** - Accordion allowing multiple panels open | [JSON](https://coss.com/ui/r/p-accordion-3.json)
- **p-accordion-4** - Controlled accordion | [JSON](https://coss.com/ui/r/p-accordion-4.json)

### alert

- **p-alert-1** - Basic alert | [JSON](https://coss.com/ui/r/p-alert-1.json)
- **p-alert-2** - Alert with icon | [JSON](https://coss.com/ui/r/p-alert-2.json)
- **p-alert-3** - Alert with icon and action buttons | [JSON](https://coss.com/ui/r/p-alert-3.json)
- **p-alert-4** - Info alert | [JSON](https://coss.com/ui/r/p-alert-4.json)
- **p-alert-5** - Success alert | [JSON](https://coss.com/ui/r/p-alert-5.json)
- **p-alert-6** - Warning alert | [JSON](https://coss.com/ui/r/p-alert-6.json)
- **p-alert-7** - Error alert | [JSON](https://coss.com/ui/r/p-alert-7.json)

### alert-dialog

- **p-alert-dialog-1** - Alert dialog | [JSON](https://coss.com/ui/r/p-alert-dialog-1.json)
- **p-alert-dialog-2** - Alert dialog with bare footer | [JSON](https://coss.com/ui/r/p-alert-dialog-2.json)

### autocomplete

- **p-autocomplete-1** - Basic autocomplete | [JSON](https://coss.com/ui/r/p-autocomplete-1.json)
- **p-autocomplete-2** - Disabled autocomplete | [JSON](https://coss.com/ui/r/p-autocomplete-2.json)
- **p-autocomplete-3** - Small autocomplete | [JSON](https://coss.com/ui/r/p-autocomplete-3.json)
- **p-autocomplete-4** - Large autocomplete | [JSON](https://coss.com/ui/r/p-autocomplete-4.json)
- **p-autocomplete-5** - Autocomplete with label | [JSON](https://coss.com/ui/r/p-autocomplete-5.json)
- **p-autocomplete-6** - Autocomplete autofilling the input with the highlighted item | [JSON](https://coss.com/ui/r/p-autocomplete-6.json)
- **p-autocomplete-7** - Autocomplete auto highlighting the first option | [JSON](https://coss.com/ui/r/p-autocomplete-7.json)
- **p-autocomplete-8** - Autocomplete with clear button | [JSON](https://coss.com/ui/r/p-autocomplete-8.json)
- **p-autocomplete-9** - Autocomplete with trigger and clear buttons | [JSON](https://coss.com/ui/r/p-autocomplete-9.json)
- **p-autocomplete-10** - Autocomplete with grouped items | [JSON](https://coss.com/ui/r/p-autocomplete-10.json)
- **p-autocomplete-11** - Autocomplete with limited number of results | [JSON](https://coss.com/ui/r/p-autocomplete-11.json)
- **p-autocomplete-12** - Autocomplete with async items loading | [JSON](https://coss.com/ui/r/p-autocomplete-12.json)
- **p-autocomplete-13** - Autocomplete form | [JSON](https://coss.com/ui/r/p-autocomplete-13.json)
- **p-autocomplete-14** - Autocomplete form | [JSON](https://coss.com/ui/r/p-autocomplete-14.json)
- **p-autocomplete-15** - Pill-shaped autocomplete | [JSON](https://coss.com/ui/r/p-autocomplete-15.json)

### avatar

- **p-avatar-1** - Avatar with image and fallback | [JSON](https://coss.com/ui/r/p-avatar-1.json)
- **p-avatar-2** - Fallback-only avatar | [JSON](https://coss.com/ui/r/p-avatar-2.json)
- **p-avatar-3** - Avatars with different sizes | [JSON](https://coss.com/ui/r/p-avatar-3.json)
- **p-avatar-4** - Avatars with different radii | [JSON](https://coss.com/ui/r/p-avatar-4.json)
- **p-avatar-5** - Overlapping avatar group | [JSON](https://coss.com/ui/r/p-avatar-5.json)
- **p-avatar-6** - Avatar with user icon fallback | [JSON](https://coss.com/ui/r/p-avatar-6.json)
- **p-avatar-7** - Avatar with emerald status dot | [JSON](https://coss.com/ui/r/p-avatar-7.json)
- **p-avatar-8** - Avatar with muted status dot | [JSON](https://coss.com/ui/r/p-avatar-8.json)
- **p-avatar-9** - Rounded avatar with top-right emerald status | [JSON](https://coss.com/ui/r/p-avatar-9.json)
- **p-avatar-10** - Avatar with notification badge | [JSON](https://coss.com/ui/r/p-avatar-10.json)
- **p-avatar-11** - Rounded avatar with notification badge | [JSON](https://coss.com/ui/r/p-avatar-11.json)
- **p-avatar-12** - Avatar with verified badge | [JSON](https://coss.com/ui/r/p-avatar-12.json)
- **p-avatar-13** - Small overlapping avatar group | [JSON](https://coss.com/ui/r/p-avatar-13.json)
- **p-avatar-14** - Large overlapping avatar group | [JSON](https://coss.com/ui/r/p-avatar-14.json)

### badge

- **p-badge-1** - Basic badge | [JSON](https://coss.com/ui/r/p-badge-1.json)
- **p-badge-2** - Outline badge | [JSON](https://coss.com/ui/r/p-badge-2.json)
- **p-badge-3** - Secondary badge | [JSON](https://coss.com/ui/r/p-badge-3.json)
- **p-badge-4** - Destructive badge | [JSON](https://coss.com/ui/r/p-badge-4.json)
- **p-badge-5** - Info badge | [JSON](https://coss.com/ui/r/p-badge-5.json)
- **p-badge-6** - Success badge | [JSON](https://coss.com/ui/r/p-badge-6.json)
- **p-badge-7** - Warning badge | [JSON](https://coss.com/ui/r/p-badge-7.json)
- **p-badge-8** - Error badge | [JSON](https://coss.com/ui/r/p-badge-8.json)
- **p-badge-9** - Small badge | [JSON](https://coss.com/ui/r/p-badge-9.json)
- **p-badge-10** - Large badge | [JSON](https://coss.com/ui/r/p-badge-10.json)
- **p-badge-11** - Badge with icon | [JSON](https://coss.com/ui/r/p-badge-11.json)
- **p-badge-12** - Badge with link | [JSON](https://coss.com/ui/r/p-badge-12.json)
- **p-badge-13** - Badge with count | [JSON](https://coss.com/ui/r/p-badge-13.json)
- **p-badge-14** - Full rounded badge (pill) | [JSON](https://coss.com/ui/r/p-badge-14.json)
- **p-badge-15** - Badge with number after text | [JSON](https://coss.com/ui/r/p-badge-15.json)
- **p-badge-16** - Status badge - Paid | [JSON](https://coss.com/ui/r/p-badge-16.json)
- **p-badge-17** - Status badge - Pending | [JSON](https://coss.com/ui/r/p-badge-17.json)
- **p-badge-18** - Status badge - Failed | [JSON](https://coss.com/ui/r/p-badge-18.json)
- **p-badge-19** - Selectable badge with checkbox | [JSON](https://coss.com/ui/r/p-badge-19.json)
- **p-badge-20** - Removable badge | [JSON](https://coss.com/ui/r/p-badge-20.json)

### breadcrumb

- **p-breadcrumb-1** - Breadcrumb with menu example | [JSON](https://coss.com/ui/r/p-breadcrumb-1.json)
- **p-breadcrumb-2** - Breadcrumb with custom separator | [JSON](https://coss.com/ui/r/p-breadcrumb-2.json)
- **p-breadcrumb-3** - Breadcrumb with home icon for home link only | [JSON](https://coss.com/ui/r/p-breadcrumb-3.json)
- **p-breadcrumb-4** - Breadcrumb with folders icon menu | [JSON](https://coss.com/ui/r/p-breadcrumb-4.json)
- **p-breadcrumb-5** - Breadcrumb with icons before text | [JSON](https://coss.com/ui/r/p-breadcrumb-5.json)
- **p-breadcrumb-6** - Breadcrumb with dot separators | [JSON](https://coss.com/ui/r/p-breadcrumb-6.json)
- **p-breadcrumb-7** - Breadcrumb with select dropdown | [JSON](https://coss.com/ui/r/p-breadcrumb-7.json)

### button

- **p-button-1** - Default button | [JSON](https://coss.com/ui/r/p-button-1.json)
- **p-button-2** - Outline button | [JSON](https://coss.com/ui/r/p-button-2.json)
- **p-button-3** - Secondary button | [JSON](https://coss.com/ui/r/p-button-3.json)
- **p-button-4** - Destructive button | [JSON](https://coss.com/ui/r/p-button-4.json)
- **p-button-5** - Destructive outline button | [JSON](https://coss.com/ui/r/p-button-5.json)
- **p-button-6** - Ghost button | [JSON](https://coss.com/ui/r/p-button-6.json)
- **p-button-7** - Link button | [JSON](https://coss.com/ui/r/p-button-7.json)
- **p-button-8** - Extra-small button | [JSON](https://coss.com/ui/r/p-button-8.json)
- **p-button-9** - Small button | [JSON](https://coss.com/ui/r/p-button-9.json)
- **p-button-10** - Large button | [JSON](https://coss.com/ui/r/p-button-10.json)
- **p-button-11** - Extra-large button | [JSON](https://coss.com/ui/r/p-button-11.json)
- **p-button-12** - Disabled button | [JSON](https://coss.com/ui/r/p-button-12.json)
- **p-button-13** - Icon button | [JSON](https://coss.com/ui/r/p-button-13.json)
- **p-button-14** - Small icon button | [JSON](https://coss.com/ui/r/p-button-14.json)
- **p-button-15** - Large icon button | [JSON](https://coss.com/ui/r/p-button-15.json)
- **p-button-16** - Button with icon | [JSON](https://coss.com/ui/r/p-button-16.json)
- **p-button-17** - Link rendered as button | [JSON](https://coss.com/ui/r/p-button-17.json)
- **p-button-41** - Button using the built-in loading prop | [JSON](https://coss.com/ui/r/p-button-41.json)
- **p-button-18** - Custom loading button with manual Spinner | [JSON](https://coss.com/ui/r/p-button-18.json)
- **p-button-19** - Expandable show more/less toggle button | [JSON](https://coss.com/ui/r/p-button-19.json)
- **p-button-20** - Back link button with chevron | [JSON](https://coss.com/ui/r/p-button-20.json)
- **p-button-21** - Card-style button with heading and description | [JSON](https://coss.com/ui/r/p-button-21.json)
- **p-button-22** - Directional pad control buttons | [JSON](https://coss.com/ui/r/p-button-22.json)
- **p-button-23** - Outline like button with count | [JSON](https://coss.com/ui/r/p-button-23.json)
- **p-button-24** - Social login icon buttons | [JSON](https://coss.com/ui/r/p-button-24.json)
- **p-button-26** - Star button with count badge | [JSON](https://coss.com/ui/r/p-button-26.json)
- **p-button-27** - Button group with QR code icon and sign in | [JSON](https://coss.com/ui/r/p-button-27.json)
- **p-button-28** - Button with avatar | [JSON](https://coss.com/ui/r/p-button-28.json)
- **p-button-29** - Pill-shaped button with rounded-full styling | [JSON](https://coss.com/ui/r/p-button-29.json)
- **p-button-30** - Button with animated arrow on hover | [JSON](https://coss.com/ui/r/p-button-30.json)
- **p-button-31** - Button with keyboard shortcut indicator | [JSON](https://coss.com/ui/r/p-button-31.json)
- **p-button-32** - Button with notification badge | [JSON](https://coss.com/ui/r/p-button-32.json)
- **p-button-33** - Paired buttons (Cancel/Save) | [JSON](https://coss.com/ui/r/p-button-33.json)
- **p-button-34** - Button with animated status dot | [JSON](https://coss.com/ui/r/p-button-34.json)
- **p-button-35** - Icon-only copy button with feedback | [JSON](https://coss.com/ui/r/p-button-35.json)
- **p-button-36** - Copy button with feedback | [JSON](https://coss.com/ui/r/p-button-36.json)
- **p-button-37** - Rotating icon button (FAB-style toggle) | [JSON](https://coss.com/ui/r/p-button-37.json)
- **p-button-39** - Hamburger menu button with animated icon | [JSON](https://coss.com/ui/r/p-button-39.json)
- **p-button-40** - Download button with progress and cancel action | [JSON](https://coss.com/ui/r/p-button-40.json)
- **p-button-38** - Social login buttons (Google, X, GitHub) | [JSON](https://coss.com/ui/r/p-button-38.json)

### calendar

- **p-calendar-1** - Basic calendar | [JSON](https://coss.com/ui/r/p-calendar-1.json)
- **p-calendar-3** - Calendar with date range selection | [JSON](https://coss.com/ui/r/p-calendar-3.json)
- **p-calendar-4** - Calendar with month/year dropdown navigation | [JSON](https://coss.com/ui/r/p-calendar-4.json)
- **p-calendar-5** - Calendar with custom Select dropdown for month/year | [JSON](https://coss.com/ui/r/p-calendar-5.json)
- **p-calendar-6** - Calendar with Combobox dropdown for month/year | [JSON](https://coss.com/ui/r/p-calendar-6.json)
- **p-calendar-7** - Calendar with disabled dates | [JSON](https://coss.com/ui/r/p-calendar-7.json)
- **p-calendar-8** - Calendar with multiple date selection | [JSON](https://coss.com/ui/r/p-calendar-8.json)
- **p-calendar-2** - Calendar with custom cell size | [JSON](https://coss.com/ui/r/p-calendar-2.json)
- **p-calendar-9** - Calendar with rounded day buttons | [JSON](https://coss.com/ui/r/p-calendar-9.json)
- **p-calendar-10** - Calendar with rounded range selection style | [JSON](https://coss.com/ui/r/p-calendar-10.json)
- **p-calendar-11** - Calendar with right-aligned navigation | [JSON](https://coss.com/ui/r/p-calendar-11.json)
- **p-calendar-12** - Calendar with week numbers | [JSON](https://coss.com/ui/r/p-calendar-12.json)
- **p-calendar-13** - Calendar with year-only combobox dropdown | [JSON](https://coss.com/ui/r/p-calendar-13.json)
- **p-calendar-14** - Calendar without arrow navigation (dropdown only) | [JSON](https://coss.com/ui/r/p-calendar-14.json)
- **p-calendar-15** - Calendar with current month button | [JSON](https://coss.com/ui/r/p-calendar-15.json)
- **p-calendar-16** - Calendar with today button | [JSON](https://coss.com/ui/r/p-calendar-16.json)
- **p-calendar-17** - Calendar with date input | [JSON](https://coss.com/ui/r/p-calendar-17.json)
- **p-calendar-18** - Calendar with time input | [JSON](https://coss.com/ui/r/p-calendar-18.json)
- **p-calendar-19** - Calendar with time slots (appointment picker) | [JSON](https://coss.com/ui/r/p-calendar-19.json)
- **p-calendar-20** - Calendar with date presets | [JSON](https://coss.com/ui/r/p-calendar-20.json)
- **p-calendar-21** - Range calendar with date presets | [JSON](https://coss.com/ui/r/p-calendar-21.json)
- **p-calendar-22** - Two months calendar | [JSON](https://coss.com/ui/r/p-calendar-22.json)
- **p-calendar-23** - Three months calendar | [JSON](https://coss.com/ui/r/p-calendar-23.json)
- **p-calendar-24** - Pricing calendar with custom day buttons | [JSON](https://coss.com/ui/r/p-calendar-24.json)

### card

- **p-card-1** - A basic card with header and footer | [JSON](https://coss.com/ui/r/p-card-1.json)
- **p-card-2** - Authentication card with actions | [JSON](https://coss.com/ui/r/p-card-2.json)
- **p-card-3** - Authentication card with separators | [JSON](https://coss.com/ui/r/p-card-3.json)
- **p-card-4** - Framed card with footer | [JSON](https://coss.com/ui/r/p-card-4.json)
- **p-card-5** - Framed card with header | [JSON](https://coss.com/ui/r/p-card-5.json)
- **p-card-6** - Framed card with header and footer | [JSON](https://coss.com/ui/r/p-card-6.json)
- **p-card-7** - Framed card with no rounded bottom | [JSON](https://coss.com/ui/r/p-card-7.json)
- **p-card-8** - Card within a frame and footer | [JSON](https://coss.com/ui/r/p-card-8.json)
- **p-card-9** - Card within a frame and footer | [JSON](https://coss.com/ui/r/p-card-9.json)
- **p-card-10** - Card within a frame with header and footer | [JSON](https://coss.com/ui/r/p-card-10.json)
- **p-card-11** - CardFrame with header action | [JSON](https://coss.com/ui/r/p-card-11.json)

### checkbox

- **p-checkbox-1** - Basic checkbox | [JSON](https://coss.com/ui/r/p-checkbox-1.json)
- **p-checkbox-2** - Disabled checkbox | [JSON](https://coss.com/ui/r/p-checkbox-2.json)
- **p-checkbox-3** - Checkbox with description | [JSON](https://coss.com/ui/r/p-checkbox-3.json)
- **p-checkbox-4** - Card-style checkbox | [JSON](https://coss.com/ui/r/p-checkbox-4.json)
- **p-checkbox-5** - Checkbox form | [JSON](https://coss.com/ui/r/p-checkbox-5.json)

### checkbox-group

- **p-checkbox-group-1** - Basic checkbox group | [JSON](https://coss.com/ui/r/p-checkbox-group-1.json)
- **p-checkbox-group-2** - Checkbox group with disabled items | [JSON](https://coss.com/ui/r/p-checkbox-group-2.json)
- **p-checkbox-group-3** - Checkbox group with parent checkbox | [JSON](https://coss.com/ui/r/p-checkbox-group-3.json)
- **p-checkbox-group-4** - Nested checkbox group with parent | [JSON](https://coss.com/ui/r/p-checkbox-group-4.json)
- **p-checkbox-group-5** - Checkbox group form | [JSON](https://coss.com/ui/r/p-checkbox-group-5.json)

### collapsible

- **p-collapsible-1** - Basic collapsible | [JSON](https://coss.com/ui/r/p-collapsible-1.json)

### combobox

- **p-combobox-1** - Basic combobox | [JSON](https://coss.com/ui/r/p-combobox-1.json)
- **p-combobox-2** - Disabled combobox | [JSON](https://coss.com/ui/r/p-combobox-2.json)
- **p-combobox-3** - Small combobox | [JSON](https://coss.com/ui/r/p-combobox-3.json)
- **p-combobox-4** - Large combobox | [JSON](https://coss.com/ui/r/p-combobox-4.json)
- **p-combobox-5** - Combobox with label | [JSON](https://coss.com/ui/r/p-combobox-5.json)
- **p-combobox-6** - Combobox auto highlighting the first option | [JSON](https://coss.com/ui/r/p-combobox-6.json)
- **p-combobox-7** - Combobox with clear button | [JSON](https://coss.com/ui/r/p-combobox-7.json)
- **p-combobox-8** - Combobox with grouped items | [JSON](https://coss.com/ui/r/p-combobox-8.json)
- **p-combobox-9** - Combobox with multiple selection | [JSON](https://coss.com/ui/r/p-combobox-9.json)
- **p-combobox-10** - Combobox with input inside popup | [JSON](https://coss.com/ui/r/p-combobox-10.json)
- **p-combobox-11** - Combobox form | [JSON](https://coss.com/ui/r/p-combobox-11.json)
- **p-combobox-12** - Combobox multiple form | [JSON](https://coss.com/ui/r/p-combobox-12.json)
- **p-combobox-13** - Combobox with start addon | [JSON](https://coss.com/ui/r/p-combobox-13.json)
- **p-combobox-14** - Combobox multiple with start addon | [JSON](https://coss.com/ui/r/p-combobox-14.json)
- **p-combobox-15** - Pill-shaped combobox | [JSON](https://coss.com/ui/r/p-combobox-15.json)
- **p-combobox-16** - Timezone combobox | [JSON](https://coss.com/ui/r/p-combobox-16.json)
- **p-combobox-17** - Timezone combobox with search input | [JSON](https://coss.com/ui/r/p-combobox-17.json)
- **p-combobox-18** - Combobox with select trigger | [JSON](https://coss.com/ui/r/p-combobox-18.json)

### command

- **p-command-1** - Command palette with dialog | [JSON](https://coss.com/ui/r/p-command-1.json)
- **p-command-2** - Command palette with AI assistant | [JSON](https://coss.com/ui/r/p-command-2.json)

### date-picker

- **p-date-picker-1** - Basic date picker | [JSON](https://coss.com/ui/r/p-date-picker-1.json)
- **p-date-picker-2** - Date range picker | [JSON](https://coss.com/ui/r/p-date-picker-2.json)
- **p-date-picker-9** - Two months calendar with range date | [JSON](https://coss.com/ui/r/p-date-picker-9.json)
- **p-date-picker-3** - Date picker with field and dropdown navigation | [JSON](https://coss.com/ui/r/p-date-picker-3.json)
- **p-date-picker-4** - Date picker with presets | [JSON](https://coss.com/ui/r/p-date-picker-4.json)
- **p-date-picker-5** - Date picker with input | [JSON](https://coss.com/ui/r/p-date-picker-5.json)
- **p-date-picker-6** - Date picker that closes on select | [JSON](https://coss.com/ui/r/p-date-picker-6.json)
- **p-date-picker-7** - Multiple dates picker | [JSON](https://coss.com/ui/r/p-date-picker-7.json)
- **p-date-picker-8** - Date picker with select-like trigger | [JSON](https://coss.com/ui/r/p-date-picker-8.json)

### dialog

- **p-dialog-1** - Dialog with form | [JSON](https://coss.com/ui/r/p-dialog-1.json)
- **p-dialog-6** - Dialog with bare footer | [JSON](https://coss.com/ui/r/p-dialog-6.json)
- **p-dialog-2** - Dialog opened from menu | [JSON](https://coss.com/ui/r/p-dialog-2.json)
- **p-dialog-3** - Nested dialogs | [JSON](https://coss.com/ui/r/p-dialog-3.json)
- **p-dialog-4** - Dialog with close confirmation | [JSON](https://coss.com/ui/r/p-dialog-4.json)
- **p-dialog-5** - Dialog with long content | [JSON](https://coss.com/ui/r/p-dialog-5.json)

### drawer

- **p-drawer-1** - Simple bottom drawer with close button | [JSON](https://coss.com/ui/r/p-drawer-1.json)
- **p-drawer-2** - Bottom drawer without drag bar | [JSON](https://coss.com/ui/r/p-drawer-2.json)
- **p-drawer-3** - Drawer with close button | [JSON](https://coss.com/ui/r/p-drawer-3.json)
- **p-drawer-4** - Inset variant drawers for all four positions | [JSON](https://coss.com/ui/r/p-drawer-4.json)
- **p-drawer-5** - Straight variant drawers for all four positions | [JSON](https://coss.com/ui/r/p-drawer-5.json)
- **p-drawer-6** - Scrollable content with terms and conditions | [JSON](https://coss.com/ui/r/p-drawer-6.json)
- **p-drawer-7** - Nested bottom drawers with centered content | [JSON](https://coss.com/ui/r/p-drawer-7.json)
- **p-drawer-8** - Nested right drawers with inset variant | [JSON](https://coss.com/ui/r/p-drawer-8.json)
- **p-drawer-9** - Bottom drawer with snap points | [JSON](https://coss.com/ui/r/p-drawer-9.json)
- **p-drawer-10** - Edit profile form with default and bare footer variants | [JSON](https://coss.com/ui/r/p-drawer-10.json)
- **p-drawer-11** - Mobile menu drawer from the left | [JSON](https://coss.com/ui/r/p-drawer-11.json)
- **p-drawer-12** - Responsive edit profile: dialog on desktop, drawer on mobile | [JSON](https://coss.com/ui/r/p-drawer-12.json)
- **p-drawer-13** - Responsive actions menu: menu on desktop, drawer on mobile | [JSON](https://coss.com/ui/r/p-drawer-13.json)
- **p-drawer-14** - Left drawer with swipe area | [JSON](https://coss.com/ui/r/p-drawer-14.json)

### empty

- **p-empty-1** - Empty state with icon and actions | [JSON](https://coss.com/ui/r/p-empty-1.json)

### field

- **p-field-1** - Field with description | [JSON](https://coss.com/ui/r/p-field-1.json)
- **p-field-2** - Field with required indicator | [JSON](https://coss.com/ui/r/p-field-2.json)
- **p-field-3** - Field in disabled state | [JSON](https://coss.com/ui/r/p-field-3.json)
- **p-field-4** - Field showing validation error | [JSON](https://coss.com/ui/r/p-field-4.json)
- **p-field-5** - Show field validity state | [JSON](https://coss.com/ui/r/p-field-5.json)
- **p-field-6** - Input group with field | [JSON](https://coss.com/ui/r/p-field-6.json)
- **p-field-7** - Field with autocomplete | [JSON](https://coss.com/ui/r/p-field-7.json)
- **p-field-8** - Field with combobox | [JSON](https://coss.com/ui/r/p-field-8.json)
- **p-field-9** - Field with multiple selection combobox | [JSON](https://coss.com/ui/r/p-field-9.json)
- **p-field-10** - Field with textarea | [JSON](https://coss.com/ui/r/p-field-10.json)
- **p-field-11** - Field with select | [JSON](https://coss.com/ui/r/p-field-11.json)
- **p-field-12** - Field with checkbox | [JSON](https://coss.com/ui/r/p-field-12.json)
- **p-field-13** - Field with checkbox group | [JSON](https://coss.com/ui/r/p-field-13.json)
- **p-field-14** - Field with radio group | [JSON](https://coss.com/ui/r/p-field-14.json)
- **p-field-15** - Field with toggle switch | [JSON](https://coss.com/ui/r/p-field-15.json)
- **p-field-16** - Field with slider | [JSON](https://coss.com/ui/r/p-field-16.json)
- **p-field-17** - Field with number field | [JSON](https://coss.com/ui/r/p-field-17.json)
- **p-field-18** - Complete form built with field | [JSON](https://coss.com/ui/r/p-field-18.json)

### fieldset

- **p-fieldset-1** - Fieldset with multiple fields | [JSON](https://coss.com/ui/r/p-fieldset-1.json)

### form

- **p-form-1** - Input in a form | [JSON](https://coss.com/ui/r/p-form-1.json)
- **p-form-2** - Form with zod validation | [JSON](https://coss.com/ui/r/p-form-2.json)

### frame

- **p-frame-1** - Basic frame | [JSON](https://coss.com/ui/r/p-frame-1.json)
- **p-frame-3** - Frame with multiple separated panels | [JSON](https://coss.com/ui/r/p-frame-3.json)
- **p-frame-4** - Frame with multiple stacked panels | [JSON](https://coss.com/ui/r/p-frame-4.json)
- **p-frame-2** - Frame with collapsible content and delete button | [JSON](https://coss.com/ui/r/p-frame-2.json)

### group

- **p-group-1** - Basic group | [JSON](https://coss.com/ui/r/p-group-1.json)
- **p-group-2** - Group with input | [JSON](https://coss.com/ui/r/p-group-2.json)
- **p-group-3** - Small group | [JSON](https://coss.com/ui/r/p-group-3.json)
- **p-group-4** - Large group | [JSON](https://coss.com/ui/r/p-group-4.json)
- **p-group-5** - Group with disabled button | [JSON](https://coss.com/ui/r/p-group-5.json)
- **p-group-6** - Group with default button | [JSON](https://coss.com/ui/r/p-group-6.json)
- **p-group-7** - Group with start text | [JSON](https://coss.com/ui/r/p-group-7.json)
- **p-group-8** - Group with end text | [JSON](https://coss.com/ui/r/p-group-8.json)
- **p-group-9** - Vertical group | [JSON](https://coss.com/ui/r/p-group-9.json)
- **p-group-10** - Nested groups | [JSON](https://coss.com/ui/r/p-group-10.json)
- **p-group-11** - Group with popup | [JSON](https://coss.com/ui/r/p-group-11.json)
- **p-group-12** - Group with input group | [JSON](https://coss.com/ui/r/p-group-12.json)
- **p-group-13** - Group with menu | [JSON](https://coss.com/ui/r/p-group-13.json)
- **p-group-14** - Group with select | [JSON](https://coss.com/ui/r/p-group-14.json)
- **p-group-15** - Group with search | [JSON](https://coss.com/ui/r/p-group-15.json)
- **p-group-16** - Group with add button and input | [JSON](https://coss.com/ui/r/p-group-16.json)
- **p-group-17** - Group with input and currency text | [JSON](https://coss.com/ui/r/p-group-17.json)
- **p-group-18** - Group with select and input | [JSON](https://coss.com/ui/r/p-group-18.json)
- **p-group-19** - Group with input and select | [JSON](https://coss.com/ui/r/p-group-19.json)
- **p-group-20** - Group with input and text button | [JSON](https://coss.com/ui/r/p-group-20.json)
- **p-group-22** - Group with two number inputs for range | [JSON](https://coss.com/ui/r/p-group-22.json)
- **p-group-23** - Group with filter label, combobox multi-select, and remove button | [JSON](https://coss.com/ui/r/p-group-23.json)

### input

- **p-input-1** - Basic input | [JSON](https://coss.com/ui/r/p-input-1.json)
- **p-input-2** - Small input | [JSON](https://coss.com/ui/r/p-input-2.json)
- **p-input-3** - Large input | [JSON](https://coss.com/ui/r/p-input-3.json)
- **p-input-4** - Disabled input | [JSON](https://coss.com/ui/r/p-input-4.json)
- **p-input-5** - File input | [JSON](https://coss.com/ui/r/p-input-5.json)
- **p-input-6** - Input with label | [JSON](https://coss.com/ui/r/p-input-6.json)
- **p-input-7** - Input with button using Group | [JSON](https://coss.com/ui/r/p-input-7.json)
- **p-input-8** - Input with start text and end tooltip | [JSON](https://coss.com/ui/r/p-input-8.json)
- **p-input-9** - Password input with toggle visibility | [JSON](https://coss.com/ui/r/p-input-9.json)
- **p-input-10** - Input group mimicking a URL bar | [JSON](https://coss.com/ui/r/p-input-10.json)
- **p-input-11** - Input group with keyboard shortcut | [JSON](https://coss.com/ui/r/p-input-11.json)
- **p-input-12** - Input group with start loading spinner | [JSON](https://coss.com/ui/r/p-input-12.json)
- **p-input-13** - Input with label and required indicator | [JSON](https://coss.com/ui/r/p-input-13.json)
- **p-input-14** - Input with optional label | [JSON](https://coss.com/ui/r/p-input-14.json)
- **p-input-15** - Input with custom border and background | [JSON](https://coss.com/ui/r/p-input-15.json)
- **p-input-16** - Input group with end loading spinner | [JSON](https://coss.com/ui/r/p-input-16.json)
- **p-input-17** - Read-only input | [JSON](https://coss.com/ui/r/p-input-17.json)
- **p-input-18** - Input with characters remaining counter | [JSON](https://coss.com/ui/r/p-input-18.json)
- **p-input-19** - Pill-shaped input | [JSON](https://coss.com/ui/r/p-input-19.json)

### input-group

- **p-input-group-1** - Basic input group | [JSON](https://coss.com/ui/r/p-input-group-1.json)
- **p-input-group-2** - Input group with end icon | [JSON](https://coss.com/ui/r/p-input-group-2.json)
- **p-input-group-3** - Input group with start text | [JSON](https://coss.com/ui/r/p-input-group-3.json)
- **p-input-group-4** - Input group with end text | [JSON](https://coss.com/ui/r/p-input-group-4.json)
- **p-input-group-5** - Input group with start and end text | [JSON](https://coss.com/ui/r/p-input-group-5.json)
- **p-input-group-6** - Input group with number field | [JSON](https://coss.com/ui/r/p-input-group-6.json)
- **p-input-group-7** - Input group with end tooltip | [JSON](https://coss.com/ui/r/p-input-group-7.json)
- **p-input-group-8** - Input group with icon button | [JSON](https://coss.com/ui/r/p-input-group-8.json)
- **p-input-group-9** - Input group with button | [JSON](https://coss.com/ui/r/p-input-group-9.json)
- **p-input-group-10** - Input group with badge | [JSON](https://coss.com/ui/r/p-input-group-10.json)
- **p-input-group-11** - Input group with keyboard shortcut | [JSON](https://coss.com/ui/r/p-input-group-11.json)
- **p-input-group-12** - Input group with inner label | [JSON](https://coss.com/ui/r/p-input-group-12.json)
- **p-input-group-13** - Small input group | [JSON](https://coss.com/ui/r/p-input-group-13.json)
- **p-input-group-14** - Large input group | [JSON](https://coss.com/ui/r/p-input-group-14.json)
- **p-input-group-15** - Disabled input group | [JSON](https://coss.com/ui/r/p-input-group-15.json)
- **p-input-group-16** - Input group with loading spinner | [JSON](https://coss.com/ui/r/p-input-group-16.json)
- **p-input-group-17** - Input group with textarea | [JSON](https://coss.com/ui/r/p-input-group-17.json)
- **p-input-group-18** - Input group with badge and menu | [JSON](https://coss.com/ui/r/p-input-group-18.json)
- **p-input-group-19** - Mini editor built with input group and toggle | [JSON](https://coss.com/ui/r/p-input-group-19.json)
- **p-input-group-20** - Input group with search icon | [JSON](https://coss.com/ui/r/p-input-group-20.json)
- **p-input-group-21** - Input group with start tooltip | [JSON](https://coss.com/ui/r/p-input-group-21.json)
- **p-input-group-22** - Input group with clear button | [JSON](https://coss.com/ui/r/p-input-group-22.json)
- **p-input-group-23** - Search input group with loader and voice button | [JSON](https://coss.com/ui/r/p-input-group-23.json)
- **p-input-group-24** - Input group with character counter | [JSON](https://coss.com/ui/r/p-input-group-24.json)
- **p-input-group-26** - Password input with strength indicator | [JSON](https://coss.com/ui/r/p-input-group-26.json)
- **p-input-group-27** - Code snippet input with language selector | [JSON](https://coss.com/ui/r/p-input-group-27.json)
- **p-input-group-28** - Message composer with attachment buttons | [JSON](https://coss.com/ui/r/p-input-group-28.json)
- **p-input-group-29** - Chat input with voice and send buttons | [JSON](https://coss.com/ui/r/p-input-group-29.json)

### input-otp

- **p-input-otp-1** - Basic OTP input | [JSON](https://coss.com/ui/r/p-input-otp-1.json)
- **p-input-otp-2** - Large OTP input | [JSON](https://coss.com/ui/r/p-input-otp-2.json)
- **p-input-otp-3** - OTP input with separator | [JSON](https://coss.com/ui/r/p-input-otp-3.json)
- **p-input-otp-4** - OTP input with label | [JSON](https://coss.com/ui/r/p-input-otp-4.json)
- **p-input-otp-5** - Digits-only OTP input | [JSON](https://coss.com/ui/r/p-input-otp-5.json)
- **p-input-otp-6** - Invalid OTP input | [JSON](https://coss.com/ui/r/p-input-otp-6.json)
- **p-input-otp-7** - OTP input with auto validation | [JSON](https://coss.com/ui/r/p-input-otp-7.json)

### kbd

- **p-kbd-1** - Keyboard shortcuts display | [JSON](https://coss.com/ui/r/p-kbd-1.json)

### menu

- **p-menu-1** - Basic menu | [JSON](https://coss.com/ui/r/p-menu-1.json)
- **p-menu-2** - Menu with hover | [JSON](https://coss.com/ui/r/p-menu-2.json)
- **p-menu-3** - Menu with checkbox | [JSON](https://coss.com/ui/r/p-menu-3.json)
- **p-menu-9** - Menu with checkbox items as switches | [JSON](https://coss.com/ui/r/p-menu-9.json)
- **p-menu-4** - Menu with radio group | [JSON](https://coss.com/ui/r/p-menu-4.json)
- **p-menu-5** - Menu with link | [JSON](https://coss.com/ui/r/p-menu-5.json)
- **p-menu-6** - Menu with group labels | [JSON](https://coss.com/ui/r/p-menu-6.json)
- **p-menu-7** - Nested menu | [JSON](https://coss.com/ui/r/p-menu-7.json)
- **p-menu-8** - Menu close on click | [JSON](https://coss.com/ui/r/p-menu-8.json)

### meter

- **p-meter-1** - Basic meter | [JSON](https://coss.com/ui/r/p-meter-1.json)
- **p-meter-2** - Simple meter | [JSON](https://coss.com/ui/r/p-meter-2.json)
- **p-meter-3** - Meter with formatted value | [JSON](https://coss.com/ui/r/p-meter-3.json)
- **p-meter-4** - Meter with range | [JSON](https://coss.com/ui/r/p-meter-4.json)

### number-field

- **p-number-field-1** - Basic number field | [JSON](https://coss.com/ui/r/p-number-field-1.json)
- **p-number-field-2** - Small number field | [JSON](https://coss.com/ui/r/p-number-field-2.json)
- **p-number-field-3** - Large number field | [JSON](https://coss.com/ui/r/p-number-field-3.json)
- **p-number-field-4** - Disabled number field | [JSON](https://coss.com/ui/r/p-number-field-4.json)
- **p-number-field-5** - Number field with label | [JSON](https://coss.com/ui/r/p-number-field-5.json)
- **p-number-field-6** - Number field with scrub | [JSON](https://coss.com/ui/r/p-number-field-6.json)
- **p-number-field-7** - Number field with range | [JSON](https://coss.com/ui/r/p-number-field-7.json)
- **p-number-field-8** - Number field with formatted value | [JSON](https://coss.com/ui/r/p-number-field-8.json)
- **p-number-field-9** - Number field with step | [JSON](https://coss.com/ui/r/p-number-field-9.json)
- **p-number-field-10** - Number field in form | [JSON](https://coss.com/ui/r/p-number-field-10.json)
- **p-number-field-11** - Pill-shaped number field | [JSON](https://coss.com/ui/r/p-number-field-11.json)

### pagination

- **p-pagination-1** - Pagination example | [JSON](https://coss.com/ui/r/p-pagination-1.json)
- **p-pagination-2** - Pagination with previous and next buttons only | [JSON](https://coss.com/ui/r/p-pagination-2.json)
- **p-pagination-3** - Pagination with select, and previous and next buttons | [JSON](https://coss.com/ui/r/p-pagination-3.json)

### popover

- **p-popover-1** - Popover with a form | [JSON](https://coss.com/ui/r/p-popover-1.json)
- **p-popover-2** - Popover with close button | [JSON](https://coss.com/ui/r/p-popover-2.json)
- **p-popover-3** - Animated popovers | [JSON](https://coss.com/ui/r/p-popover-3.json)

### preview-card

- **p-preview-card-1** - Preview card with popup | [JSON](https://coss.com/ui/r/p-preview-card-1.json)

### progress

- **p-progress-1** - Basic progress bar | [JSON](https://coss.com/ui/r/p-progress-1.json)
- **p-progress-2** - Progress with label and value | [JSON](https://coss.com/ui/r/p-progress-2.json)
- **p-progress-3** - Progress with formatted value | [JSON](https://coss.com/ui/r/p-progress-3.json)

### radio-group

- **p-radio-group-1** - Basic radio group | [JSON](https://coss.com/ui/r/p-radio-group-1.json)
- **p-radio-group-2** - Disabled radio group | [JSON](https://coss.com/ui/r/p-radio-group-2.json)
- **p-radio-group-3** - Radio group with description | [JSON](https://coss.com/ui/r/p-radio-group-3.json)
- **p-radio-group-4** - Radio group card | [JSON](https://coss.com/ui/r/p-radio-group-4.json)
- **p-radio-group-5** - Radio group in form | [JSON](https://coss.com/ui/r/p-radio-group-5.json)
- **p-radio-group-6** - Theme selector with image cards | [JSON](https://coss.com/ui/r/p-radio-group-6.json)

### scroll-area

- **p-scroll-area-1** - Basic scroll area | [JSON](https://coss.com/ui/r/p-scroll-area-1.json)
- **p-scroll-area-2** - Horizontal scroll area | [JSON](https://coss.com/ui/r/p-scroll-area-2.json)
- **p-scroll-area-3** - Scroll area with both directions | [JSON](https://coss.com/ui/r/p-scroll-area-3.json)
- **p-scroll-area-4** - Scroll area with fading edges | [JSON](https://coss.com/ui/r/p-scroll-area-4.json)
- **p-scroll-area-5** - Horizontal scroll area with scrollbar gutter | [JSON](https://coss.com/ui/r/p-scroll-area-5.json)

### select

- **p-select-1** - Basic select | [JSON](https://coss.com/ui/r/p-select-1.json)
- **p-select-2** - Small select | [JSON](https://coss.com/ui/r/p-select-2.json)
- **p-select-3** - Large select | [JSON](https://coss.com/ui/r/p-select-3.json)
- **p-select-4** - Disabled select | [JSON](https://coss.com/ui/r/p-select-4.json)
- **p-select-5** - Select without item alignment | [JSON](https://coss.com/ui/r/p-select-5.json)
- **p-select-6** - Select with groups | [JSON](https://coss.com/ui/r/p-select-6.json)
- **p-select-7** - Multiple select | [JSON](https://coss.com/ui/r/p-select-7.json)
- **p-select-8** - Select with icon | [JSON](https://coss.com/ui/r/p-select-8.json)
- **p-select-9** - Select options with icon | [JSON](https://coss.com/ui/r/p-select-9.json)
- **p-select-10** - Select with object values | [JSON](https://coss.com/ui/r/p-select-10.json)
- **p-select-12** - Select with disabled items | [JSON](https://coss.com/ui/r/p-select-12.json)
- **p-select-13** - Timezone select | [JSON](https://coss.com/ui/r/p-select-13.json)
- **p-select-14** - Status select with colored dot | [JSON](https://coss.com/ui/r/p-select-14.json)
- **p-select-15** - Pill-shaped select trigger | [JSON](https://coss.com/ui/r/p-select-15.json)
- **p-select-16** - Select with left text label | [JSON](https://coss.com/ui/r/p-select-16.json)
- **p-select-17** - Select with country flags | [JSON](https://coss.com/ui/r/p-select-17.json)
- **p-select-18** - Select with description in options only | [JSON](https://coss.com/ui/r/p-select-18.json)
- **p-select-19** - Select with avatars | [JSON](https://coss.com/ui/r/p-select-19.json)
- **p-select-20** - Rich select with avatars and usernames | [JSON](https://coss.com/ui/r/p-select-20.json)
- **p-select-21** - Auto width select | [JSON](https://coss.com/ui/r/p-select-21.json)
- **p-select-22** - Select with custom border and background | [JSON](https://coss.com/ui/r/p-select-22.json)
- **p-select-23** - Select with label | [JSON](https://coss.com/ui/r/p-select-23.json)
- **p-select-11** - Select in form | [JSON](https://coss.com/ui/r/p-select-11.json)

### separator

- **p-separator-1** - Separator with horizontal and vertical orientations | [JSON](https://coss.com/ui/r/p-separator-1.json)

### sheet

- **p-sheet-1** - Basic sheet | [JSON](https://coss.com/ui/r/p-sheet-1.json)
- **p-sheet-2** - Sheet inset | [JSON](https://coss.com/ui/r/p-sheet-2.json)
- **p-sheet-3** - Sheet position | [JSON](https://coss.com/ui/r/p-sheet-3.json)

### skeleton

- **p-skeleton-1** - Basic skeleton | [JSON](https://coss.com/ui/r/p-skeleton-1.json)
- **p-skeleton-2** - Skeleton only | [JSON](https://coss.com/ui/r/p-skeleton-2.json)

### slider

- **p-slider-1** - Basic slider | [JSON](https://coss.com/ui/r/p-slider-1.json)
- **p-slider-2** - Slider with label and value | [JSON](https://coss.com/ui/r/p-slider-2.json)
- **p-slider-3** - Disabled slider | [JSON](https://coss.com/ui/r/p-slider-3.json)
- **p-slider-4** - Slider with reference labels | [JSON](https://coss.com/ui/r/p-slider-4.json)
- **p-slider-5** - Slider with ticks | [JSON](https://coss.com/ui/r/p-slider-5.json)
- **p-slider-6** - Slider with labels above | [JSON](https://coss.com/ui/r/p-slider-6.json)
- **p-slider-7** - Range slider | [JSON](https://coss.com/ui/r/p-slider-7.json)
- **p-slider-8** - Slider with 3 thumbs | [JSON](https://coss.com/ui/r/p-slider-8.json)
- **p-slider-9** - Range slider with collision behavior none | [JSON](https://coss.com/ui/r/p-slider-9.json)
- **p-slider-10** - Range slider with collision behavior swap | [JSON](https://coss.com/ui/r/p-slider-10.json)
- **p-slider-11** - Slider with icons | [JSON](https://coss.com/ui/r/p-slider-11.json)
- **p-slider-12** - Slider with input | [JSON](https://coss.com/ui/r/p-slider-12.json)
- **p-slider-13** - Range slider with inputs | [JSON](https://coss.com/ui/r/p-slider-13.json)
- **p-slider-14** - Slider with increment and decrement buttons | [JSON](https://coss.com/ui/r/p-slider-14.json)
- **p-slider-15** - Price range slider | [JSON](https://coss.com/ui/r/p-slider-15.json)
- **p-slider-16** - Emoji rating slider | [JSON](https://coss.com/ui/r/p-slider-16.json)
- **p-slider-17** - Vertical slider | [JSON](https://coss.com/ui/r/p-slider-17.json)
- **p-slider-18** - Vertical range slider | [JSON](https://coss.com/ui/r/p-slider-18.json)
- **p-slider-19** - Vertical slider with input | [JSON](https://coss.com/ui/r/p-slider-19.json)
- **p-slider-20** - Equalizer with vertical sliders | [JSON](https://coss.com/ui/r/p-slider-20.json)
- **p-slider-21** - Object position sliders with reset | [JSON](https://coss.com/ui/r/p-slider-21.json)
- **p-slider-22** - Price slider with histogram | [JSON](https://coss.com/ui/r/p-slider-22.json)
- **p-slider-23** - Slider in form | [JSON](https://coss.com/ui/r/p-slider-23.json)

### spinner

- **p-spinner-1** - Basic spinner | [JSON](https://coss.com/ui/r/p-spinner-1.json)

### switch

- **p-switch-1** - Basic switch | [JSON](https://coss.com/ui/r/p-switch-1.json)
- **p-switch-2** - Disabled switch | [JSON](https://coss.com/ui/r/p-switch-2.json)
- **p-switch-3** - Switch with description | [JSON](https://coss.com/ui/r/p-switch-3.json)
- **p-switch-4** - Switch card | [JSON](https://coss.com/ui/r/p-switch-4.json)
- **p-switch-5** - Switch in form | [JSON](https://coss.com/ui/r/p-switch-5.json)
- **p-switch-6** - Custom size switch | [JSON](https://coss.com/ui/r/p-switch-6.json)

### table

- **p-table-1** - Basic table | [JSON](https://coss.com/ui/r/p-table-1.json)
- **p-table-2** - Framed table | [JSON](https://coss.com/ui/r/p-table-2.json)
- **p-table-3** - Table with TanStack Table and checkboxes | [JSON](https://coss.com/ui/r/p-table-3.json)
- **p-table-4** - Table with TanStack Table, sorting, and pagination | [JSON](https://coss.com/ui/r/p-table-4.json)

### tabs

- **p-tabs-1** - Basic tabs | [JSON](https://coss.com/ui/r/p-tabs-1.json)
- **p-tabs-2** - Tabs with underline | [JSON](https://coss.com/ui/r/p-tabs-2.json)
- **p-tabs-3** - Vertical tabs | [JSON](https://coss.com/ui/r/p-tabs-3.json)
- **p-tabs-4** - Vertical tabs with underline | [JSON](https://coss.com/ui/r/p-tabs-4.json)
- **p-tabs-5** - Tabs with full rounded triggers | [JSON](https://coss.com/ui/r/p-tabs-5.json)
- **p-tabs-6** - Tabs with icon before name | [JSON](https://coss.com/ui/r/p-tabs-6.json)
- **p-tabs-7** - Tabs with icon before name and underline | [JSON](https://coss.com/ui/r/p-tabs-7.json)
- **p-tabs-8** - Tabs with icon only | [JSON](https://coss.com/ui/r/p-tabs-8.json)
- **p-tabs-9** - Tabs with underline and icon on top | [JSON](https://coss.com/ui/r/p-tabs-9.json)
- **p-tabs-10** - Tabs with count badge | [JSON](https://coss.com/ui/r/p-tabs-10.json)
- **p-tabs-11** - Vertical tabs with underline and icon before name | [JSON](https://coss.com/ui/r/p-tabs-11.json)
- **p-tabs-12** - Tabs with icon only and count badge | [JSON](https://coss.com/ui/r/p-tabs-12.json)
- **p-tabs-13** - Tabs with icon only and grouped tooltips | [JSON](https://coss.com/ui/r/p-tabs-13.json)

### textarea

- **p-textarea-1** - Basic textarea | [JSON](https://coss.com/ui/r/p-textarea-1.json)
- **p-textarea-2** - Small textarea | [JSON](https://coss.com/ui/r/p-textarea-2.json)
- **p-textarea-3** - Large textarea | [JSON](https://coss.com/ui/r/p-textarea-3.json)
- **p-textarea-4** - Disabled textarea | [JSON](https://coss.com/ui/r/p-textarea-4.json)
- **p-textarea-5** - Textarea with label | [JSON](https://coss.com/ui/r/p-textarea-5.json)
- **p-textarea-6** - Textarea in form | [JSON](https://coss.com/ui/r/p-textarea-6.json)
- **p-textarea-7** - Textarea with label and required indicator | [JSON](https://coss.com/ui/r/p-textarea-7.json)
- **p-textarea-8** - Textarea with optional label | [JSON](https://coss.com/ui/r/p-textarea-8.json)
- **p-textarea-9** - Textarea with custom border and background | [JSON](https://coss.com/ui/r/p-textarea-9.json)
- **p-textarea-10** - Read-only textarea | [JSON](https://coss.com/ui/r/p-textarea-10.json)
- **p-textarea-11** - Textarea with characters remaining counter | [JSON](https://coss.com/ui/r/p-textarea-11.json)
- **p-textarea-12** - Textarea field with required indicator | [JSON](https://coss.com/ui/r/p-textarea-12.json)
- **p-textarea-13** - Shorter textarea with fixed height | [JSON](https://coss.com/ui/r/p-textarea-13.json)
- **p-textarea-14** - Textarea with button aligned right | [JSON](https://coss.com/ui/r/p-textarea-14.json)
- **p-textarea-15** - Textarea with button aligned left | [JSON](https://coss.com/ui/r/p-textarea-15.json)

### toast

- **p-toast-1** - Basic toast | [JSON](https://coss.com/ui/r/p-toast-1.json)
- **p-toast-2** - Toast with status | [JSON](https://coss.com/ui/r/p-toast-2.json)
- **p-toast-3** - Loading toast | [JSON](https://coss.com/ui/r/p-toast-3.json)
- **p-toast-4** - Toast with action | [JSON](https://coss.com/ui/r/p-toast-4.json)
- **p-toast-5** - Promise toast | [JSON](https://coss.com/ui/r/p-toast-5.json)
- **p-toast-6** - Toast with varying heights | [JSON](https://coss.com/ui/r/p-toast-6.json)
- **p-toast-7** - Anchored toast with tooltip style | [JSON](https://coss.com/ui/r/p-toast-7.json)
- **p-toast-8** - Anchored toast | [JSON](https://coss.com/ui/r/p-toast-8.json)
- **p-toast-9** - Promise toast with cancel action | [JSON](https://coss.com/ui/r/p-toast-9.json)

### toggle

- **p-toggle-1** - Basic toggle | [JSON](https://coss.com/ui/r/p-toggle-1.json)
- **p-toggle-2** - Toggle with outline | [JSON](https://coss.com/ui/r/p-toggle-2.json)
- **p-toggle-3** - Toggle with icon | [JSON](https://coss.com/ui/r/p-toggle-3.json)
- **p-toggle-4** - Small toggle | [JSON](https://coss.com/ui/r/p-toggle-4.json)
- **p-toggle-5** - Large toggle | [JSON](https://coss.com/ui/r/p-toggle-5.json)
- **p-toggle-6** - Disabled toggle | [JSON](https://coss.com/ui/r/p-toggle-6.json)
- **p-toggle-7** - Toggle icon group | [JSON](https://coss.com/ui/r/p-toggle-7.json)
- **p-toggle-8** - Bookmark toggle with tooltip and success toast | [JSON](https://coss.com/ui/r/p-toggle-8.json)

### toggle-group

- **p-toggle-group-1** - Basic toggle group | [JSON](https://coss.com/ui/r/p-toggle-group-1.json)
- **p-toggle-group-2** - Small toggle group | [JSON](https://coss.com/ui/r/p-toggle-group-2.json)
- **p-toggle-group-3** - Large toggle group | [JSON](https://coss.com/ui/r/p-toggle-group-3.json)
- **p-toggle-group-4** - Toggle group with outline | [JSON](https://coss.com/ui/r/p-toggle-group-4.json)
- **p-toggle-group-5** - Vertical toggle group with outline | [JSON](https://coss.com/ui/r/p-toggle-group-5.json)
- **p-toggle-group-6** - Disabled toggle group | [JSON](https://coss.com/ui/r/p-toggle-group-6.json)
- **p-toggle-group-7** - Toggle group with disabled item | [JSON](https://coss.com/ui/r/p-toggle-group-7.json)
- **p-toggle-group-8** - Multiple selection toggle group | [JSON](https://coss.com/ui/r/p-toggle-group-8.json)
- **p-toggle-group-9** - Toggle group with tooltips | [JSON](https://coss.com/ui/r/p-toggle-group-9.json)

### toolbar

- **p-toolbar-1** - Toolbar with toggles, buttons, and select | [JSON](https://coss.com/ui/r/p-toolbar-1.json)

### tooltip

- **p-tooltip-1** - Basic tooltip | [JSON](https://coss.com/ui/r/p-tooltip-1.json)
- **p-tooltip-2** - Grouped tooltips | [JSON](https://coss.com/ui/r/p-tooltip-2.json)
- **p-tooltip-3** - Toggle group animated tooltip | [JSON](https://coss.com/ui/r/p-tooltip-3.json)
- **p-tooltip-4** - Vertical group with animated tooltip | [JSON](https://coss.com/ui/r/p-tooltip-4.json)
