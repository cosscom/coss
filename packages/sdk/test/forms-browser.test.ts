import { describe, expect, test } from "bun:test";
import { submitForm } from "../src/forms.ts";

function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

describe("submitForm", () => {
  test("posts the fields with a device token, asking for JSON, without credentials", async () => {
    const { fetch, calls } = fakeFetch(200, { ok: true, status: "received" });
    const result = await submitForm(
      { email: "ada@example.com", topics: ["a", "b"] },
      { endpoint: "https://forms.coss.test/f/form_1", fetch },
    );
    expect(result).toEqual({ ok: true, status: "received" });
    const { url, init } = calls[0] ?? { url: "", init: {} };
    expect(url).toBe("https://forms.coss.test/f/form_1");
    expect(init.credentials).toBe("omit");
    expect((init.headers as Record<string, string>).Accept).toBe("application/json");
    const body = init.body as FormData;
    expect(body.getAll("topics")).toEqual(["a", "b"]);
    expect(String(body.get("_coss_device"))).toStartWith("cd1.");
  });

  test("field errors, refusals and network failures come back, never thrown", async () => {
    const invalid = fakeFetch(422, {
      ok: false,
      errors: [{ field: "email", code: "required", message: "Email is required." }],
    });
    expect(
      await submitForm({}, { endpoint: "https://f.test/f/x", fetch: invalid.fetch, device: false }),
    ).toEqual({
      ok: false,
      errors: [{ field: "email", code: "required", message: "Email is required." }],
    });
    const refused = fakeFetch(403, { ok: false, error: "Not from this site." });
    expect(await submitForm({}, { endpoint: "https://f.test/f/x", fetch: refused.fetch })).toEqual({
      ok: false,
      error: "Not from this site.",
    });
    const offline = (async () => {
      throw new Error("Failed to fetch");
    }) as unknown as typeof globalThis.fetch;
    expect(await submitForm({}, { endpoint: "https://f.test/f/x", fetch: offline })).toEqual({
      ok: false,
      error: "Failed to fetch",
    });
    expect(await submitForm({})).toMatchObject({ ok: false });
  });

  test("a reused FormData gets a fresh device token each time and keeps none", async () => {
    const { fetch, calls } = fakeFetch(200, { ok: true, status: "received" });
    const data = new FormData();
    data.set("email", "ada@example.com");
    await submitForm(data, { endpoint: "https://f.test/f/x", fetch });
    await submitForm(data, { endpoint: "https://f.test/f/x", fetch });
    expect(data.has("_coss_device")).toBe(false);
    expect(calls.map((call) => (call.init.body as FormData).has("_coss_device"))).toEqual([
      true,
      true,
    ]);
  });

  test("pending confirmation is passed on", async () => {
    const { fetch } = fakeFetch(200, { ok: true, status: "pending_confirmation" });
    expect(
      await submitForm({ email: "a@b.test" }, { endpoint: "https://f.test/f/x", fetch }),
    ).toEqual({ ok: true, status: "pending_confirmation" });
  });
});
