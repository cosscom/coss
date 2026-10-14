"use client";

/**
 * Mock calendar accounts for the demo.
 *
 * The whole point: **no OAuth, ever, anywhere in the package.** `kloq`
 * ships the `registerCalendarSource` seam and nothing else; a host that has
 * really connected Google or Outlook registers what it found, and this file
 * registers fakes that are shaped exactly the same. If the sidebar, the
 * colour inheritance and the visibility toggles work against these, they work
 * against a real integration — the component can't tell the difference.
 *
 * Mirrors the Notion Calendar teardown's sidebar: a personal default, a work
 * calendar, a shared team one, a holidays feed and a read-only "Who is out".
 */

import {
  buildSeedEvents,
  type CalEvent,
  type CalendarAccount,
  type CalendarSource,
  dateOnlyAt,
  instantAt,
  registerCalendarAccount,
  resolveView,
} from "kloq";

/**
 * Two accounts, each with the things an account actually owns: a provider, a
 * default conferencing tool, and the calendar its new events land on. The
 * teardown's sidebar groups by exactly this — you don't connect a calendar,
 * you connect an account that happens to have several.
 */
export const PERSONAL_ACCOUNT: CalendarAccount = {
  id: "personal",
  label: "sean@cal.com",
  provider: "google",
  providerLabel: "Google Calendar",
  defaultConferencing: "google-meet",
  defaultCalendarId: "personal-default",
  isDefault: true,
};

export const WORK_ACCOUNT: CalendarAccount = {
  id: "work",
  label: "Cal.com",
  provider: "outlook",
  providerLabel: "Microsoft 365",
  defaultConferencing: "teams",
  defaultCalendarId: "work-main",
};

/**
 * `visible` is left absent where a calendar starts on — absent means visible,
 * so the registration reads as "these five exist" rather than as a settings
 * dump. "Who is out" starts hidden precisely so the toggle has somewhere to
 * go on first load.
 */
export const PERSONAL_CALENDARS: CalendarSource[] = [
  {
    id: "personal-default",
    name: "Personal",
    color: "blue",
    accountId: PERSONAL_ACCOUNT.id,
    isDefault: true,
  },
  {
    id: "personal-holidays",
    name: "Holidays in United Kingdom",
    color: "emerald",
    accountId: PERSONAL_ACCOUNT.id,
    readOnly: true,
  },
];

export const WORK_CALENDARS: CalendarSource[] = [
  { id: "work-main", name: "Work", color: "violet", accountId: WORK_ACCOUNT.id },
  { id: "work-team", name: "Team", color: "amber", accountId: WORK_ACCOUNT.id },
  {
    id: "work-ooo",
    name: "Who is out",
    color: "rose",
    accountId: WORK_ACCOUNT.id,
    readOnly: true,
    visible: false,
  },
];

export const MOCK_CALENDARS = [...PERSONAL_CALENDARS, ...WORK_CALENDARS];

/**
 * Register both accounts. Returns a single unregister, so this is a one-liner
 * from an effect — the same shape as `registerNetworkSim` and
 * `registerCommands`.
 */
export function registerMockAccounts(): () => void {
  const offPersonal = registerCalendarAccount(PERSONAL_ACCOUNT, ...PERSONAL_CALENDARS);
  const offWork = registerCalendarAccount(WORK_ACCOUNT, ...WORK_CALENDARS);
  return () => {
    offWork();
    offPersonal();
  };
}

/** Which calendar each stock seed belongs to. */
const SEED_CALENDARS: Record<string, string> = {
  "seed-standup": "work-main",
  "seed-design": "work-main",
  "seed-oneone": "work-main",
  "seed-interview": "work-team",
  "seed-deep": "personal-default",
  "seed-lunch": "personal-default",
  "seed-ooo": "personal-default",
};

/**
 * The sample week, assigned to calendars — plus two events that only exist to
 * show what a *feed* looks like: a bank holiday on the read-only holidays
 * calendar and a teammate's absence on "Who is out", which starts hidden.
 *
 * Seeds get a `calendarId` and LOSE their own colour, which is the whole
 * inheritance rule made visible: an event with no colour of its own is drawn
 * in its calendar's (`resolveEventColor`, resolved by `calendar-app` before
 * projection), so moving one between calendars in the sidebar retints it. An
 * event that kept a hand-picked colour would keep it across that move — which
 * is correct, and would demonstrate nothing here.
 */
export function mockSeedEvents(now: Date = new Date()): CalEvent[] {
  const week = resolveView("week", 1, now);

  const assigned = buildSeedEvents(now).map((event) => {
    const calendarId = SEED_CALENDARS[event.id];
    if (!calendarId) return event;
    return { ...event, calendarId, color: undefined } as CalEvent;
  });

  const feeds: CalEvent[] = [
    {
      id: "mock-holiday",
      title: "Bank holiday",
      allDay: true,
      // exclusive end: a one-day banner ends the following morning
      start: dateOnlyAt(week, 0),
      end: dateOnlyAt(week, 1),
      calendarId: "personal-holidays",
      busy: false,
      readOnly: true,
    },
    {
      id: "mock-who-is-out",
      title: "Dana — annual leave",
      allDay: true,
      start: dateOnlyAt(week, 2),
      end: dateOnlyAt(week, 5),
      calendarId: "work-ooo",
      busy: false,
      readOnly: true,
    },
    {
      id: "mock-team-sync",
      title: "Team sync",
      start: instantAt(week, 3, 16 * 60),
      end: instantAt(week, 3, 16 * 60 + 30),
      calendarId: "work-team",
    },
  ];

  return [...assigned, ...feeds];
}
