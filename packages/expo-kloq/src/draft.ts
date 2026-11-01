import type { Reminder } from "./shared.ts";

export interface EventDraft {
  id?: string;
  placementId?: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  calendarId?: string;
  rrule?: string;
  reminders: Reminder[];
}
