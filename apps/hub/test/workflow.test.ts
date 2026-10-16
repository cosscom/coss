import { beforeEach, describe, expect, test } from "bun:test";
import { fakeFactory } from "../src/lib/factory/fake.ts";
import { getProject, getPromptRequest, resetStore } from "../src/lib/store.ts";
import { fakeTriager } from "../src/lib/triage.ts";
import { comment, decide, HubError, openPromptRequest, syncBuild } from "../src/lib/workflow.ts";

function clock(start = new Date("2026-10-16T12:00:00Z")) {
  let now = start;
  return { now: () => now, advance: (ms: number) => (now = new Date(now.getTime() + ms)) };
}

describe("workflow", () => {
  beforeEach(() => resetStore());

  test("a thin request is asked for context, an answer hands it to the maintainers", async () => {
    const time = clock();
    const deps = { factory: fakeFactory({ now: time.now }), triager: fakeTriager(), now: time.now };
    const pr = await openPromptRequest(
      {
        owner: "calcom",
        project: "cal.com",
        author: "maya",
        title: "page broken",
        body: "page broken",
      },
      deps,
    );
    expect(pr.status).toBe("needs_context");
    expect(pr.comments.map((c) => c.kind)).toEqual(["triage"]);
    expect(pr.comments[0]?.questions?.length).toBeGreaterThan(0);

    // Somebody else answering doesn't count.
    await comment(
      pr,
      {
        author: "jonas",
        body: "The /bookings page shows a blank page after I switch to next month. Expected: it renders.",
      },
      deps,
    );
    expect(pr.status).toBe("needs_context");

    await comment(
      pr,
      {
        author: "maya",
        body: "The /bookings page shows a blank page after I switch to next month. It should show that month. Expected: every month renders.",
      },
      deps,
    );
    expect(pr.status).toBe("awaiting_review");
    expect(pr.comments.at(-1)).toMatchObject({
      kind: "system",
      body: "Fix · ready for a maintainer's review",
    });
  });

  test("approval sends it to the factory; polling brings the build into the thread and production", async () => {
    const time = clock();
    const deps = { factory: fakeFactory({ now: time.now }), triager: fakeTriager(), now: time.now };
    const pr = await openPromptRequest(
      {
        owner: "calcom",
        project: "cal.com",
        author: "maya",
        title: "Filter bookings by date",
        body: "On /bookings I can only scroll. Let me filter the list by date with presets. Expected: a date filter above the list that stays selected.",
      },
      deps,
    );
    expect(pr.status).toBe("awaiting_review");

    await expect(
      decide(pr, { by: "maya", decision: "approved", comment: "yes" }, deps),
    ).rejects.toBeInstanceOf(HubError);
    await expect(
      decide(pr, { by: "peerrich", decision: "approved", comment: " " }, deps),
    ).rejects.toBeInstanceOf(HubError);

    await decide(
      pr,
      { by: "peerrich", decision: "approved", comment: "Keep the range picker." },
      deps,
    );
    expect(pr.status).toBe("building");
    expect(pr.build?.provider).toBe("fake");
    expect(pr.comments.map((c) => c.kind)).toEqual(["system", "decision", "system"]);

    time.advance(5_000);
    expect(await syncBuild(pr, deps)).toBe(true);
    expect(pr.comments.filter((c) => c.kind === "factory")).toHaveLength(1);
    expect(await syncBuild(pr, deps)).toBe(false);

    // A maintainer's reply under the factory's update is forwarded.
    const update = pr.comments.find((c) => c.kind === "factory");
    await comment(pr, { author: "peerrich", body: "Use the presets.", parentId: update?.id }, deps);
    expect(pr.comments.at(-1)).toMatchObject({ kind: "system", body: "Forwarded to Devin" });

    time.advance(40_000);
    await syncBuild(pr, deps);
    expect(pr.status).toBe("in_production");
    expect(pr.build?.previewUrl).toBe(`https://preview-${pr.number}.cal.com`);
    expect(pr.comments.filter((c) => c.kind === "factory")).toHaveLength(4);
    expect(pr.comments.at(-1)).toMatchObject({ kind: "system", body: "In production" });
    expect(getPromptRequest("calcom", "cal.com", pr.number)).toBe(pr);
  });

  test("auto-allowed kinds skip the maintainers", async () => {
    const time = clock();
    const deps = { factory: fakeFactory({ now: time.now }), triager: fakeTriager(), now: time.now };
    expect(getProject("calcom", "cal.com")?.autoAllow).toContain("translation");
    const pr = await openPromptRequest(
      {
        owner: "calcom",
        project: "cal.com",
        author: "maya",
        title: "Danish translation for the booking page",
        body: "The booking page is not available in Danish; add a Danish locale for it matching the Swedish one. Expected: Danish users see Danish.",
      },
      deps,
    );
    expect(pr.status).toBe("building");
    expect(pr.decision?.by).toBe("hub");
    expect(pr.comments[0]?.body).toContain("auto-allowed");
  });

  test("declining ends it", async () => {
    const deps = { factory: fakeFactory(), triager: fakeTriager() };
    const pr = getPromptRequest("calcom", "cal.com", 1033);
    if (!pr) throw new Error("seed");
    await decide(pr, { by: "zomars", decision: "declined", comment: "Not now." }, deps);
    expect(pr.status).toBe("declined");
    expect(pr.build).toBeNull();
  });
});
