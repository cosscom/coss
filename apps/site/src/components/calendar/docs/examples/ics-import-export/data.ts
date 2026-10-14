import { resolveView } from "kloq";

const pad = (n: number) => String(n).padStart(2, "0");
const date = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const dateTime = (d: Date, hour: number, minute = 0) => `${date(d)}T${pad(hour)}${pad(minute)}00`;
const plus = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

/**
 * A small team feed anchored on the current week. It deliberately carries three things the
 * importer refuses (a VALARM, a cancelled event, a vendor X- property) and one it approximates (TZID).
 */
export function sampleFeed(now: Date = new Date()): string {
  const [mon, tue, , thu, fri] = resolveView("week", 1, now).days;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Acme//Team calendar//EN",
    "X-WR-CALNAME:Acme · offsites & holidays",

    "BEGIN:VEVENT",
    "UID:offsite-q4@acme.example",
    `DTSTART;VALUE=DATE:${date(plus(tue, 7))}`,
    `DTEND;VALUE=DATE:${date(plus(thu, 7))}`,
    "SUMMARY:Q4 planning offsite",
    "LOCATION:The Hoxton\\, Southwark",
    "DESCRIPTION:Two days\\, whole company. Bring the roadmap.",
    "END:VEVENT",

    "BEGIN:VEVENT",
    "UID:demo@acme.example",
    `DTSTART:${dateTime(thu, 15)}`,
    `DTEND:${dateTime(thu, 16)}`,
    "SUMMARY:Product demo",
    "ORGANIZER:mailto:ryan@acme.example",
    "ATTENDEE;CN=Sam Rivera;PARTSTAT=ACCEPTED:mailto:sam@acme.example",
    "ATTENDEE;CN=Jules Okafor;ROLE=OPT-PARTICIPANT;PARTSTAT=TENTATIVE:mailto:jules@acme.example",
    "URL:https://meet.example.com/demo",
    "END:VEVENT",

    "BEGIN:VEVENT",
    "UID:bank-holiday@acme.example",
    `DTSTART;VALUE=DATE:${date(plus(mon, 7))}`,
    `DTEND;VALUE=DATE:${date(plus(mon, 8))}`,
    "SUMMARY:Bank holiday",
    "TRANSP:TRANSPARENT",
    "END:VEVENT",

    "BEGIN:VEVENT",
    "UID:eng-sync@acme.example",
    `DTSTART:${dateTime(tue, 11)}`,
    `DTEND:${dateTime(tue, 11, 30)}`,
    "RRULE:FREQ=WEEKLY;BYDAY=TU",
    "SUMMARY:Engineering sync",
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    "END:VALARM",
    "END:VEVENT",

    "BEGIN:VEVENT",
    "UID:vendor-lunch@acme.example",
    `DTSTART:${dateTime(fri, 12, 30)}`,
    `DTEND:${dateTime(fri, 13, 30)}`,
    "SUMMARY:Vendor lunch",
    "STATUS:CANCELLED",
    "END:VEVENT",

    "BEGIN:VEVENT",
    "UID:dinner@acme.example",
    `DTSTART;TZID=America/New_York:${dateTime(fri, 19)}`,
    `DTEND;TZID=America/New_York:${dateTime(fri, 21)}`,
    "SUMMARY:Founders' dinner",
    "X-APPLE-TRAVEL-ADVISORY-BEHAVIOR:AUTOMATIC",
    "END:VEVENT",

    "END:VCALENDAR",
  ].join("\r\n");
}
