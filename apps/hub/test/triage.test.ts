import { describe, expect, test } from "bun:test";
import { CONTEXT_QUESTIONS, fakeTriager } from "../src/lib/triage.ts";

const project = { name: "cal.com", description: "Scheduling infrastructure." };

describe("fakeTriager", () => {
  test("'page broken' is not enough and asks for everything", async () => {
    const triage = await fakeTriager().triage({
      project,
      title: "page broken",
      body: "page broken",
      followUps: [],
    });
    expect(triage.ready).toBe(false);
    expect(triage.questions).toEqual([CONTEXT_QUESTIONS.what, CONTEXT_QUESTIONS.outcome]);
    expect(triage.kind).toBe("fix");
  });

  test("where, what and expected make it ready", async () => {
    const triage = await fakeTriager().triage({
      project,
      title: "Filter bookings by date",
      body: "On /bookings I can only scroll. Let me filter the list by date with presets. Expected: a date filter above the list that stays selected.",
      followUps: [],
    });
    expect(triage.ready).toBe(true);
    expect(triage.questions).toEqual([]);
    expect(triage.kind).toBe("feature");
  });

  test("follow-ups in the thread count", async () => {
    const triage = await fakeTriager().triage({
      project,
      title: "page broken",
      body: "page broken",
      followUps: [
        "The /bookings page shows a blank page after I switch to next month. It should show that month's bookings. Expected: every month renders.",
      ],
    });
    expect(triage.ready).toBe(true);
  });

  test("recognizes translations", async () => {
    const triage = await fakeTriager().triage({
      project,
      title: "Danish translation for the booking page",
      body: "The booking page and the confirmation email are not available in Danish; add a Danish locale matching the Swedish one. Expected: Danish users see Danish.",
      followUps: [],
    });
    expect(triage.ready).toBe(true);
    expect(triage.kind).toBe("translation");
  });
});
