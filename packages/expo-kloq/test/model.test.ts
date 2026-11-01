import { describe, expect, test } from "bun:test";
import type { EventDraft } from "../src/draft.ts";
import { draftToEvent } from "../src/draft-event.ts";
import { localeUsesHour12, multiZoneGutterWidth, zoneTimeAt } from "../src/gutter.ts";
import { buildSurface, layoutTimed, slotFromPress, withoutDeclined } from "../src/model.ts";
import { NATIVE_MAP } from "../src/native-map.ts";
import { type CalEvent, createSettings, parseQuickAdd } from "../src/shared.ts";
import { changeForAdd, changeForUpdate, reduceEvents } from "../src/store.ts";

const settings = createSettings({
  displayTimeZone: "UTC",
  hour12: false,
  dayStartHour: 0,
  dayEndHour: 24,
  snapMinutes: 15,
  minEventMinutes: 30,
});

const monday = new Date(2026, 7, 3, 12);

function event(partial: Partial<CalEvent> & Pick<CalEvent, "id" | "start" | "end">): CalEvent {
  return { title: partial.title ?? "Item", ...partial };
}

describe("expo-kloq model", () => {
  test("lays a week out and places a timed event in a column", () => {
    const events = [
      event({
        id: "a",
        title: "Standup",
        start: "2026-08-03T09:00:00Z",
        end: "2026-08-03T09:30:00Z",
      }),
    ];
    const surface = buildSurface({
      events,
      view: "week",
      date: monday,
      weekStartsOn: 1,
      width: 1200,
      responsive: false,
      settings,
    });
    expect(surface.view.kind).toBe("week");
    expect(surface.view.dayCount).toBe(7);
    expect(surface.projection.timed.length).toBeGreaterThan(0);
    const blocks = layoutTimed(surface.projection.timed, settings);
    expect(blocks[0]?.column).toBe(0);
    expect(blocks[0]?.height).toBeGreaterThan(0);
  });

  test("a narrow width collapses week to day", () => {
    const surface = buildSurface({
      events: [],
      view: "week",
      date: monday,
      weekStartsOn: 1,
      width: 400,
      responsive: true,
      settings,
    });
    expect(surface.responded.collapsed).toBe(true);
    expect(surface.view.kind).toBe("day");
  });

  test("refuses a slot outside the constraints", () => {
    const day = new Date(2026, 7, 3);
    const allowed = slotFromPress(settings, day, settings.minutesToPx(10 * 60), {
      minDate: new Date(2026, 7, 4),
    });
    expect(allowed).toBeNull();
  });

  test("hides declined events for the current user", () => {
    const events = [
      event({
        id: "a",
        title: "No",
        start: "2026-08-03T09:00:00Z",
        end: "2026-08-03T10:00:00Z",
        attendees: [{ email: "me@example.com", status: "declined" }],
      }),
    ];
    expect(withoutDeclined(events, "me@example.com", false)).toHaveLength(0);
    expect(withoutDeclined(events, "me@example.com", true)).toHaveLength(1);
  });

  test("all-day drafts store an exclusive end", () => {
    const draft: EventDraft = {
      title: "Offsite",
      start: new Date(2026, 7, 3),
      end: new Date(2026, 7, 3),
      allDay: true,
      reminders: [],
    };
    const stored = draftToEvent(draft, settings);
    expect(stored.allDay).toBe(true);
    expect(stored.start).toBe("2026-08-03");
    expect(stored.end).toBe("2026-08-04");
  });

  test("quick add from the shared parser still finds a time", () => {
    const parsed = parseQuickAdd("Lunch tomorrow at 1pm", new Date(2026, 7, 3, 9));
    expect(parsed.confidence).not.toBe("none");
    expect(parsed.title.toLowerCase()).toContain("lunch");
  });

  test("the store applies an add and an update", () => {
    const first = event({
      id: "a",
      title: "A",
      start: "2026-08-03T09:00:00Z",
      end: "2026-08-03T10:00:00Z",
    });
    const added = reduceEvents([], changeForAdd(first));
    const change = changeForUpdate(added, "a", { title: "B" });
    if (!change) throw new Error("expected an update");
    const next = reduceEvents(added, change);
    expect(next[0]?.title).toBe("B");
  });

  test("zone clocks and gutter width match kloq's arithmetic", () => {
    const time = zoneTimeAt(new Date("2026-08-03T12:00:00Z"), "Asia/Tokyo");
    expect(time.hour).toBe(21);
    expect(
      multiZoneGutterWidth([{ timeZone: "Asia/Tokyo" }], new Date("2026-08-03T12:00:00Z"), "UTC"),
    ).toBe(64 + 46);
    expect(localeUsesHour12("en-US")).toBe(true);
  });

  test("every public surface is listed in the native map", () => {
    const names = NATIVE_MAP.map((row) => row.kloq).join(" ");
    for (const piece of [
      "Kloq",
      "YearView",
      "TimelineGrid",
      "CalendarField",
      "RRuleBuilder",
      "ReminderField",
    ]) {
      expect(names).toContain(piece);
    }
    expect(NATIVE_MAP.some((row) => row.fallback)).toBe(true);
  });
});
