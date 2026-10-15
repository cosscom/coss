import { describe, expect, test } from "bun:test";
import {
  emailFilterParams,
  emailFilterQuery,
  hasEmailFilters,
  toEmailListFilters,
} from "../src/lib/email-filters";

const read = (query: string) => {
  const search = new URLSearchParams(query);
  return emailFilterParams((name) => search.get(name)?.trim() ?? "");
};

describe("email list filters", () => {
  test("parses every parameter into listEmails filters", () => {
    const params = read(
      "q=invoice&status=failed&recipient=ann@example.com&tag=template:welcome&category=billing&domain=acme.com&since=2026-10-01&until=2026-10-14",
    );
    expect(hasEmailFilters(params)).toBe(true);
    expect(toEmailListFilters(params)).toEqual({
      query: "invoice",
      status: ["failed"],
      recipient: "ann@example.com",
      tag: { name: "template", value: "welcome" },
      category: "billing",
      senderDomain: "acme.com",
      createdAfter: new Date("2026-10-01T00:00:00Z"),
      // `until` includes its whole day.
      createdBefore: new Date("2026-10-15T00:00:00Z"),
    });
    expect(toEmailListFilters(read("tag=template")).tag).toEqual({ name: "template" });
  });

  test("drops unknown statuses and malformed days", () => {
    const params = read("status=bogus&since=2026-02-30&until=yesterday");
    expect(params).toMatchObject({ status: "all", since: "", until: "" });
    expect(hasEmailFilters(params)).toBe(false);
    expect(toEmailListFilters(params)).toEqual({
      query: undefined,
      status: undefined,
      recipient: undefined,
      tag: undefined,
      category: undefined,
      senderDomain: undefined,
      createdAfter: undefined,
      createdBefore: undefined,
    });
  });

  test("leaves empty values and status=all out of URLs", () => {
    expect(emailFilterQuery(read("status=all&q=&category=billing"))).toEqual({
      q: undefined,
      status: undefined,
      recipient: undefined,
      tag: undefined,
      category: "billing",
      domain: undefined,
      since: undefined,
      until: undefined,
    });
  });
});
