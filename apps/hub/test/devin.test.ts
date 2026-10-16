import { describe, expect, test } from "bun:test";
import {
  DevinApiError,
  devinFactory,
  devinStatus,
  devinUpdates,
  type FetchLike,
} from "../src/lib/factory/devin.ts";

function fakeDevin() {
  const calls: { method: string; path: string; body: unknown; auth: string | null }[] = [];
  const fetchImpl: FetchLike = async (input, init) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    calls.push({
      method: init?.method ?? "GET",
      path: url.pathname,
      body: init?.body ? JSON.parse(String(init.body)) : null,
      auth: headers.get("authorization"),
    });
    if (url.pathname === "/v1/sessions") {
      return Response.json({ session_id: "devin-abc", url: "https://app.devin.ai/sessions/abc" });
    }
    if (url.pathname === "/v1/sessions/devin-abc") {
      return Response.json({
        session_id: "devin-abc",
        status_enum: "finished",
        pull_request: { url: "https://github.com/calcom/cal.com/pull/1" },
        structured_output: { preview_url: "https://preview.example" },
        messages: [
          {
            event_id: "e1",
            type: "user_message",
            message: "the brief",
            timestamp: "2026-10-16T10:00:00Z",
          },
          {
            event_id: "e2",
            type: "devin_message",
            message: "Working on it.",
            timestamp: "2026-10-16T10:01:00Z",
          },
          {
            event_id: "e3",
            type: "devin_message",
            message: "Done.",
            timestamp: "2026-10-16T10:30:00Z",
          },
        ],
      });
    }
    if (url.pathname === "/v1/sessions/devin-abc/message") return Response.json(null);
    return new Response("nope", { status: 404 });
  };
  return { calls, fetchImpl };
}

describe("devinFactory", () => {
  test("starts a session with the brief and a bearer key", async () => {
    const { calls, fetchImpl } = fakeDevin();
    const factory = devinFactory({
      apiKey: "k",
      baseUrl: "https://api.devin.ai/v1",
      fetch: fetchImpl,
    });
    const session = await factory.start({
      prompt: "Build it",
      title: "#1 Build it",
      tags: ["calcom/cal.com", "1"],
    });
    expect(session).toEqual({
      sessionId: "devin-abc",
      sessionUrl: "https://app.devin.ai/sessions/abc",
    });
    expect(calls[0]).toMatchObject({
      method: "POST",
      path: "/v1/sessions",
      auth: "Bearer k",
      body: { prompt: "Build it", title: "#1 Build it", tags: ["calcom/cal.com", "1"] },
    });
  });

  test("polls: Devin's messages become updates, the PR the production link", async () => {
    const { fetchImpl } = fakeDevin();
    const factory = devinFactory({ apiKey: "k", fetch: fetchImpl });
    const state = await factory.poll("devin-abc");
    expect(state.status).toBe("finished");
    expect(state.updates.map((u) => u.text)).toEqual([
      "Working on it.",
      "Done.",
      "The change is ready for production.",
    ]);
    expect(state.updates[0]?.id).toBe("devin-abc:e2");
    expect(state.previewUrl).toBe("https://preview.example");
    expect(state.productionUrl).toBe("https://github.com/calcom/cal.com/pull/1");
  });

  test("messages a session", async () => {
    const { calls, fetchImpl } = fakeDevin();
    await devinFactory({ apiKey: "k", fetch: fetchImpl }).message("devin-abc", "use the presets");
    expect(calls[0]).toMatchObject({
      method: "POST",
      path: "/v1/sessions/devin-abc/message",
      body: { message: "use the presets" },
    });
  });

  test("API failures throw DevinApiError with the status", async () => {
    const factory = devinFactory({
      apiKey: "k",
      fetch: async () => new Response("no", { status: 401 }),
    });
    await expect(factory.poll("x")).rejects.toBeInstanceOf(DevinApiError);
  });

  test("status and update mapping", () => {
    expect(devinStatus({ status_enum: "working" })).toBe("running");
    expect(devinStatus({ status_enum: "blocked" })).toBe("blocked");
    expect(devinStatus({ status_enum: "suspend_requested" })).toBe("blocked");
    expect(devinStatus({ status_enum: "expired" })).toBe("failed");
    expect(devinStatus({ status_enum: "finished" })).toBe("finished");
    expect(
      devinUpdates({ session_id: "s", messages: [{ origin: "devin", message: " hi " }] })[0]?.text,
    ).toBe("hi");
  });
});
