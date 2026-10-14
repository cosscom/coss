/**
 * The comparison pages.
 *
 * Rule for this file: every claim about another library is checkable, and says
 * where it came from. Verified numbers (version, publish date, weekly downloads,
 * declared dependencies, peer React range) were read from the npm registry on
 * the date in `CHECKED`; licence and feature facts come from each project's own
 * pages, linked in `sources`.
 *
 * A comparison page that overstates its case gets found out in one `npm view`.
 * The pages are also the only place kloq admits, in public, where it loses —
 * which is the part that makes the rest of it believable.
 */

/** The day the npm and project facts below were last checked against source. */
export const CHECKED = "2026-09-01";

export interface CompareRow {
  /** what is being compared */
  label: string;
  /** kloq's answer */
  kloq: string;
  /** theirs */
  them: string;
  /** true when this row is a genuine advantage for kloq — rendered, not implied */
  win?: boolean;
  /** true when this row is a genuine advantage for them */
  loss?: boolean;
  note?: string;
}

export interface Competitor {
  slug: string;
  /** the library's own name */
  name: string;
  /** the npm package the numbers below describe */
  pkg: string;
  /** the query this page is written for */
  query: string;
  /** the one-line honest verdict, shown in the hero */
  verdict: string;
  /** the longer framing under the verdict */
  lede: string;
  version: string;
  published: string;
  /** npm downloads, last week */
  downloads: number;
  rows: CompareRow[];
  /** the trust section: when they are the right answer, in their words not ours */
  chooseThem: { title: string; body: string }[];
  /** and when kloq is */
  chooseKloq: { title: string; body: string }[];
  /** what moving over actually involves */
  migration: { from: string; to: string; note: string }[];
  sources: Source[];
}

type SourceKind = "npm" | "docs" | "repo";
type Source = { label: string; href: string; kind: SourceKind };

const SOURCE_NOUN: Record<Exclude<SourceKind, "npm">, string> = {
  docs: "documentation",
  repo: "GitHub repository",
};

/** Where a page's numbers were read, said from the sources it lists. */
export function sourcedFrom({ name, sources }: Pick<Competitor, "name" | "sources">): string {
  const kinds = new Set(sources.map((s) => s.kind));
  const own = (["docs", "repo"] as const).filter((k) => kinds.has(k)).map((k) => SOURCE_NOUN[k]);
  const theirs = own.length ? `${name}'s ${own.join(" and ")}` : "";
  return [kinds.has("npm") ? "npm" : "", theirs].filter(Boolean).join(" and ");
}

