import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { startJobs, WORKER_LOOP_NAMES, type WorkerDeps } from "../src/jobs.ts";

test("WORKER_LOOPS starts only the named loops", async () => {
  // No loop named: nothing starts (so nothing touches the shared test database).
  const loops = startJobs({
    loops: new Set<string>(),
    billing: { notifier: null },
  } as unknown as WorkerDeps);
  expect(loops).toEqual([]);
});

test("every loop the worker can start has a name WORKER_LOOPS accepts", () => {
  const source = readFileSync(new URL("../src/jobs.ts", import.meta.url), "utf8");
  const names = [...source.matchAll(/^\s+name: "([a-z-]+)",$/gm)].map((match) => match[1]);
  expect(names.length).toBeGreaterThan(10);
  for (const name of names) expect(WORKER_LOOP_NAMES).toContain(name as never);
});
