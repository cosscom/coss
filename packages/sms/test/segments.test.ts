import { describe, expect, test } from "bun:test";
import { parsePhoneNumber } from "../src/phone.ts";
import { smsKeyword } from "../src/schemas.ts";
import { countSegments, isGsm7 } from "../src/segments.ts";

describe("countSegments", () => {
  test("GSM-7 fits 160 characters in one segment, then 153 per segment", () => {
    expect(countSegments("a".repeat(160))).toEqual({
      encoding: "gsm7",
      segments: 1,
      units: 160,
      remaining: 0,
    });
    expect(countSegments("a".repeat(161)).segments).toBe(2);
    expect(countSegments("a".repeat(306)).segments).toBe(2);
    expect(countSegments("a".repeat(307)).segments).toBe(3);
  });

  test("extension characters take two septets and are never split", () => {
    expect(countSegments("€".repeat(80))).toMatchObject({
      encoding: "gsm7",
      segments: 1,
      units: 160,
    });
    expect(countSegments("€".repeat(81)).segments).toBe(2);
    // 152 plain characters, then a two-septet one: it moves whole to the second segment.
    expect(countSegments(`${"a".repeat(152)}€${"a".repeat(10)}`)).toMatchObject({
      segments: 2,
      units: 164,
      remaining: 153 - 12,
    });
  });

  test("anything outside GSM-7 is UCS-2: 70 in one segment, 67 per segment", () => {
    expect(isGsm7("Hello ✓")).toBe(false);
    expect(countSegments("✓".repeat(70))).toMatchObject({ encoding: "ucs2", segments: 1 });
    expect(countSegments("✓".repeat(71)).segments).toBe(2);
    expect(countSegments("✓".repeat(134)).segments).toBe(2);
    expect(countSegments("✓".repeat(135)).segments).toBe(3);
  });

  test("emoji take two UTF-16 units and are never split", () => {
    expect(countSegments("😀".repeat(35))).toMatchObject({ segments: 1, units: 70 });
    // 66 units, then a surrogate pair: it starts the next segment.
    expect(countSegments(`${"✓".repeat(66)}😀${"✓".repeat(5)}`)).toMatchObject({
      segments: 2,
      units: 73,
    });
  });

  test("Greek capitals and accented Latin letters of the GSM alphabet stay GSM-7", () => {
    expect(isGsm7("ΔΦΓ Ébène à ü @£$")).toBe(true);
    expect(isGsm7("ê")).toBe(false);
  });
});

describe("parsePhoneNumber", () => {
  test("valid E.164 numbers get their country", () => {
    expect(parsePhoneNumber("+14155552671")).toEqual({
      phoneNumber: "+14155552671",
      country: "US",
    });
    expect(parsePhoneNumber("+447400123456")).toEqual({
      phoneNumber: "+447400123456",
      country: "GB",
    });
    expect(parsePhoneNumber("+16135550123")?.country).toBe("CA");
  });

  test("the simulator's numbers are the United States'", () => {
    expect(parsePhoneNumber("+15005550006")).toEqual({
      phoneNumber: "+15005550006",
      country: "US",
    });
  });

  test("anything else is refused", () => {
    expect(parsePhoneNumber("4155552671")).toBeNull();
    expect(parsePhoneNumber("+1 415 555 2671")).toBeNull();
    expect(parsePhoneNumber("+1415555")).toBeNull();
  });
});

test("keywords are whole messages, in any case", () => {
  expect(smsKeyword(" stop ")).toBe("stop");
  expect(smsKeyword("Unsubscribe")).toBe("stop");
  expect(smsKeyword("START")).toBe("start");
  expect(smsKeyword("help")).toBe("help");
  expect(smsKeyword("please stop")).toBeNull();
});
