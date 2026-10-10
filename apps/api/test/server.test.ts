import { expect, test } from "bun:test";
import { startServer } from "../src/server.ts";

test("shutdown finishes in-flight requests, refuses new connections, then drains", async () => {
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const requestStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  const events: string[] = [];
  const server = startServer({
    port: 0,
    hostname: "127.0.0.1",
    fetch: async (request) => {
      if (new URL(request.url).pathname === "/slow") {
        started();
        await released;
        events.push("slow request finished");
      }
      return new Response("ok");
    },
    onDrained: async () => {
      events.push("drained");
    },
  });

  expect(await (await fetch(new URL("/fast", server.url))).text()).toBe("ok");

  const inFlight = fetch(new URL("/slow", server.url));
  await requestStarted;
  const shutdown = server.shutdown();
  expect(server.shutdown()).toBe(shutdown);

  // No new connections once shutting down.
  await expect(fetch(new URL("/fast", server.url))).rejects.toThrow();

  release();
  const response = await inFlight;
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("ok");
  await shutdown;
  expect(events).toEqual(["slow request finished", "drained"]);
});
