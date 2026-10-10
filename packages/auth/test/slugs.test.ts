import { describe, expect, test } from "bun:test";
import { slugify, validateOrgSlug } from "../src/slugs.ts";

describe("validateOrgSlug", () => {
  test("accepts normal slugs", () => {
    for (const slug of ["acme", "acme-inc", "a1b", "x".repeat(48)]) {
      expect(validateOrgSlug(slug)).toBeNull();
    }
  });

  test("rejects bad format and reserved words", () => {
    for (const slug of ["ab", "-acme", "acme-", "Acme", "ac me", "a/b", "x".repeat(49), "/evil"]) {
      expect(validateOrgSlug(slug)).not.toBeNull();
    }
    for (const slug of ["admin", "api", "sign-in", "onboarding", "accept-invitation"]) {
      expect(validateOrgSlug(slug)).toContain("reserved");
    }
  });
});

describe("slugify", () => {
  test("normalizes names", () => {
    expect(slugify("Acme, Inc.")).toBe("acme-inc");
    expect(slugify("  Café   Déjà Vu ")).toBe("cafe-deja-vu");
    expect(slugify("---")).toBe("");
  });
});
