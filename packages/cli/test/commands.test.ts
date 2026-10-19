import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { commandHelp, flagLabel, wrap } from "../src/command.ts";
import { complete } from "../src/completion.ts";
import { COMMANDS, HELP, run } from "../src/run.ts";
import { testIo } from "./helpers.ts";

const README = readFileSync(join(import.meta.dir, "../README.md"), "utf8");
const DOCS = readFileSync(
  join(import.meta.dir, "../../../apps/site/content/docs/(guides)/cli.mdx"),
  "utf8",
);

describe("the command registry", () => {
  test("coss --help lists every command; coss <command> --help shows its flags", async () => {
    for (const command of COMMANDS) {
      expect(HELP).toContain(`  ${command.name} `);
      const io = testIo();
      expect(await run([...command.name.split(" "), "--help"], io)).toBe(0);
      expect(io.output()).toBe(`${commandHelp(command)}\n`);
      expect(io.output()).toStartWith(`Usage: coss ${command.name} `);
      for (const [name, flag] of Object.entries(command.flags)) {
        expect(io.output()).toContain(flagLabel(name, flag));
      }
      for (const line of io.output().split("\n")) expect(line.length).toBeLessThanOrEqual(100);
    }
  });

  test("every command is in the README and the docs, with every flag in the docs", () => {
    for (const command of COMMANDS) {
      expect(README).toContain(`coss ${command.name}`);
      expect(DOCS).toContain(`coss ${command.name}`);
      for (const [name, flag] of Object.entries(command.flags)) {
        const documented =
          DOCS.includes(`--${name}`) || (flag.short && DOCS.includes(`-${flag.short}`));
        expect(documented ? name : `--${name} of coss ${command.name} is not in cli.mdx`).toBe(
          name,
        );
      }
    }
  });

  test("unknown commands and groups without a command are usage errors", async () => {
    for (const [argv, message] of [
      [["emails"], '"emails" needs a command: try `coss emails send`, `coss emails list`'],
      [["emails", "lst"], 'Unknown command "emails lst"'],
      [["nope"], 'Unknown command "nope"'],
      [
        ["hooks", "apps"],
        '"hooks apps" needs a command: try `coss hooks apps list`, `coss hooks apps create`.',
      ],
      [["hooks", "apps", "delete", "x"], 'Unknown command "hooks apps delete"'],
      [
        ["hooks", "--json"],
        '"hooks" needs a command: try `coss hooks apps`, `coss hooks event-types`',
      ],
      [["risk", "lists", "--help"], '"risk lists" needs a command'],
      [["whoami", "extra"], "Unexpected argument"],
      [["whoami", "--nope"], "Unknown option"],
    ] as const) {
      const io = testIo();
      expect(await run([...argv], io)).toBe(2);
      expect(io.errors()).toContain(message);
    }
  });

  test("wrap keeps lines within the width", () => {
    expect(wrap("one two three four", 2, 12)).toEqual(["  one two", "  three four"]);
  });
});

describe("shell completion", () => {
  test("commands, subcommands, flags and their values", () => {
    // Each top-level word once, in `coss --help`'s order.
    expect(complete(COMMANDS, [""])).toEqual([
      ...new Set(COMMANDS.map((command) => command.name.split(" ")[0] ?? "")),
    ]);
    expect(complete(COMMANDS, [""])).toEqual(expect.arrayContaining(["login", "hooks", "risk"]));
    expect(complete(COMMANDS, ["lo"])).toEqual(["login", "logout", "logs"]);
    // Groups inside groups: `coss hooks apps list`.
    expect(complete(COMMANDS, ["hooks", "e"])).toEqual(["event-types", "endpoints"]);
    expect(complete(COMMANDS, ["hooks", "apps", ""])).toEqual(["list", "create"]);
    expect(complete(COMMANDS, ["risk", "assess"])).toEqual(["assess", "assessments"]);
    expect(complete(COMMANDS, ["risk", "lists", "list", "--type", "d"])).toEqual(["domain"]);
    expect(complete(COMMANDS, ["hooks", "deliveries", "acme", "--status", ""])).toEqual([
      "pending",
      "succeeded",
      "failed",
    ]);
    expect(complete(COMMANDS, ["emails", ""])).toEqual([
      "send",
      "list",
      "get",
      "events",
      "diagnose",
    ]);
    // A command that has subcommands of its own.
    expect(complete(COMMANDS, ["inbox", ""])).toEqual(["get"]);
    expect(complete(COMMANDS, ["inbox", "get", ""])).toEqual([]);
    expect(complete(COMMANDS, ["emails", "send", "--sim"])).toEqual(["--simulate"]);
    expect(complete(COMMANDS, ["emails", "send", "--simulate", "b"])).toEqual(["bounced"]);
    expect(complete(COMMANDS, ["logs", "tail", "--source", ""])).toContain("webhook");
    expect(complete(COMMANDS, ["api", "-X", "P"])).toEqual(["POST", "PUT", "PATCH"]);
    expect(complete(COMMANDS, ["whoami", "--p"])).toEqual(["--profile"]);
    expect(complete(COMMANDS, ["completion", ""])).toEqual(["bash", "zsh", "fish"]);
    // A value of its own (a path, an address): the shell offers files.
    expect(complete(COMMANDS, ["emails", "send", "--to", ""])).toEqual([]);
  });

  test("coss __complete prints them; coss completion prints each shell's script", async () => {
    const io = testIo();
    expect(await run(["__complete", "logs", "tail", "--le"], io)).toBe(0);
    expect(io.output()).toBe("--level\n");
    for (const shell of ["bash", "zsh", "fish"]) {
      const script = testIo();
      expect(await run(["completion", shell], script)).toBe(0);
      expect(script.output()).toContain("coss __complete");
    }
    const bad = testIo();
    expect(await run(["completion", "powershell"], bad)).toBe(2);
  });
});