const FULLCALENDAR: Competitor = {
  slug: "fullcalendar",
  name: "FullCalendar",
  pkg: "@fullcalendar/react",
  query: "FullCalendar alternative for React",
  verdict:
    "FullCalendar is the safer choice for most teams. kloq is the better one if the calendar is the product.",
  lede: "FullCalendar is the most widely deployed calendar in the JavaScript ecosystem, and it has earned that. It is older, broader, battle-tested across four frameworks, and its React connector is first-class. If you need a calendar to exist inside your app, install it and move on. This page is about the narrower case where that is not enough.",
  version: "7.0.2",
  published: "2026-07-24",
  downloads: 1_639_091,
  rows: [
    {
      label: "Core licence",
      kloq: "MIT",
      them: "MIT",
      note: "Both cores are genuinely open source.",
    },
    {
      label: "What needs a licence key",
      kloq: "Nothing — every feature is in the npm build",
      them: "Premium plugins: timeline view, vertical resource view, print optimisation",
    },
    {
      label: "Drag to create, move, resize",
      kloq: "Built in",
      them: "Built in",
      note: "Both ship the basic gestures in the core.",
    },
    {
      label: "Resource / timeline views",
      kloq: "Built in",
      them: "Premium plugins",
      note: "kloq schedules rooms, staff or machines on a horizontal timeline with the same drag primitives as the calendar: create, move a bar across rows to reassign its resource, resize, a context menu, zoom and a now indicator. FullCalendar's plugins are older and go further: theirs groups resources into a tree, and kloq has no grouping and is untested past a few hundred rows. Above that, or if you need a resource hierarchy, theirs is the one that works.",
    },
    {
      label: "Frameworks",
      kloq: "React only",
      them: "React, Vue, Angular, vanilla",
      loss: true,
    },
    {
      label: "React versions",
      kloq: "19",
      them: "17, 18, 19",
      loss: true,
    },
    {
      label: "Can you edit the internals?",
      kloq: "Yes — the registry lands the whole library in your repo",
      them: "Premium includes source access; the MIT core is editable by forking",
      win: true,
    },
    {
      label: "Styling",
      kloq: "Tailwind v4 tokens, scoped to [data-kloq-root]",
      them: "Its own CSS, themed with CSS variables",
    },
    {
      label: "Maturity",
      kloq: "0.1.0, new, ~0 production installs",
      them: "Ten-plus years, ~1.6M npm downloads a week",
      loss: true,
    },
  ],
  chooseThem: [
    {
      title: "You need resource grouping or hundreds of rows",
      body: "Rooms down the side, time across the top: kloq does this now too. But FullCalendar's premium timeline view groups resources into a tree, and kloq has no grouping and no virtualization — past a few hundred rows, theirs is the one built for it.",
    },
    {
      title: "You are not on React 19",
      body: "FullCalendar's React connector supports 17, 18 and 19. kloq requires 19 and will not install below it.",
    },
    {
      title: "You need the calendar in more than one framework",
      body: "One FullCalendar API across React, Vue, Angular and vanilla. kloq is a React component and intends to stay one.",
    },
    {
      title: "Boring is the requirement",
      body: "A decade of production use, an enormous body of Stack Overflow answers, and a support contract you can buy. kloq is version 0.1.0 and cannot honestly claim any of that.",
    },
  ],
  chooseKloq: [
    {
      title: "The calendar is the product, not a feature of it",
      body: "When people will spend hours a day dragging things around, the gesture quality stops being a detail. kloq welds the grabbed point under the pointer, ramps edge auto-scroll, and springs a rejected change home — the drag engine writes transforms straight to the DOM and React sees nothing until you drop.",
    },
    {
      title: "You want to own the code",
      body: "The registry lands the whole library under components/kloq/ through the shadcn CLI. Changing a spring is a line, not a fork and a maintenance burden.",
    },
    {
      title: "You want a design surface, not just a widget",
      body: "⌥D opens a calendar-aware inspector with live spring tuning, geometry overlays and a contrast-scoring theme picker. It exists because tuning motion by editing numbers and reloading is miserable.",
    },
  ],
  migration: [
    {
      from: "events={[{ title, start, end }]}",
      to: "defaultEvents={[{ id, title, start, end }]}",
      note: "Both take plain objects with real Date or ISO instants. kloq requires an id and discriminates timed vs all-day on an allDay flag.",
    },
    {
      from: "eventDrop / eventResize callbacks",
      to: "onCommit(change)",
      note: "One seam for every committed change instead of a callback per gesture. Reject it and the block springs back on its own.",
    },
    {
      from: "plugins={[dayGridPlugin, timeGridPlugin]}",
      to: 'view="week" | "month" | 3',
      note: "No plugin registration. All six shapes — day, n-day, week, month, agenda, year — ship in the component behind one prop.",
    },
    {
      from: "datesSet",
      to: "onRangeChange",
      note: "Same job: tell the host which window is visible so it can fetch it.",
    },
  ],
  sources: [
    {
      label: "FullCalendar premium plugins",
      href: "https://fullcalendar.io/docs/premium",
      kind: "docs",
    },
    {
      label: "@fullcalendar/react on npm",
      href: "https://www.npmjs.com/package/@fullcalendar/react",
      kind: "npm",
    },
  ],
};

