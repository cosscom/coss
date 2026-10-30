import { describe, expect, test } from "bun:test";
import { BUCKETS } from "@coss/ratelimit/buckets";
import { DEFAULT_REPUTATION_POLICY } from "@coss/reputation/schemas";
import {
  apiRateLimitRows,
  formatRule,
  renderRateLimitComponents,
} from "../src/lib/rate-limits-text";
import { renderReputationComponents, reputationThresholdRows } from "../src/lib/reputation-text";

describe("API rate limits", () => {
  test("rows follow BUCKETS", () => {
    const read = apiRateLimitRows().find((row) => row.bucket === "api.read");
    expect(read?.rate).toBe(formatRule(BUCKETS["api.read"].limit, BUCKETS["api.read"].periodMs));
    expect(read?.burst).toBe(BUCKETS["api.read"].burst.toLocaleString("en-US"));
    expect(formatRule(30, 60_000)).toBe("30 per minute");
    expect(formatRule(5, 10 * 60_000)).toBe("5 per 10 minutes");
  });

  test("renders the table as Markdown", () => {
    const text = renderRateLimitComponents("Limits:\n\n<ApiRateLimits />");
    expect(text).not.toContain("<ApiRateLimits");
    expect(text.split("\n").filter((line) => line.startsWith("| "))).toHaveLength(
      apiRateLimitRows().length + 2,
    );
  });
});

describe("reputation thresholds", () => {
  test("rows follow DEFAULT_REPUTATION_POLICY", () => {
    const bounce = reputationThresholdRows().find((row) => row.id === "bounce_rate");
    expect(bounce?.warning).toBe(`${DEFAULT_REPUTATION_POLICY.bounceRate.warning * 100}%`);
  });

  test("renders the table and window as Markdown", () => {
    const text = renderReputationComponents(
      "Over <ReputationWindow />:\n\n<ReputationThresholds />",
    );
    expect(text).toStartWith(`Over ${DEFAULT_REPUTATION_POLICY.windowDays} days:`);
    expect(text).not.toContain("<Reputation");
  });
});
