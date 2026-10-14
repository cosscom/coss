/**
 * The one catalog of <Kloq> props. `<PropsReference>` renders it as a table and
 * `<Playground>` turns every entry that carries a `knob` into a live control —
 * so the reference and the playground can never disagree.
 */

export type KnobValue =
  | string
  | number
  | boolean
  | Record<string, number | string | boolean>
  | string[];

export type Knob =
  | { kind: "boolean"; defaultValue: boolean }
  | { kind: "select"; options: { label: string; value: KnobValue }[]; defaultValue: KnobValue }
  | { kind: "number"; min: number; max: number; step?: number; defaultValue: number };

export type PropGroup = "State" | "Geometry" | "Time" | "Behaviour" | "Callbacks" | "Advanced";

export interface KloqPropDef {
  name: string;
  type: string;
  description: string;
  default?: string;
  group: PropGroup;
  /** present = the playground offers a control for it */
  knob?: Knob;
}

export const KLOQ_PROPS: KloqPropDef[] = [
  // ── State ──────────────────────────────────────────────────────────────
  {
    name: "view",
    type: '"day" | "week" | "month" | "agenda" | "year" | "timeline" | number',
    description: "Controlled view. A number is an n-day span (2–14). Pair with `onViewChange`.",
    group: "State",
  },
  {
    name: "defaultView",
    type: "KloqView",
    description: "Uncontrolled starting view. Ignored when `view` is set.",
    default: '"week"',
    group: "State",
    knob: {
      kind: "select",
      defaultValue: "week",
      options: [
        { label: "day", value: "day" },
        { label: "week", value: "week" },
        { label: "3-day", value: 3 },
        { label: "month", value: "month" },
        { label: "agenda", value: "agenda" },
        { label: "year", value: "year" },
      ],
    },
  },
  {
    name: "onViewChange",
    type: "(view: KloqView) => void",
    description: "Fired whenever something asks to change the view, controlled or not.",
    group: "Callbacks",
  },
  {
    name: "date",
    type: "Date",
    description: "Controlled anchor date. Navigation only reports via `onDateChange`.",
    group: "State",
  },
  {
    name: "defaultDate",
    type: "Date",
    description: "Uncontrolled starting anchor; defaults to today.",
    group: "State",
  },
  {
    name: "onDateChange",
    type: "(date: Date) => void",
    description: "Fired whenever something asks to move the anchor date.",
    group: "Callbacks",
  },
  {
    name: "events",
    type: "CalEvent[]",
    description: "Controlled events. Switches the internal store off — pair with `onEventsChange`.",
    group: "State",
  },
  {
    name: "onEventsChange",
    type: "(events: CalEvent[]) => void",
    description: "The full next event list on every committed change (controlled mode).",
    group: "Callbacks",
  },
  {
    name: "defaultEvents",
    type: "CalEvent[]",
    description:
      "Uncontrolled starting events. Omit for the sample events; pass `[]` to start empty.",
    default: "sample events",
    group: "State",
  },
  {
    name: "lanes",
    type: "readonly Lane[]",
    description:
      'Rows for `view="timeline"`. Ignored by every other view. Empty by default — nothing renders without `lanes`.',
    default: "[]",
    group: "State",
  },
  {
    name: "persistence",
    type: "false | PersistenceAdapter",
    description:
      "Uncontrolled persistence: `false` is ephemeral, omit is `localStorage`, or bring an adapter.",
    default: "localStorage",
    group: "State",
  },
  {
    name: "storage",
    type: "StorageSetting",
    description:
      "Everything coss calendar keeps in `localStorage`. `false` keeps it in memory; a string namespaces the keys.",
    default: '"kloq"',
    group: "State",
  },
  {
    name: "onCommit",
    type: "OnCommit",
    description:
      "Optimistic seam — called on every committed change; a rejected promise reverts it.",
    group: "Callbacks",
  },
  {
    name: "onUndo",
    type: "() => void",
    description: "Controlled-mode undo — ⌘Z calls it.",
    group: "Callbacks",
  },
  {
    name: "onRedo",
    type: "() => void",
    description: "Controlled-mode redo — ⇧⌘Z calls it.",
    group: "Callbacks",
  },
  {
    name: "onRangeChange",
    type: "(start: Date, end: Date) => void",
    description:
      "The visible range changed — [start, end). Fires once on mount, then on every view or date change.",
    group: "Callbacks",
  },
  {
    name: "rangePadding",
    type: "number | { before: number; after: number }",
    description: "Days to widen the range `onRangeChange` reports.",
    default: "0",
    group: "Advanced",
  },

  // ── Geometry ───────────────────────────────────────────────────────────
  {
    name: "density",
    type: '"comfortable" | "compact"',
    description: "Hour height, event type size and padding together.",
    default: '"comfortable"',
    group: "Geometry",
    knob: {
      kind: "select",
      defaultValue: "comfortable",
      options: [
        { label: "comfortable", value: "comfortable" },
        { label: "compact", value: "compact" },
      ],
    },
  },
  {
    name: "zoom",
    type: "number",
    description: "Live zoom as an index into `ZOOM_STEPS` (0–10; 4 = 100%).",
    default: "4",
    group: "Geometry",
    knob: { kind: "number", min: 0, max: 10, defaultValue: 4 },
  },
  {
    name: "hourHeight",
    type: "number",
    description: "px per hour, clamped to 8–480. Omit and `density` picks the base.",
    group: "Geometry",
  },
  {
    name: "dayStartHour",
    type: "number",
    description: "First hour the grid draws (0–23); with `dayEndHour` this clips the day.",
    default: "0",
    group: "Geometry",
    knob: { kind: "number", min: 0, max: 12, defaultValue: 0 },
  },
  {
    name: "dayEndHour",
    type: "number",
    description: "Last hour the grid draws (exclusive).",
    default: "24",
    group: "Geometry",
    knob: { kind: "number", min: 12, max: 24, defaultValue: 24 },
  },
  {
    name: "snapMinutes",
    type: "number",
    description: "Drag and keyboard snap grid.",
    default: "15",
    group: "Geometry",
    knob: {
      kind: "select",
      defaultValue: 15,
      options: [
        { label: "5 min", value: 5 },
        { label: "10 min", value: 10 },
        { label: "15 min", value: 15 },
        { label: "30 min", value: 30 },
      ],
    },
  },
  {
    name: "snapFineMinutes",
    type: "number",
    description: "Snap grid while ⌥ is held.",
    default: "5",
    group: "Geometry",
  },
  {
    name: "minEventMinutes",
    type: "number",
    description: "Shortest event a resize can produce.",
    default: "15",
    group: "Geometry",
  },
  {
    name: "weekStartsOn",
    type: "0 | 1 | 2 | 3 | 4 | 5 | 6",
    description: "`0` = Sunday … `6` = Saturday.",
    default: "1",
    group: "Geometry",
    knob: {
      kind: "select",
      defaultValue: 1,
      options: [
        { label: "Monday", value: 1 },
        { label: "Sunday", value: 0 },
        { label: "Saturday", value: 6 },
      ],
    },
  },
  {
    name: "constraints",
    type: "KloqConstraints",
    description:
      "Bounds (`minDate` / `maxDate`), a per-slot refusal and a per-event veto. Refused time draws as a hatch; every gesture honours it.",
    group: "Behaviour",
  },
  {
    name: "workingHours",
    type: "{ start: number; end: number } | false",
    description: "Working-hours tint boundaries; `false` disables the tint.",
    default: "{ start: 9, end: 17 }",
    group: "Geometry",
    knob: {
      kind: "select",
      defaultValue: { start: 9, end: 17 },
      options: [
        { label: "9–17", value: { start: 9, end: 17 } },
        { label: "8–18", value: { start: 8, end: 18 } },
        { label: "off", value: false },
      ],
    },
  },
  {
    name: "showWeekNumbers",
    type: "boolean",
    description: "ISO 8601 week numbers in the gutter corner (time-grid views).",
    default: "false",
    group: "Geometry",
    knob: { kind: "boolean", defaultValue: false },
  },
  {
    name: "responsive",
    type: "ResponsiveSetting",
    description:
      "Collapse a week to three days, then to one, as the box narrows. `view` is never rewritten.",
    default: "true",
    group: "Behaviour",
  },

  // ── Time ───────────────────────────────────────────────────────────────
  {
    name: "locale",
    type: "string",
    description: "BCP 47 tag for every date and time label.",
    default: '"en-US"',
    group: "Time",
    knob: {
      kind: "select",
      defaultValue: "en-US",
      options: [
        { label: "en-US", value: "en-US" },
        { label: "en-GB", value: "en-GB" },
        { label: "de-DE", value: "de-DE" },
        { label: "ja-JP", value: "ja-JP" },
      ],
    },
  },
  {
    name: "hour12",
    type: "boolean",
    description: "Force a 12- or 24-hour clock; omit and the locale decides.",
    group: "Time",
    knob: {
      kind: "select",
      defaultValue: "",
      options: [
        { label: "locale decides", value: "" },
        { label: "12-hour", value: true },
        { label: "24-hour", value: false },
      ],
    },
  },
  {
    name: "displayTimeZone",
    type: "string",
    description: "Draw the calendar in this IANA zone instead of the browser's.",
    group: "Time",
  },
  {
    name: "timeZones",
    type: "(string | TimeZoneColumn)[]",
    description: "Extra gutter zone columns, in order.",
    group: "Time",
    knob: {
      kind: "select",
      defaultValue: "",
      options: [
        { label: "none", value: "" },
        { label: "+ UTC", value: ["UTC"] },
        { label: "+ Tokyo, NYC", value: ["Asia/Tokyo", "America/New_York"] },
      ],
    },
  },

  // ── Behaviour ──────────────────────────────────────────────────────────
  {
    name: "designMode",
    type: "boolean | { hint?: boolean }",
    description: "Figma-style design mode (⌥D). `{ hint: false }` hides the hint bar.",
    default: "true",
    group: "Behaviour",
  },
  {
    name: "commandPalette",
    type: "boolean | { commands?: string[] }",
    description:
      "⌘K. `false` removes the binding and the menu; `{ commands }` narrows the built-ins — spread `BUILT_IN_COMMANDS` and filter.",
    default: "true",
    group: "Behaviour",
  },
  {
    name: "globalShortcuts",
    type: "boolean",
    description: "Let ⌘K / ⌘Z / ⌥D fire when focus is outside the calendar.",
    default: "false",
    group: "Behaviour",
  },
  {
    name: "navigationKeys",
    type: '"range" | "day"',
    description: "What ←/→ move by. `PageUp` / `PageDown` always step the range.",
    default: '"range"',
    group: "Behaviour",
    knob: {
      kind: "select",
      defaultValue: "range",
      options: [
        { label: "range", value: "range" },
        { label: "day", value: "day" },
      ],
    },
  },
  {
    name: "currentUserEmail",
    type: "string",
    description: 'Who "you" are. Enables RSVP, per-person conflicts and `showDeclinedEvents`.',
    group: "Behaviour",
  },
  {
    name: "showDeclinedEvents",
    type: "boolean",
    description: "Draw events you have declined.",
    default: "true",
    group: "Behaviour",
  },
  {
    name: "keymap",
    type: "Keymap",
    description: "Overrides for the remappable mnemonics.",
    group: "Behaviour",
  },
  {
    name: "theme",
    type: "string",
    description:
      "Scope a theme to this calendar and its portals — no `<html>` attribute, no `localStorage`. Omit to follow the page (`setTheme`). See Theming.",
    group: "Behaviour",
  },
  {
    name: "scheme",
    type: '"light" | "dark"',
    description:
      "Pin this calendar's colour scheme regardless of the page's `.dark`. Omit to follow the page.",
    group: "Behaviour",
  },
  {
    name: "components",
    type: "Partial<KloqComponents>",
    description: "Slot overrides — swap any visual piece; the engine keeps the physics.",
    group: "Advanced",
  },
  {
    name: "makeId",
    type: "() => string",
    description: "Id factory for everything the calendar creates.",
    default: "random UUID",
    group: "Advanced",
  },
  {
    name: "ssr",
    type: "boolean",
    description:
      "Render the event layer on the server too. Only hydration-safe with controlled `events`, a `date` and `displayTimeZone`.",
    default: "false",
    group: "Advanced",
  },
  {
    name: "laneAdapter",
    type: "LaneAdapter",
    description: 'How an event maps onto a lane, for `view="timeline"`. See Resources & lanes.',
    default: "byResourceId()",
    group: "Advanced",
  },
  {
    name: "timelineWindow",
    type: "TimelineWindowConfig",
    description:
      "The timeline's visible span and slot size — controlled (pass `start` and `end`) or derived from the anchor date. See Resource timeline.",
    group: "Advanced",
  },

  // ── Callbacks ──────────────────────────────────────────────────────────
  {
    name: "onEventClick",
    type: "(event: CalEvent, placementId: string) => void",
    description: "An event was clicked, not dragged.",
    group: "Callbacks",
  },
  {
    name: "onEventDoubleClick",
    type: "(event: CalEvent, placementId: string) => void",
    description: "Double-click on an event; fires after `onEventClick`.",
    group: "Callbacks",
  },
  {
    name: "onSlotClick",
    type: "(slot: { start: Date; end: Date; allDay: boolean }) => void",
    description: "An empty slot was clicked, snapped like drag-create.",
    group: "Callbacks",
  },
  {
    name: "onSelectionChange",
    type: "(events: CalEvent[]) => void",
    description: "The selection changed, in reading order.",
    group: "Callbacks",
  },
  {
    name: "onTimeZonesClick",
    type: "() => void",
    description:
      "The gutter-corner zone labels were pressed; providing it renders them as a button.",
    group: "Callbacks",
  },
  {
    name: "onCustomizeKeybinds",
    type: "() => void",
    description: '"Customize shortcuts…" was pressed in the ? sheet.',
    group: "Callbacks",
  },
];

export const KNOBBED_PROPS = KLOQ_PROPS.filter((p) => p.knob !== undefined);

export function propsNamed(names: readonly string[] | undefined): KloqPropDef[] {
  if (!names) return KNOBBED_PROPS;
  const byName = new Map(KLOQ_PROPS.map((p) => [p.name, p]));
  return names.flatMap((n) => {
    const p = byName.get(n);
    if (!p) throw new Error(`Unknown coss calendar prop "${n}"`);
    return p.knob ? [p] : [];
  });
}
