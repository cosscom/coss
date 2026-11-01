import type { EventDraft } from "./draft.ts";
import type { CalEvent, KloqSettings } from "./shared.ts";
import { formatInstant, toDateOnlyString } from "./shared.ts";

/** Turn a sheet draft into a stored event. All-day `end` is exclusive, matching kloq. */
export function draftToEvent(draft: EventDraft, settings: KloqSettings): CalEvent {
  const title = draft.title.trim() || "Untitled";
  const id = draft.id ?? settings.makeId();
  let end = draft.end;
  if (end.getTime() <= draft.start.getTime()) {
    end = new Date(draft.start.getTime() + settings.minEventMinutes * 60_000);
  }
  if (draft.allDay) {
    const exclusive = new Date(end);
    exclusive.setDate(exclusive.getDate() + 1);
    return {
      id,
      title,
      allDay: true,
      start: toDateOnlyString(draft.start),
      end: toDateOnlyString(exclusive),
      calendarId: draft.calendarId,
      rrule: draft.rrule,
      reminders: draft.reminders,
    };
  }
  return {
    id,
    title,
    start: formatInstant(draft.start, settings.displayZone),
    end: formatInstant(end, settings.displayZone),
    calendarId: draft.calendarId,
    rrule: draft.rrule,
    reminders: draft.reminders,
  };
}