const REACT_BIG_CALENDAR: Competitor = {
  slug: "react-big-calendar",
  name: "react-big-calendar",
  pkg: "react-big-calendar",
  query: "react-big-calendar alternative",
  verdict:
    "react-big-calendar is free, complete and everywhere. kloq is the answer when its interactions stop feeling good enough.",
  lede: "react-big-calendar is MIT, includes every feature, and draws more than a million downloads a week. The comparison is about how the calendar feels under a pointer and what you carry to get it.",
  version: "1.20.0",
  published: "2026-06-01",
  downloads: 1_202_542,
  rows: [
    {
      label: "Licence",
      kloq: "MIT",
      them: "MIT",
      note: "Both npm packages are MIT licensed.",
    },
    {
      label: "Declared runtime dependencies",
      kloq: "5",
      them: "12, including moment, luxon, dayjs, globalize and lodash",
      win: true,
      note: "It ships every date-library localizer it supports as a dependency.",
    },
    {
      label: "Drag and drop",
      kloq: "Built in, with snap magnetism and a pointer weld",
      them: "An optional addon (withDragAndDrop)",
    },
    {
      label: "Views",
      kloq: "Day, n-day (2–14), week, month, agenda, year",
      them: "Month, week, day, agenda",
      note: "Drag only runs on kloq's time-grid views; month and agenda are navigation surfaces by design, where react-big-calendar does let you drag.",
    },
    {
      label: "Resource / timeline views",
      kloq: "Built in",
      them: "Not built",
      win: true,
      note: "react-big-calendar can split its day and week views into per-resource columns, but time still runs top to bottom. Nothing lays resources down the side with time running horizontally, which is what kloq's timeline does.",
    },
    {
      label: "React versions",
      kloq: "19",
      them: "16.14, 17, 18, 19",
      loss: true,
    },
    {
      label: "Recurrence",
      kloq: "RFC 5545 RRULE, expanded live, this / following / all",
      them: "Not built in — expand the series yourself",
      win: true,
    },
    {
      label: "ICS import and export",
      kloq: "Both directions, pure, never throws on input",
      them: "Not built in",
      win: true,
    },
    {
      label: "Styling",
      kloq: "Tailwind v4 tokens, scoped to [data-kloq-root]",
      them: "Compiled CSS, or SASS variables",
    },
    {
      label: "Maturity",
      kloq: "0.1.0, new",
      them: "1.20.0, ~1.2M npm downloads a week",
      loss: true,
    },
  ],
  chooseThem: [
    {
      title: "Your users drag events around a month grid",
      body: "react-big-calendar supports dragging in month view. kloq deliberately does not: month, agenda and year are selection-and-navigation surfaces, and the drag engine only runs on the time grid.",
    },
    {
      title: "Your app already uses SASS for theming",
      body: "react-big-calendar exposes SASS variables. kloq expects Tailwind v4 tokens, so adopting it would change your styling setup.",
    },
    {
      title: "You are already on moment, luxon or globalize",
      body: "Its localizer system is built around exactly those. kloq uses the platform's Intl and has no localizer seam to plug into.",
    },
    {
      title: "You need React 16, 17 or 18",
      body: "react-big-calendar supports back to 16.14. kloq requires React 19.",
    },
  ],
  chooseKloq: [
    {
      title: "The gestures have started to annoy people",
      body: "This is the honest reason teams leave. kloq's drag engine runs one rAF loop, writes transforms straight to DOM nodes, keeps the grabbed point welded under the pointer, and eases into 15-minute snaps instead of teleporting. Escape springs a drag home.",
    },
    {
      title: "You want recurrence and ICS without assembling them",
      body: "RRULE parsing, live expansion, this / following / all edit semantics, and RFC 5545 import and export both ship in the component and are exported as pure functions.",
    },
    {
      title: "Your bundle already carries too much",
      body: "react-big-calendar declares twelve runtime dependencies, among them four date libraries. kloq declares five and reaches for Intl.",
    },
    {
      title: "You want the library in your repo",
      body: "The shadcn registry installs kloq as ordinary files in your repo, so you can adjust its internals without maintaining a fork.",
    },
  ],
  migration: [
    {
      from: "localizer={momentLocalizer(moment)}",
      to: "— nothing —",
      note: "kloq formats through Intl. There is no localizer to construct; pass locale and displayTimeZone if you need to steer it.",
    },
    {
      from: "events={events} startAccessor endAccessor",
      to: "defaultEvents={events}",
      note: "No accessors: an event is { id, title, start, end } with allDay discriminating the two shapes.",
    },
    {
      from: "withDragAndDrop(Calendar)",
      to: "— nothing —",
      note: "Dragging is not an addon. It is the part of kloq that exists.",
    },
    {
      from: "onEventDrop / onEventResize",
      to: "onCommit(change)",
      note: "One seam for every committed change, with optimistic apply and spring-back on rejection.",
    },
  ],
  sources: [
    {
      label: "react-big-calendar on GitHub",
      href: "https://github.com/jquense/react-big-calendar",
      kind: "repo",
    },
    {
      label: "react-big-calendar on npm",
      href: "https://www.npmjs.com/package/react-big-calendar",
      kind: "npm",
    },
  ],
};

