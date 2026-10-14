import { describe, expect, test } from "bun:test";
import {
  DASHBOARD_PATH,
  ORG_NAME_MAX_LENGTH,
  RESERVED_ORG_SLUGS,
  SITE_ASSET_PREFIX,
  slugify,
  validateOrgName,
  validateOrgSlug,
  ZONE_ROUTES,
  zoneForPath,
} from "../src/slugs.ts";

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
    for (const slug of [
      "admin",
      "api",
      "sign-in",
      "onboarding",
      "accept-invitation",
      "dashboard",
    ]) {
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

describe("zones", () => {
  test("the dashboard is the default zone", () => {
    for (const path of [DASHBOARD_PATH, "/acme", "/acme/projects/x", "/api/auth/get-session"]) {
      expect(zoneForPath(path)).toBe("dashboard");
    }
    // Bare Next.js assets belong to the default zone; the site's live under its asset prefix.
    expect(zoneForPath("/_next/static/chunks/a.js")).toBe("dashboard");
    expect(zoneForPath(`${SITE_ASSET_PREFIX}/_next/static/chunks/a.js`)).toBe("site");
  });

  test("site and ui paths, exact and prefixed", () => {
    expect(zoneForPath("/")).toBe("site");
    expect(zoneForPath("/docs")).toBe("site");
    expect(zoneForPath("/docs/api-reference/emails/send-email")).toBe("site");
    expect(zoneForPath("/docs/search.json")).toBe("site");
    expect(zoneForPath("/llms.txt")).toBe("site");
    expect(zoneForPath("/.well-known/security.txt")).toBe("site");
    expect(zoneForPath("/ui")).toBe("ui");
    expect(zoneForPath("/ui/docs/button")).toBe("ui");
    expect(zoneForPath("/origin")).toBe("origin");
    expect(zoneForPath("/origin/sitemap.xml")).toBe("origin");
    // A prefix never matches a longer segment, and exact paths match only themselves.
    expect(zoneForPath("/docsx")).toBe("dashboard");
    expect(zoneForPath("/uix")).toBe("dashboard");
    expect(zoneForPath("/llms.txt/x")).toBe("dashboard");
  });

  test("routes are well-formed and every first segment is reserved", () => {
    for (const route of ZONE_ROUTES) {
      expect(route.path.startsWith("/")).toBe(true);
      expect(route.path === "/" || !route.path.endsWith("/")).toBe(true);
      expect(route.path).not.toContain("*");
      const segment = route.path.split("/")[1];
      if (segment)
        expect({ segment, reserved: RESERVED_ORG_SLUGS.has(segment) }).toEqual({
          segment,
          reserved: true,
        });
    }
  });

  test("future marketing pages and products are reserved", () => {
    for (const slug of ["pricing", "blog", "changelog", "email", "sms", "open-source", "legal"]) {
      expect(validateOrgSlug(slug)).toContain("reserved");
    }
  });
});

describe("validateOrgName", () => {
  test("accepts 1-64 characters after trimming", () => {
    expect(validateOrgName("Acme")).toBeNull();
    expect(validateOrgName(" A ")).toBeNull();
    expect(validateOrgName("x".repeat(ORG_NAME_MAX_LENGTH))).toBeNull();
  });

  test("rejects blank and overlong names", () => {
    expect(validateOrgName("")).not.toBeNull();
    expect(validateOrgName("   ")).not.toBeNull();
    expect(validateOrgName("x".repeat(ORG_NAME_MAX_LENGTH + 1))).not.toBeNull();
  });
});
