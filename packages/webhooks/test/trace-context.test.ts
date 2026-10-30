import { describe, expect, test } from "bun:test";
import { parseTraceparent, TRACEPARENT_PATTERN, traceparentOf } from "../src/trace-context.ts";

const TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736";
const PARENT_ID = "00f067aa0ba902b7";
const VALID = `00-${TRACE_ID}-${PARENT_ID}-01`;

describe("parseTraceparent", () => {
  test.each([
    [VALID, VALID],
    [`  ${VALID} `, VALID],
    [`00-${TRACE_ID}-${PARENT_ID}-00`, `00-${TRACE_ID}-${PARENT_ID}-00`],
    // A later version may add fields; it is read as version 00.
    [`cc-${TRACE_ID}-${PARENT_ID}-09`, `00-${TRACE_ID}-${PARENT_ID}-09`],
    [`cc-${TRACE_ID}-${PARENT_ID}-09-what-the-future-holds`, `00-${TRACE_ID}-${PARENT_ID}-09`],
    // Several headers: the last one.
    [`00-${"a".repeat(32)}-${"b".repeat(16)}-01, ${VALID}`, VALID],
  ])("%s → %s", (header, stored) => {
    expect(parseTraceparent(header)).toBe(stored);
    expect(stored).toMatch(TRACEPARENT_PATTERN);
  });

  test.each([
    null,
    undefined,
    "",
    "garbage",
    VALID.toUpperCase(),
    `ff-${TRACE_ID}-${PARENT_ID}-01`,
    `00-${TRACE_ID}-${PARENT_ID}-01-extra`,
    `00-${"0".repeat(32)}-${PARENT_ID}-01`,
    `00-${TRACE_ID}-${"0".repeat(16)}-01`,
    `00-${TRACE_ID.slice(1)}-${PARENT_ID}-01`,
    `${VALID}, garbage`,
    `${VALID}\r\nx-injected: 1`,
  ])("ignores %p", (header) => {
    expect(parseTraceparent(header)).toBeNull();
  });
});

describe("traceparentOf", () => {
  test("reads a well-formed data.traceparent only", () => {
    expect(traceparentOf({ data: { traceparent: VALID } })).toBe(VALID);
    expect(traceparentOf({ data: { traceparent: "bad\nvalue" } })).toBeNull();
    expect(traceparentOf({ data: { traceparent: 1 } })).toBeNull();
    expect(traceparentOf({ data: null })).toBeNull();
    expect(traceparentOf({})).toBeNull();
  });
});
