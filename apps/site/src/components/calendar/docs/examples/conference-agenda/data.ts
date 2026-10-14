import { type CalEvent, type EventColor, instantAt, resolveView } from "kloq";

export const CONFERENCE = { name: "KinetiConf", city: "Berlin", days: 2 };

export const TRACKS: Record<string, EventColor> = {
  "Main stage": "blue",
  Workshops: "violet",
  Lab: "amber",
  Foyer: "emerald",
};

type Session = [
  day: number,
  at: string,
  minutes: number,
  track: keyof typeof TRACKS,
  title: string,
  speakers: string[],
  blurb?: string,
];

const SESSIONS: Session[] = [
  [0, "09:00", 30, "Foyer", "Registration & coffee", []],
  [
    0,
    "09:30",
    45,
    "Main stage",
    "Opening keynote: a calendar is a physics engine",
    ["Maya Lindqvist"],
    "Why every drag in a calendar should be a spring, not a tween — and what that buys you at 120 Hz.",
  ],
  [
    0,
    "10:30",
    45,
    "Main stage",
    "Time zones without a database",
    ["Tomasz Wierzbicki"],
    "Everything Intl gives you for free, and the three DST edge cases it does not.",
  ],
  [
    0,
    "10:30",
    90,
    "Workshops",
    "Build a booking page in an hour",
    ["Priya Raman"],
    "Controlled events, a clipped day, read-only blocks and a confirm card. Laptops required.",
  ],
  [0, "12:00", 60, "Foyer", "Lunch", []],
  [
    0,
    "13:00",
    45,
    "Main stage",
    "Drag physics: settle, don't snap",
    ["Jonah Reyes"],
    "Frame-by-frame through a move, a resize and a rejected commit springing home.",
  ],
  [
    0,
    "13:00",
    45,
    "Lab",
    "Office hours: recurrence edge cases",
    ["Aiko Tanaka"],
    "Bring your worst RRULE. Fifth Fridays, leap days, UNTIL across a DST change.",
  ],
  [
    0,
    "14:00",
    45,
    "Main stage",
    "Designing for compact density",
    ["Ines Ferreira"],
    "Forty-four pixels an hour: what a title, a time and a colour bar need to stay legible.",
  ],
  [
    0,
    "14:00",
    90,
    "Workshops",
    "Slots: your own event block",
    ["Kwame Mensah"],
    "Swap the block, keep the engine. The data attributes the drag layer needs and nothing more.",
  ],
  [
    0,
    "15:30",
    45,
    "Main stage",
    "Panel: what a calendar owes its users",
    ["Maya Lindqvist", "Jonah Reyes", "Ines Ferreira"],
  ],
  [0, "16:30", 30, "Main stage", "Lightning talks", []],
  [1, "09:00", 30, "Foyer", "Coffee", []],
  [
    1,
    "09:30",
    45,
    "Main stage",
    "Keynote: the command palette is the app",
    ["Lena Baptiste"],
    "Every action reachable from ⌘K, and how natural-language quick add falls out of that.",
  ],
  [
    1,
    "10:30",
    45,
    "Lab",
    "ICS in the wild",
    ["Tomasz Wierzbicki"],
    "Feeds from six providers, and what each one gets wrong about folding and DTEND.",
  ],
  [
    1,
    "10:30",
    90,
    "Workshops",
    "Accessible drag and drop",
    ["Aiko Tanaka"],
    "Roving tabindex, live regions and keyboard moves that mirror every pointer gesture.",
  ],
  [1, "12:00", 60, "Foyer", "Lunch", []],
  [
    1,
    "13:00",
    45,
    "Main stage",
    "Optimistic sync that doesn't lie",
    ["Kwame Mensah"],
    "onCommit as a promise: what to show while the server thinks, and how to take it back.",
  ],
  [1, "14:00", 45, "Main stage", "Closing keynote", ["Maya Lindqvist"]],
  [1, "15:00", 60, "Foyer", "Farewell drinks", []],
];

const email = (name: string) => `${name.toLowerCase().replace(/\s+/g, ".")}@kineticonf.dev`;

/** The programme runs Wednesday and Thursday of the current week. */
export function conferenceDays(now = new Date()): Date[] {
  const w = resolveView("week", 1, now);
  return w.days.slice(2, 2 + CONFERENCE.days);
}

/** Every session is `readOnly`: a public programme is read, not edited. */
export function programme(now = new Date()): CalEvent[] {
  const w = resolveView("week", 1, now);
  return SESSIONS.map(([day, at, minutes, track, title, speakers, blurb], i) => {
    const [h, m] = at.split(":").map(Number);
    const startMin = h * 60 + m;
    return {
      id: `session-${i}`,
      title,
      description: blurb,
      location: track,
      start: instantAt(w, 2 + day, startMin),
      end: instantAt(w, 2 + day, startMin + minutes),
      color: TRACKS[track],
      readOnly: true,
      busy: track !== "Foyer",
      attendees: speakers.map((name) => ({ name, email: email(name) })),
    };
  });
}
