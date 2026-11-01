import {
  type Agenda,
  attendeeStatus,
  type CalEvent,
  type CalendarSource,
  createConstraints,
  type EffectiveView,
  effectiveView,
  eventTitle,
  filterVisibleEvents,
  findAttendee,
  formatViewTitle,
  groupAgenda,
  isTimeGridView,
  type KloqConstraints,
  type KloqSettings,
  type KloqView,
  layoutDay,
  layoutMonth,
  type MonthLayout,
  type PlacedOccurrence,
  type Projection,
  projectEvents,
  type ResponsiveSetting,
  rangeOfView,
  resolveResponsive,
  resolveView,
  slotAllowed,
  startOfWeek,
  toDateOnlyString,
  todayAnchor,
  type ViewDescriptor,
} from "./shared.ts";
import type { WorkingHours } from "./working-hours.ts";

export interface SurfaceInput {
  events: readonly CalEvent[];
  sources?: readonly CalendarSource[];
  view: KloqView;
  date: Date;
  weekStartsOn: number;
  width: number;
  responsive: ResponsiveSetting;
  settings: KloqSettings;
  showDeclinedEvents?: boolean;
  currentUserEmail?: string;
  locale?: string;
}

export interface Surface {
  responded: EffectiveView;
  view: ViewDescriptor;
  title: string;
  projection: Projection;
  month: MonthLayout | null;
  agenda: Agenda | null;
  atToday: boolean;
  range: { start: Date; end: Date };
}

export function withoutDeclined(
  events: readonly CalEvent[],
  email: string | undefined,
  showDeclinedEvents: boolean | undefined,
): readonly CalEvent[] {
  if (showDeclinedEvents !== false || !email) return events;
  return events.filter((event) => {
    const me = findAttendee(event.attendees, email);
    return me === undefined || attendeeStatus(me) !== "declined";
  });
}

export function visibleEvents(input: SurfaceInput): readonly CalEvent[] {
  const listed = filterVisibleEvents(input.events, input.sources ?? []);
  return withoutDeclined(listed, input.currentUserEmail, input.showDeclinedEvents);
}

export function buildSurface(input: SurfaceInput): Surface {
  const responded = effectiveView(input.width, input.view, resolveResponsive(input.responsive));
  const view = resolveView(responded.effective, input.weekStartsOn, input.date, {
    locale: input.locale,
    timeZone: input.settings.timeZone,
  });
  const projection = projectEvents(visibleEvents(input), view, {
    dayStartMin: input.settings.dayStartMin,
    dayEndMin: input.settings.dayEndMin,
    timeZone: input.settings.displayZone,
  });
  const month =
    view.kind === "month"
      ? layoutMonth(projection.all, { dayCount: view.dayCount, slots: 3 })
      : null;
  const agenda = view.kind === "agenda" ? groupAgenda(projection.all, view) : null;
  const range = rangeOfView(view);
  const today = todayAnchor(responded.effective);
  const atToday = today >= range.start && today < range.end;
  return {
    responded,
    view,
    title: formatViewTitle(view, input.locale),
    projection,
    month,
    agenda,
    atToday,
    range,
  };
}

export interface TimedBlock {
  event: PlacedOccurrence;
  top: number;
  height: number;
  column: number;
  columns: number;
}

/** Overlap columns plus y, from kloq's `layoutDay` and the resolved settings axis. */
export function layoutTimed(
  events: readonly PlacedOccurrence[],
  settings: KloqSettings,
): TimedBlock[] {
  const laid = layoutDay(
    events.map((event) => ({
      id: event.id,
      startMin: event.startMin,
      endMin: Math.max(event.endMin, event.startMin + settings.minEventMinutes),
    })),
  );
  return events.map((event) => {
    const box = laid.get(event.id) ?? { col: 0, cols: 1 };
    const top = settings.minutesToPx(event.startMin);
    const height = Math.max(
      settings.durationToPx(Math.max(settings.minEventMinutes, event.endMin - event.startMin)),
      20,
    );
    return { event, top, height, column: box.col, columns: box.cols };
  });
}

export interface HourTick {
  minutes: number;
  label: string;
  top: number;
}

export function hourTicks(settings: KloqSettings): HourTick[] {
  const ticks: HourTick[] = [];
  for (let hour = settings.dayStartHour; hour < settings.dayEndHour; hour++) {
    const minutes = hour * 60;
    ticks.push({
      minutes,
      label: settings.formatMinutes(minutes),
      top: settings.minutesToPx(minutes),
    });
  }
  return ticks;
}

/** Snap a y offset to the settings grid and return the slot, or null when refused. */
export function slotFromPress(
  settings: KloqSettings,
  day: Date,
  y: number,
  constraints?: KloqConstraints,
): { start: Date; end: Date; allDay: false } | null {
  const raw = settings.pxToMinutes(y);
  const snapped = Math.round(raw / settings.snapMinutes) * settings.snapMinutes;
  const minutes = settings.clampMinutes(snapped);
  const start = new Date(day);
  start.setHours(0, minutes, 0, 0);
  const end = new Date(start.getTime() + settings.minEventMinutes * 60_000);
  const slot = { start, end, allDay: false as const };
  if (constraints && !slotAllowed(createConstraints(constraints), slot)) return null;
  return slot;
}

export function eventsOnDay(
  events: readonly PlacedOccurrence[],
  dayIndex: number,
): PlacedOccurrence[] {
  return events.filter((event) => dayIndex >= event.dayIndex && dayIndex <= event.endDayIndex);
}

export function dayKey(date: Date): string {
  return toDateOnlyString(date);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function weekStartsLabel(weekStartsOn: number, anchor: Date): Date {
  return startOfWeek(anchor, weekStartsOn);
}

export function showsTimeGrid(view: KloqView): boolean {
  return isTimeGridView(view);
}

export function eventLabel(event: { title?: string | null }): string {
  return eventTitle(event);
}

export function workingBand(
  settings: KloqSettings,
  workingHours: WorkingHours | false | undefined,
): { top: number; height: number } | null {
  if (workingHours === false) return null;
  const hours = workingHours ?? { start: 9, end: 17 };
  const start = Math.max(settings.dayStartMin, hours.start * 60);
  const end = Math.min(settings.dayEndMin, hours.end * 60);
  if (end <= start) return null;
  return {
    top: settings.minutesToPx(start),
    height: settings.durationToPx(end - start),
  };
}

export function padRange(
  range: { start: Date; end: Date },
  padding: number | { before: number; after: number } | undefined,
): { start: Date; end: Date } {
  if (!padding) return range;
  const before = typeof padding === "number" ? padding : padding.before;
  const after = typeof padding === "number" ? padding : padding.after;
  const day = 86_400_000;
  return {
    start: new Date(range.start.getTime() - before * day),
    end: new Date(range.end.getTime() + after * day),
  };
}
