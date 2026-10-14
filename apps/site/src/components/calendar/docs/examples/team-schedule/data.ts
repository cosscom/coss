import {
  type Attendee,
  type CalEvent,
  type CalendarAccount,
  type CalendarSource,
  dateOnlyAt,
  instantAt,
  registerCalendarAccount,
  resolveView,
} from "kloq";

export const ME = "sam@lumen.dev";

export const ACCOUNTS: CalendarAccount[] = [
  {
    id: "personal",
    label: ME,
    provider: "google",
    providerLabel: "Google Calendar",
    isDefault: true,
  },
  { id: "work", label: "Lumen Labs", provider: "outlook", providerLabel: "Microsoft 365" },
];

/** `visible` is absent where a calendar starts on; "Who is out" starts hidden so the toggle has somewhere to go. */
export const CALENDARS: CalendarSource[] = [
  { id: "personal", name: "Personal", color: "blue", accountId: "personal", isDefault: true },
  { id: "family", name: "Family", color: "emerald", accountId: "personal" },
  { id: "work", name: "Work", color: "violet", accountId: "work" },
  { id: "platform", name: "Platform team", color: "amber", accountId: "work" },
  {
    id: "ooo",
    name: "Who is out",
    color: "rose",
    accountId: "work",
    readOnly: true,
    visible: false,
  },
];

export function registerTeam(): () => void {
  const off = ACCOUNTS.map((account) =>
    registerCalendarAccount(account, ...CALENDARS.filter((c) => c.accountId === account.id)),
  );
  return () => off.forEach((unregister) => unregister());
}

const sam: Attendee = { email: ME, name: "Sam Rivera" };
const jules: Attendee = { email: "jules@lumen.dev", name: "Jules Okafor" };
const dana: Attendee = { email: "dana@lumen.dev", name: "Dana Ito" };
const mo: Attendee = { email: "mo@lumen.dev", name: "Mo Haddad" };

/** Events carry a `calendarId` and no `color` — each is drawn in its calendar's colour. */
export function teamEvents(now = new Date()): CalEvent[] {
  const w = resolveView("week", 1, now);
  const at = (day: number, hour: number, minutes: number) => ({
    start: instantAt(w, day, hour * 60),
    end: instantAt(w, day, hour * 60 + minutes),
  });
  return [
    {
      id: "standup",
      title: "Platform standup",
      calendarId: "platform",
      rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
      ...at(0, 9.5, 15),
      organizer: jules.email,
      attendees: [
        { ...sam, status: "accepted" },
        { ...jules, status: "accepted" },
        { ...mo, status: "accepted" },
      ],
    },
    {
      id: "one-on-one",
      title: "1:1 with Dana",
      calendarId: "work",
      ...at(1, 10, 30),
      attendees: [
        { ...sam, status: "accepted" },
        { ...dana, status: "accepted" },
      ],
    },
    {
      id: "roadmap",
      title: "Q4 roadmap review",
      calendarId: "work",
      ...at(1, 14, 60),
      location: "Room 2 — Kreuzberg",
      organizer: jules.email,
      description: "Cut list for the November release. Bring the latency numbers.",
      attendees: [
        { ...sam, status: "pending" },
        { ...jules, status: "accepted" },
        { ...mo, status: "tentative" },
      ],
    },
    { id: "focus", title: "Focus block", calendarId: "personal", ...at(2, 9, 120) },
    {
      id: "design-crit",
      title: "Design crit",
      calendarId: "platform",
      ...at(3, 11, 60),
      meetingUrl: "https://meet.google.com/kwe-crit-lab",
      attendees: [
        { ...sam, status: "tentative" },
        { ...jules, status: "accepted" },
      ],
    },
    {
      id: "dentist",
      title: "Dentist",
      calendarId: "personal",
      ...at(3, 8, 45),
      location: "Bergmannstraße 12",
    },
    { id: "football", title: "Nina — football practice", calendarId: "family", ...at(3, 17, 90) },
    {
      id: "go-no-go",
      title: "Release 2.4 go/no-go",
      calendarId: "platform",
      ...at(4, 15, 45),
      organizer: mo.email,
      attendees: [
        { ...sam, status: "pending" },
        { ...mo, status: "accepted" },
        { ...dana, status: "declined" },
      ],
    },
    {
      id: "lunch-jules",
      title: "Lunch with Jules",
      calendarId: "personal",
      ...at(4, 12.5, 60),
      busy: false,
    },
    {
      id: "nina-birthday",
      title: "Nina's birthday",
      calendarId: "family",
      allDay: true,
      start: dateOnlyAt(w, 5),
      end: dateOnlyAt(w, 6),
      busy: false,
    },
    {
      id: "dana-leave",
      title: "Dana — annual leave",
      calendarId: "ooo",
      allDay: true,
      start: dateOnlyAt(w, 2),
      end: dateOnlyAt(w, 5),
      busy: false,
      readOnly: true,
    },
    {
      id: "mo-conference",
      title: "Mo — at KinetiConf",
      calendarId: "ooo",
      allDay: true,
      start: dateOnlyAt(w, 0),
      end: dateOnlyAt(w, 2),
      busy: false,
      readOnly: true,
    },
  ];
}
