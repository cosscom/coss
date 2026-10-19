import { describe, expect, test } from "bun:test";
import {
  API_KEY_PERMISSION_GROUPS,
  API_KEY_RESOURCES,
  apiKeyActionLabel,
  InvalidKeyPermissionsError,
  type KeyPermissions,
  normalizeKeyPermissions,
  parsePermissionStrings,
  permissionLines,
  permissionStrings,
  readOnlyPermissions,
  SENDING_PERMISSIONS,
  summarizeKeyAccess,
} from "../src/api-key-permissions.ts";
import { API_KEY_PERMISSIONS } from "../src/constants.ts";

describe("catalog", () => {
  test("labels exactly the resources of API_KEY_PERMISSIONS", () => {
    expect(API_KEY_RESOURCES.map((info) => info.resource).sort()).toEqual(
      Object.keys(API_KEY_PERMISSIONS).sort(),
    );
    for (const info of API_KEY_RESOURCES) {
      expect(API_KEY_PERMISSION_GROUPS).toContain(info.group);
      expect(info.description).toEndWith(".");
    }
  });

  test("every action has a label", () => {
    for (const actions of Object.values(API_KEY_PERMISSIONS)) {
      for (const action of actions) expect(apiKeyActionLabel(action)).not.toBe(action);
    }
  });

  test("the presets only name catalog permissions", () => {
    expect(normalizeKeyPermissions(SENDING_PERMISSIONS)).toEqual(SENDING_PERMISSIONS);
    expect(normalizeKeyPermissions(readOnlyPermissions())).toEqual(readOnlyPermissions());
    expect(readOnlyPermissions()).toMatchObject({ email: ["read"], billing: ["read"] });
    expect(readOnlyPermissions().receivedEmail).toBeUndefined();
  });
});

describe("normalizeKeyPermissions", () => {
  test("dedupes, drops empty resources and orders by the catalog", () => {
    expect(
      normalizeKeyPermissions({ log: ["read"], email: ["read", "send", "read"], domain: [] }),
    ).toEqual({ email: ["send", "read"], log: ["read"] });
  });

  test("refuses unknown permissions and empty sets", () => {
    const invalid: KeyPermissions[] = [
      {},
      { email: [] },
      { video: ["send"] },
      { email: ["delete"] },
    ];
    for (const requested of invalid) {
      expect(() => normalizeKeyPermissions(requested)).toThrow(InvalidKeyPermissionsError);
    }
  });
});

test("parsePermissionStrings round-trips permissionStrings", () => {
  const permissions = { email: ["send", "read"], emailTemplate: ["publish"] };
  expect(parsePermissionStrings(permissionStrings(permissions))).toEqual(permissions);
  expect(permissionStrings(permissions)).toEqual([
    "email:send",
    "email:read",
    "emailTemplate:publish",
  ]);
  for (const value of ["email", "email:send:extra", ":send"]) {
    expect(() => parsePermissionStrings([value])).toThrow(InvalidKeyPermissionsError);
  }
});

test("summarizeKeyAccess", () => {
  expect(summarizeKeyAccess("full", API_KEY_PERMISSIONS)).toBe("full");
  expect(summarizeKeyAccess("restricted", { email: ["send"] })).toBe("sending");
  expect(summarizeKeyAccess("restricted", { email: ["read"], log: ["read"] })).toBe("read_only");
  expect(summarizeKeyAccess("restricted", { email: ["send", "read"] })).toBe("custom");
  expect(summarizeKeyAccess("restricted", {})).toBe("custom");
});

test("permissionLines follows the catalog's order and labels", () => {
  expect(permissionLines({ log: ["read"], email: ["send", "read"], legacy: ["use"] })).toEqual([
    { resource: "email", label: "Emails", actions: ["Send", "Read"] },
    { resource: "log", label: "Logs", actions: ["Read"] },
    { resource: "legacy", label: "legacy", actions: ["use"] },
  ]);
});
