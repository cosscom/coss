import { describe, expect, test } from "bun:test";
import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { configPath, profileName, readConfig, writeConfig } from "../src/config.ts";
import { apiBaseUrl, createContext, resolveCredentials } from "../src/context.ts";
import { defaultConfigDir } from "../src/io.ts";
import { SANDBOX_KEY, testIo } from "./helpers.ts";

describe("config", () => {
  test("lives under XDG_CONFIG_HOME, APPDATA on Windows, else ~/.config", () => {
    expect(defaultConfigDir({ XDG_CONFIG_HOME: "/x" }, "linux", "/home/a")).toBe(
      join("/x", "coss"),
    );
    expect(defaultConfigDir({ APPDATA: "C:\\A" }, "win32", "C:\\Users\\a")).toBe(
      join("C:\\A", "coss"),
    );
    expect(defaultConfigDir({}, "darwin", "/Users/a")).toBe(join("/Users/a", ".config", "coss"));
  });

  test("is written atomically, readable by its owner only", async () => {
    const io = testIo();
    expect(await readConfig(io)).toEqual({ version: 1, profiles: {} });
    await writeConfig(io, {
      version: 1,
      default_profile: "default",
      profiles: { default: { api_key: SANDBOX_KEY, login: "manual", created_at: "now" } },
    });
    expect((await stat(configPath(io))).mode & 0o777).toBe(0o600);
    expect(JSON.parse(await readFile(configPath(io), "utf8")).profiles.default.api_key).toBe(
      SANDBOX_KEY,
    );
    await writeFile(configPath(io), "{nope");
    expect(readConfig(io)).rejects.toThrow("not a valid coss.com CLI config");
  });

  test("COSS_API_KEY wins over profiles; --profile over COSS_PROFILE over the default", async () => {
    const io = testIo();
    const config = {
      version: 1 as const,
      default_profile: "work",
      profiles: {
        work: {
          api_key: SANDBOX_KEY,
          login: "manual" as const,
          base_url: "http://localhost:3001",
          created_at: "now",
        },
      },
    };
    await writeConfig(io, config);
    expect(profileName(io, config, undefined)).toBe("work");
    expect(profileName({ ...io, env: { COSS_PROFILE: "ci" } }, config, undefined)).toBe("ci");
    expect(profileName({ ...io, env: { COSS_PROFILE: "ci" } }, config, "x")).toBe("x");
    expect(() => profileName(io, config, "../etc")).toThrow("Invalid profile name");

    const fromProfile = await resolveCredentials(
      createContext(io, { json: false, color: false, help: false }),
    );
    expect(fromProfile).toMatchObject({ source: "profile", baseUrl: "http://localhost:3001" });
    const envKey = `coss_test_${"z".repeat(64)}`;
    const fromEnv = await resolveCredentials(
      createContext(
        { ...io, env: { COSS_API_KEY: envKey } },
        { json: false, color: false, help: false },
      ),
    );
    expect(fromEnv).toMatchObject({
      source: "env",
      apiKey: envKey,
      baseUrl: "https://api.coss.com",
    });
    expect(apiBaseUrl({ ...io, env: { COSS_BASE_URL: "http://x/" } }, null)).toBe("http://x");

    const empty = testIo();
    expect(
      resolveCredentials(createContext(empty, { json: false, color: false, help: false })),
    ).rejects.toThrow("Not signed in");
  });
});
