import { describe, expect, test } from "bun:test";
import { defaultEnvironment, liveEnvironmentIds } from "../src/lib/default-environment";

const production = { id: "env_prod", slug: "production", mode: "live" as const };
const development = { id: "env_dev", slug: "development", mode: "sandbox" as const };
const staging = { id: "env_staging", slug: "staging", mode: "live" as const };

describe("defaultEnvironment", () => {
  test("opens development until a live environment has sent an email", () => {
    expect(defaultEnvironment([production, development], new Set())).toBe(development);
    expect(defaultEnvironment([production, development], new Set(["env_prod"]))).toBe(production);
  });

  test("takes the first live environment, in display order, that has sent", () => {
    const environments = [production, development, staging];
    expect(defaultEnvironment(environments, new Set(["env_staging"]))).toBe(staging);
    expect(defaultEnvironment(environments, new Set(["env_staging", "env_prod"]))).toBe(production);
  });

  test("falls back to the first environment without a sandbox one", () => {
    expect(defaultEnvironment([production], new Set())).toBe(production);
    expect(defaultEnvironment([], new Set())).toBeUndefined();
  });
});

test("liveEnvironmentIds lists every project's live environments", () => {
  expect(
    liveEnvironmentIds([{ environments: [production, development] }, { environments: [staging] }]),
  ).toEqual(["env_prod", "env_staging"]);
});
