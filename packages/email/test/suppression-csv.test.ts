import { describe, expect, test } from "bun:test";
import type { SuppressionOutput } from "../src/schemas.ts";
import {
  parseSuppressionCsv,
  suppressionCsvHeader,
  suppressionCsvRow,
} from "../src/suppression-csv.ts";

const entry: SuppressionOutput = {
  object: "suppression",
  id: "sup_01k5f9yq8re8vb6q2wmz0tb2xd",
  address: "jane@example.com",
  scope: "*",
  reason: "bounce",
  email_id: "email_01k5f9yq8re8vb6q2wmz0tb2xe",
  created_at: "2026-10-09T12:00:00.000Z",
};

describe("suppression CSV export", () => {
  test("writes a header and one CRLF row per entry, nulls as empty fields", () => {
    expect(suppressionCsvHeader()).toBe("address,scope,reason,created_at,email_id,id\r\n");
    expect(suppressionCsvRow(entry)).toBe(
      "jane@example.com,*,bounce,2026-10-09T12:00:00.000Z,email_01k5f9yq8re8vb6q2wmz0tb2xe,sup_01k5f9yq8re8vb6q2wmz0tb2xd\r\n",
    );
    expect(suppressionCsvRow({ ...entry, email_id: null })).toContain(".000Z,,sup_");
  });

  test("guards cells a spreadsheet would run as formulas, and quotes when needed", () => {
    const row = suppressionCsvRow({ ...entry, address: '=cmd"x"@example.com', scope: "-promo" });
    expect(row.startsWith(`"'=cmd""x""@example.com",'-promo,`)).toBe(true);
  });

  test("an export parses back to its addresses and scopes", () => {
    const csv =
      suppressionCsvHeader() +
      suppressionCsvRow(entry) +
      suppressionCsvRow({ ...entry, address: "+tag@example.com", scope: "marketing" });
    expect(parseSuppressionCsv(csv)).toEqual([
      { line: 2, address: "jane@example.com", scope: "*" },
      { line: 3, address: "+tag@example.com", scope: "marketing" },
    ]);
  });

  test.each(["+", "=", "-", "'", "'+", "'=", "'-", "''+", "'tag"])(
    "round-trips addresses beginning with %s without losing literal apostrophes",
    (prefix) => {
      const address = `${prefix}tag@example.com`;
      const row = suppressionCsvRow({ ...entry, address });
      expect(row.startsWith(`'${address},`)).toBe(true);
      expect(parseSuppressionCsv(suppressionCsvHeader() + row)).toEqual([
        { line: 2, address, scope: "*" },
      ]);
    },
  );
});

describe("suppression CSV import", () => {
  test("finds the address and scope columns by header, in any order and case", () => {
    expect(
      parseSuppressionCsv(
        `${String.fromCharCode(0xfeff)}Name,Category,EMAIL\nJane,news,jane@example.com\nJoe,,joe@example.com\n`,
      ),
    ).toEqual([
      { line: 2, address: "jane@example.com", scope: "news" },
      { line: 3, address: "joe@example.com" },
    ]);
  });

  test("without a header, the first column is the address and the second the scope", () => {
    expect(parseSuppressionCsv("jane@example.com\r\n\r\n joe@example.com , marketing\r\n")).toEqual(
      [
        { line: 1, address: "jane@example.com" },
        { line: 3, address: "joe@example.com", scope: "marketing" },
      ],
    );
  });

  test.each(["category", "scope", "email", "address", "email_address", "email address"])(
    "treats %s as data when the first column contains an address",
    (scope) => {
      expect(parseSuppressionCsv(` user@example.com ,${scope}\nnext@example.com,news`)).toEqual([
        { line: 1, address: "user@example.com", scope },
        { line: 2, address: "next@example.com", scope: "news" },
      ]);
    },
  );

  test("handles quoted fields with commas, quotes and line breaks", () => {
    expect(
      parseSuppressionCsv('email,note\n"jane@example.com","a, ""b""\nc"\njoe@example.com,x'),
    ).toEqual([
      { line: 2, address: "jane@example.com" },
      { line: 4, address: "joe@example.com" },
    ]);
  });

  test("a header without an address column is an error; an empty file has no entries", () => {
    expect(() => parseSuppressionCsv("scope,name\n*,Jane\n")).toThrow('"address"');
    expect(parseSuppressionCsv("")).toEqual([]);
    expect(parseSuppressionCsv("\n \n")).toEqual([]);
  });
});
