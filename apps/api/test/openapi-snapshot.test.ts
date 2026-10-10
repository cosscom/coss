import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { OPENAPI_SNAPSHOT_PATH, renderOpenApiSnapshot } from "../src/openapi-snapshot.ts";

test("openapi.json matches the routes (run `bun run openapi:generate` after API changes)", () => {
  expect(readFileSync(OPENAPI_SNAPSHOT_PATH, "utf8")).toBe(renderOpenApiSnapshot());
});
