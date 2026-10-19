import { describe, expect, test } from "bun:test";
import { completionScript } from "../src/completion.ts";
import { Output, terminalSafe, toJson } from "../src/output.ts";
import { testIo } from "./helpers.ts";

describe("terminal output", () => {
  test("lines keep the CLI's own styles, tab and newline, and lose every other control", () => {
    const io = testIo();
    io.stdout.isTTY = true;
    const out = new Output(io, { json: false, color: true });
    const styled = out.style(["bold", "red"], "bounced");
    expect(terminalSafe(`${styled}\tok\n`)).toBe(`${styled}\tok\n`);
    // OSC 52 (clipboard), a title, cursor movement, conceal (SGR 8), a carriage return, C1 CSI.
    expect(
      terminalSafe("a\u001b]52;c;aGk=\u0007b\u001b]0;x\u0007c\u001b[2Ad\u001b[8me\rf\u009b2Ag"),
    ).toBe("a]52;c;aGk=b]0;xc[2Ade" + "f2Ag");
    out.line("x\u001b[2Ky");
    out.warn("w\u0007");
    expect(io.output()).toBe("x[2Ky\n");
    expect(io.errors()).not.toContain("\u0007");
  });

  test("JSON escapes DEL and C1 controls too, and still parses to the same value", () => {
    const value = { subject: "a\u009b2Jb\u007fc\u001bd" };
    const text = toJson(value);
    expect(text).toBe('{"subject":"a\\u009b2Jb\\u007fc\\u001bd"}');
    expect(JSON.parse(text)).toEqual(value);
    const io = testIo();
    new Output(io, { json: true, color: false }).data(value);
    expect(io.output()).toBe(`${text}\n`);
  });

  test("fish passes an empty current token, so `coss hooks apps <Tab>` offers subcommands", () => {
    expect(completionScript("fish")).toContain('coss __complete $words "$current"');
  });
});
