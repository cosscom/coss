import { describe, expect, test } from "bun:test";
import { RETENTION_DAYS, RETENTION_POLICY } from "@coss/retention";
import { renderRetentionComponents } from "../src/lib/retention-text";

describe("renderRetentionComponents", () => {
  test("renders the policy table and periods as Markdown", () => {
    const text = renderRetentionComponents(
      'Kept <RetentionPeriod of="emails" />, or <RetentionPeriod of="suppressions" />.\n\n<RetentionTable />',
    );
    expect(text).toStartWith(`Kept ${RETENTION_DAYS.emails} days, or until you delete it.`);
    expect(text.split("\n").filter((line) => line.startsWith("| "))).toHaveLength(
      RETENTION_POLICY.length + 2,
    );
  });

  test("refuses unknown rules", () => {
    expect(() => renderRetentionComponents('<RetentionPeriod of="nope" />')).toThrow();
  });
});