const SCHEDULE_X: Competitor = {
  slug: "schedule-x",
  name: "Schedule-X",
  pkg: "@schedule-x/calendar",
  query: "Schedule-X alternative for React",
  verdict:
    "Schedule-X keeps dragging in premium plugins. In kloq every interaction ships in the npm package.",
  lede: "Schedule-X is a good-looking, modern calendar with an MIT core and optional premium plugins. This comparison looks at which interactions each project includes in its npm package.",
  version: "4.7.0",
  published: "2026-08-27",
  downloads: 174_285,
  rows: [
    {
      label: "Core licence",
      kloq: "MIT",
      them: "MIT",
    },
    {
      label: "Drag and drop",
      kloq: "In the npm build",
      them: "Premium plugin",
      win: true,
    },
    {
      label: "Resize",
      kloq: "In the npm build",
      them: "Premium plugin",
      win: true,
    },
    {
      label: "Drag to create",
      kloq: "In the npm build",
      them: "Premium plugin",
      win: true,
    },
    {
      label: "Event modal / panel",
      kloq: "In the npm build",
      them: "Premium plugin",
      win: true,
    },
    {
      label: "Resource scheduler",
      kloq: "Built in",
      them: "Premium plugin",
      win: true,
      note: "Both schedule resources on a horizontal axis. kloq's ships in the component; Schedule-X's resource view is behind the premium licence.",
    },
    {
      label: "Runtime",
      kloq: "React 19",
      them: "Preact with signals, plus a Temporal polyfill",
      note: "Schedule-X ships a React wrapper over a Preact core.",
    },
    {
      label: "Do you get the source?",
      kloq: "Yes — the whole library lands in your repo",
      them: "Premium plugins are served from a private npm registry",
      win: true,
    },
    {
      label: "Maturity",
      kloq: "0.1.0, new",
      them: "4.7.0, ~174k npm downloads a week",
      loss: true,
    },
  ],
  chooseThem: [
    {
      title: "You want a more established resource scheduler",
      body: "kloq's resource timeline is new in 0.1.0, with no production miles on it yet. Schedule-X's predates it and has a longer release history.",
    },
    {
      title: "You want a Temporal-based date model",
      body: "Schedule-X builds on the Temporal API through a polyfill it declares as a peer dependency. kloq works in Date and Intl, which is more familiar and less future-proof.",
    },
    {
      title: "You are not on React",
      body: "The Preact core means Schedule-X runs in more places than a React-only component does.",
    },
    {
      title: "You want a project that has shipped four majors",
      body: "Schedule-X is at 4.7.0 with a real release history. kloq is at 0.1.0 and has not earned that comparison.",
    },
  ],
  chooseKloq: [
    {
      title: "You do not want the interactions behind a paywall",
      body: "Drag, resize, drag-to-create and the event panel are premium plugins in Schedule-X. In kloq they are in the npm build, including the design mode.",
    },
    {
      title: "You want the source in your own repo",
      body: "The shadcn registry installs kloq as files under components/kloq/, where you can adjust its internals directly.",
    },
    {
      title: "You want one React component",
      body: "kloq's views and interactions share one component API. Schedule-X composes its premium interactions from plugins around a Preact core.",
    },
    {
      title: "You are already a React and Tailwind shop",
      body: "kloq is a React 19 component styled with Tailwind v4 tokens, scoped so it never writes to :root, html or body. No Preact layer in between.",
    },
  ],
  migration: [
    {
      from: "createCalendar({ views, events })",
      to: '<Kloq defaultEvents={events} view="week" />',
      note: "A React component with props rather than a calendar instance you construct and hand to a wrapper.",
    },
    {
      from: "createDragAndDropPlugin() (premium)",
      to: "— nothing —",
      note: "There is no plugin to install.",
    },
    {
      from: "callbacks.onEventUpdate",
      to: "onCommit(change)",
      note: "Same idea. kloq applies optimistically and springs the block back if you reject it.",
    },
    {
      from: "$app.calendarEvents.set(...)",
      to: "events / onEventsChange",
      note: "Controlled React state instead of signals you write into.",
    },
  ],
  sources: [
    {
      label: "@schedule-x/calendar on npm",
      href: "https://www.npmjs.com/package/@schedule-x/calendar",
      kind: "npm",
    },
  ],
};

export const COMPETITORS: Competitor[] = [FULLCALENDAR, REACT_BIG_CALENDAR, SCHEDULE_X];

export const competitors = (): Competitor[] => COMPETITORS;

export const competitorBySlug = (slug: string) => COMPETITORS.find((c) => c.slug === slug);
