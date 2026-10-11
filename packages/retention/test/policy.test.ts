import { describe, expect, test } from "bun:test";
import {
  formatRetentionDays,
  formatRetentionPeriod,
  RETENTION_DAYS,
  RETENTION_POLICY,
  retentionCutoff,
} from "../src/index.ts";

describe("retention policy", () => {
  test("rules have unique ids and positive periods", () => {
    const ids = RETENTION_POLICY.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const { period } of RETENTION_POLICY) {
      if ("days" in period) expect(period.days).toBeGreaterThan(0);
    }
  });

  test("emails outlive the reputation data that is recounted from them", () => {
    // Reputation windows are at most 30 days, and rollups are recounted from emails for 31.
    expect(RETENTION_DAYS.emails).toBeGreaterThan(RETENTION_DAYS.reputationRollups);
    expect(RETENTION_DAYS.reputationRollups).toBeGreaterThan(30);
    expect(RETENTION_DAYS.contentScreenings).toBeGreaterThan(30);
  });

  test("formats periods", () => {
    expect(formatRetentionDays(1)).toBe("24 hours");
    expect(formatRetentionDays(45)).toBe("45 days");
    expect(formatRetentionDays(730)).toBe("2 years");
    expect(formatRetentionPeriod({ days: 7, after: "expiry" })).toBe("7 days after expiry");
    expect(formatRetentionPeriod({ until: "deleted" })).toBe("Until you delete it");
  });

  test("cutoff", () => {
    const now = new Date("2026-03-31T00:00:00Z");
    expect(retentionCutoff(30, now).toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
});
