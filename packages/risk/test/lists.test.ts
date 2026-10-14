import { describe, expect, test } from "bun:test";
import {
  addRiskListEntry,
  getRiskListEntry,
  listRiskListEntries,
  normalizeListValue,
  removeRiskListEntry,
} from "../src/lists.ts";
import { setup } from "./helpers.ts";

describe("normalizeListValue", () => {
  test.each([
    ["email", "A.B+x@GMail.com", "ab@gmail.com", null],
    ["email", "Ada@Bücher.de", "ada@xn--bcher-kva.de", null],
    ["domain", "*.Evil.Example.", "evil.example", null],
    ["domain", "@evil.example", "evil.example", null],
    ["ip", "192.0.2.77", "192.0.2.77", "192.0.2.77/32"],
    ["ip", "192.0.2.77/24", "192.0.2.0/24", "192.0.2.0/24"],
    ["ip", "2001:DB8::1/48", "2001:db8::/48", "2001:db8::/48"],
    ["asn", "AS64500", "64500", null],
    ["asn", "as9009", "9009", null],
    ["country", "de", "DE", null],
    ["user", " u_42 ", "u_42", null],
  ] as const)("%s %s → %s", (type, input, value, network) => {
    expect(normalizeListValue(type, input)).toEqual({ value, network });
  });

  test.each([
    ["email", "not an email"],
    ["domain", "localhost"],
    ["ip", "300.1.1.1"],
    ["ip", "10.0.0.0/7"],
    ["ip", "::/8"],
    ["asn", "AS0"],
    ["asn", "ASX"],
    ["country", "DEU"],
  ] as const)("rejects %s %s", (type, input) => {
    expect(() => normalizeListValue(type, input)).toThrow(
      expect.objectContaining({ code: "invalid_list_value", param: "value" }),
    );
  });
});

describe("list entries", () => {
  test("adding is idempotent; entries list newest first with paging; removal", async () => {
    const { live, sandbox } = await setup();
    const first = await addRiskListEntry(live, {
      list: "block",
      type: "domain",
      value: "a.example",
    });
    expect(first?.created).toBe(true);
    const again = await addRiskListEntry(live, {
      list: "block",
      type: "domain",
      value: "A.example.",
    });
    expect(again).toEqual({ entry: first?.entry, created: false } as never);
    await addRiskListEntry(live, { list: "allow", type: "user", value: "u1", note: "QA" });
    await addRiskListEntry(live, { list: "block", type: "ip", value: "192.0.2.0/24" });

    const page = await listRiskListEntries(live, { limit: 2 });
    expect(page.data.map((entry) => entry.value)).toEqual(["192.0.2.0/24", "u1"]);
    expect(page.has_more).toBe(true);
    const next = await listRiskListEntries(live, { limit: 2, after: page.data[1]?.id });
    expect(next.data.map((entry) => entry.value)).toEqual(["a.example"]);
    expect(next.has_more).toBe(false);
    expect((await listRiskListEntries(live, { list: "allow" })).data).toMatchObject([
      { type: "user", value: "u1", note: "QA" },
    ]);
    expect((await listRiskListEntries(sandbox)).data).toEqual([]);

    const id = first?.entry.id as string;
    expect(await getRiskListEntry(sandbox, id)).toBeNull();
    expect(await removeRiskListEntry(sandbox, id)).toBeNull();
    expect((await removeRiskListEntry(live, id))?.id).toBe(id);
    expect(await getRiskListEntry(live, id)).toBeNull();
  });
});
