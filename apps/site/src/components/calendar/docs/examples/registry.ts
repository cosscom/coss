export type ExampleGroup = "products" | "data" | "customization" | "interaction";

export interface ExampleEntry {
  slug: string;
  title: string;
  description: string;
  group: ExampleGroup;
  tags: string[];
  /** public API names the example leans on — rendered as mono chips */
  uses: string[];
}

export const EXAMPLE_GROUPS: { id: ExampleGroup; title: string; lede: string }[] = [
  {
    id: "products",
    title: "Products",
    lede: "Whole screens you would ship — a calendar dressed as a booking page, a roster, a public agenda.",
  },
  {
    id: "data",
    title: "Data & sync",
    lede: "Where the events come from and where they go: servers, ranges, URLs, storage, files.",
  },
  {
    id: "customization",
    title: "Customization",
    lede: "Swap the visual pieces, run several calendars, change the clock the grid is drawn in.",
  },
  {
    id: "interaction",
    title: "Interaction",
    lede: "Recurrence, commands, keys and natural language — the parts that make it feel like a product.",
  },
];

export const EXAMPLES: ExampleEntry[] = [
  {
    slug: "booking-page",
    title: "Booking calendar",
    description:
      "A Cal.com-style availability picker: busy time hatched and refused by constraints, click a free slot to book.",
    group: "products",
    tags: ["constraints", "controlled", "clipped day"],
    uses: ["constraints", "isSlotDisabled", "slotAllowed", "onSlotClick", "onEventsChange"],
  },
  {
    slug: "team-schedule",
    title: "Team calendar",
    description:
      "Two accounts, five calendars, colour inherited from the calendar — with a calendar list that toggles each one.",
    group: "products",
    tags: ["multi-calendar", "accounts"],
    uses: ["registerCalendarAccount", "CalendarList", "calendarId", "resolveEventColor"],
  },
  {
    slug: "room-booking",
    title: "Room booking",
    description:
      "Four meeting rooms as timeline lanes — drag to book, drag across rooms to reassign, drag an edge to resize.",
    group: "products",
    tags: ["timeline", "lanes", "resources"],
    uses: ["view", "lanes", "laneAdapter", "byResourceId", "timelineWindow"],
  },
  {
    slug: "shift-roster",
    title: "Shift scheduler",
    description:
      "Five people, one week, as timeline lanes — drag to schedule, drag across rows to reassign a shift to someone else.",
    group: "products",
    tags: ["timeline", "lanes", "roster"],
    uses: ["view", "lanes", "laneAdapter", "timelineWindow", "workingHours"],
  },
  {
    slug: "conference-agenda",
    title: "Conference agenda",
    description:
      "A public, read-only programme in 24-hour time with tracks as locations and a details sheet on click.",
    group: "products",
    tags: ["read-only", "agenda", "24h"],
    uses: ["readOnly", "hour12", "locale", "components", "view", "date"],
  },
  {
    slug: "app-shell",
    title: "Calendar in an app layout",
    description:
      "The calendar as one route of a product: sidebar nav, header, and a container that gives it a real height.",
    group: "customization",
    tags: ["layout", "container"],
    uses: ["children", "useKloq", "Kloq.Toolbar", "fits", "switchView"],
  },
  {
    slug: "server-sync",
    title: "Optimistic server sync",
    description:
      "Every change is committed to a fake server with latency and a reject switch; a rejection springs the block home.",
    group: "data",
    tags: ["onCommit", "failure"],
    uses: ["onCommit", "KloqChange", "defaultEvents"],
  },
  {
    slug: "range-fetching",
    title: "Lazy-load by date range",
    description:
      "A controlled calendar that only holds what onRangeChange has fetched, merged page by page.",
    group: "data",
    tags: ["controlled", "paging"],
    uses: ["onRangeChange", "rangePadding", "events", "onEventsChange"],
  },
  {
    slug: "url-state",
    title: "View and date in the URL",
    description:
      "Controlled view and date mirrored into the query string, so a link opens the same week and back/forward work.",
    group: "data",
    tags: ["controlled", "router"],
    uses: ["view", "date", "onViewChange", "onDateChange"],
  },
  {
    slug: "custom-persistence",
    title: "Custom persistence adapter",
    description:
      "Uncontrolled events saved through your own adapter — here sessionStorage with a versioned payload and a per-tenant namespace.",
    group: "data",
    tags: ["adapter", "storage"],
    uses: ["persistence", "storage", "PersistenceAdapter", "readPayload"],
  },
  {
    slug: "ics-import-export",
    title: "ICS import and export",
    description:
      "Drop a .ics feed onto the calendar, then export what is on screen back out as a file.",
    group: "interaction",
    tags: ["ics", "files"],
    uses: ["parseICS", "eventsToICS", "rangeOfView", "downloadICS"],
  },
  {
    slug: "custom-event-block",
    title: "Custom event rendering",
    description:
      "A deploy pipeline drawn with its own EventBlock — status stripe, progress, and the engine contract honoured so drags still work.",
    group: "customization",
    tags: ["slots", "engine contract"],
    uses: ["components", "EventBlockProps", "registerNode", "useKloqSettings"],
  },
  {
    slug: "multi-timezone",
    title: "Multiple time zones",
    description:
      "Draw the grid in any zone, add London / New York / Tokyo gutter columns, and keep each event's authored zone.",
    group: "customization",
    tags: ["time zones", "gutter"],
    uses: ["displayTimeZone", "timeZones", "timeZone", "onTimeZonesClick"],
  },
  {
    slug: "linked-calendars",
    title: "Linked month and day views",
    description:
      "A month overview beside a day view, both controlled by the same date — click a day on the left, it opens on the right.",
    group: "customization",
    tags: ["controlled", "two instances"],
    uses: ["date", "onDateChange", "events", "onEventsChange", "useKloq"],
  },
  {
    slug: "recurring-events",
    title: "Recurring events (RRULE)",
    description:
      "Weekday standups, a fortnightly review and a monthly payday — as RRULE strings, expanded live, edited this / following / all.",
    group: "interaction",
    tags: ["rrule", "series"],
    uses: ["rrule", "describeRRule", "nextOccurrence", "RRuleBuilder"],
  },
  {
    slug: "commands-and-keys",
    title: "Custom ⌘K commands",
    description:
      "Domain commands in the palette, Vim-style h / l / g on the keymap, and a row that lists the effective bindings.",
    group: "interaction",
    tags: ["⌘K", "keymap"],
    uses: ["registerCommands", "keymap", "onCustomizeKeybinds", "globalShortcuts"],
  },
  {
    slug: "quick-add-planner",
    title: "Natural-language event entry",
    description:
      'Type "lunch with Sam tomorrow 1pm" into a box above the grid; the parser underlines what it understood and the event lands.',
    group: "interaction",
    tags: ["quick add", "parser"],
    uses: [
      "parseQuickAdd",
      "highlightSegments",
      "QUICK_ADD_KINDS",
      "quickAddPreview",
      "useKloqStore",
    ],
  },
];

export const exampleBySlug = (slug: string) => EXAMPLES.find((e) => e.slug === slug);
