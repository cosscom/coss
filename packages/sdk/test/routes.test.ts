import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { renderRoutes } from "../scripts/routes.ts";

test("the route templates match the API's OpenAPI document (run `bun run openapi:generate`)", () => {
  const document = JSON.parse(
    readFileSync(new URL("../../../apps/api/openapi.json", import.meta.url), "utf8"),
  ) as { paths: Record<string, unknown> };
  const generated = readFileSync(
    new URL("../src/core/routes.generated.ts", import.meta.url),
    "utf8",
  );
  expect(generated).toBe(renderRoutes(Object.keys(document.paths)));
});
