import { describe, expect, test } from "bun:test";
import { RDAP_BOOTSTRAP_URL, rdapClient } from "../src/rdap.ts";

const BOOTSTRAP = {
  services: [
    [
      ["com", "net"],
      ["http://rdap.example/com/", "https://rdap.example/com/"],
    ],
    [["uk"], ["https://rdap.example/uk"]],
  ],
};

function registry(records: Record<string, unknown | number>) {
  const calls: string[] = [];
  const fetcher = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url === RDAP_BOOTSTRAP_URL) return Response.json(BOOTSTRAP);
    const record = records[url];
    if (record === undefined) return new Response("", { status: 404 });
    if (typeof record === "number") return new Response("", { status: record });
    return Response.json(record);
  }) as typeof fetch;
  return { fetcher, calls };
}

describe("rdapClient", () => {
  test("finds the registration date through the bootstrap file (https preferred)", async () => {
    const { fetcher, calls } = registry({
      "https://rdap.example/com/domain/acme.com": {
        events: [
          { eventAction: "last changed", eventDate: "2026-01-01T00:00:00Z" },
          { eventAction: "registration", eventDate: "2026-10-01T00:00:00Z" },
        ],
      },
    });
    const client = rdapClient({ fetch: fetcher });
    expect(await client.registration("ACME.com.")).toEqual({
      status: "found",
      registeredAt: new Date("2026-10-01T00:00:00Z"),
    });
    await client.registration("acme.com");
    // The bootstrap file is fetched once.
    expect(calls.filter((url) => url === RDAP_BOOTSTRAP_URL)).toHaveLength(1);
  });

  test("walks up to the registered parent; unknown domains and TLDs", async () => {
    const { fetcher, calls } = registry({
      "https://rdap.example/uk/domain/acme.co.uk": { events: [] },
    });
    const client = rdapClient({ fetch: fetcher });
    expect(await client.registration("mail.acme.co.uk")).toEqual({
      status: "found",
      registeredAt: null,
    });
    expect(calls.slice(1)).toEqual([
      "https://rdap.example/uk/domain/mail.acme.co.uk",
      "https://rdap.example/uk/domain/acme.co.uk",
    ]);
    expect(await client.registration("nobody.com")).toEqual({
      status: "not_found",
      registeredAt: null,
    });
    expect(await client.registration("acme.test")).toEqual({
      status: "unavailable",
      registeredAt: null,
    });
  });

  test("registry errors throw", async () => {
    const { fetcher } = registry({ "https://rdap.example/com/domain/acme.com": 503 });
    await expect(rdapClient({ fetch: fetcher }).registration("acme.com")).rejects.toThrow("503");
  });
});
