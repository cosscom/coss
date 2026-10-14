import { describe, expect, test } from "bun:test";
import {
  createVersioning,
  eventDataTransform,
  omitKeys,
  renameKey,
  versioning,
} from "../src/index.ts";
import { TEST_NEXT_VERSION, testVersioning } from "../src/testing.ts";
import { API_VERSIONS, LATEST_API_VERSION } from "../src/versions.ts";

const threeVersions = createVersioning({
  versions: ["2026-01-01", "2026-02-01", "2026-03-01"],
  changes: [
    {
      version: "2026-02-01",
      title: "Rename name to label",
      description: "",
      responses: { widget: (w) => renameKey(w, "label", "name") },
      requests: {
        "POST /v1/widgets": (b) => ({
          ...(b as object),
          step: [...((b as { step?: string[] }).step ?? []), "feb"],
        }),
      },
    },
    {
      version: "2026-03-01",
      title: "Rename title to label",
      description: "",
      responses: { widget: (w) => renameKey(w, "caption", "label") },
      requests: {
        "POST /v1/widgets": (b) => ({
          ...(b as object),
          step: [...((b as { step?: string[] }).step ?? []), "mar"],
        }),
      },
    },
  ],
});

describe("createVersioning", () => {
  test("the real registry is valid and its latest version is the last one", () => {
    expect(versioning.latest).toBe(LATEST_API_VERSION);
    expect(versioning.versions).toEqual(API_VERSIONS);
  });

  test("rejects malformed, unordered or duplicate versions and misplaced changes", () => {
    expect(() => createVersioning({ versions: [], changes: [] })).toThrow("no API versions");
    expect(() => createVersioning({ versions: ["2026-1-1"], changes: [] })).toThrow("YYYY-MM-DD");
    expect(() => createVersioning({ versions: ["2026-13-45"], changes: [] })).toThrow("YYYY-MM-DD");
    expect(() => createVersioning({ versions: ["2026-02-01", "2026-01-01"], changes: [] })).toThrow(
      "ascending",
    );
    expect(() => createVersioning({ versions: ["2026-01-01", "2026-01-01"], changes: [] })).toThrow(
      "ascending",
    );
    expect(() =>
      createVersioning({
        versions: ["2026-01-01"],
        changes: [{ version: "2026-05-01", title: "x", description: "" }],
      }),
    ).toThrow("unknown version");
    expect(() =>
      createVersioning({
        versions: ["2026-01-01"],
        changes: [{ version: "2026-01-01", title: "x", description: "" }],
      }),
    ).toThrow("oldest version");
  });
});

describe("downgrade", () => {
  const latest = {
    object: "widget",
    id: "w_1",
    caption: "hi",
    parts: [{ object: "widget", id: "w_2", caption: "inner" }],
  };

  test("applies changes newest first, recursing into nested objects and lists", () => {
    expect(threeVersions.downgrade(latest, "2026-02-01")).toEqual({
      object: "widget",
      id: "w_1",
      label: "hi",
      parts: [{ object: "widget", id: "w_2", label: "inner" }],
    });
    const list = { object: "list", data: [latest], has_more: false };
    expect(threeVersions.downgrade(list, "2026-01-01")).toEqual({
      object: "list",
      data: [
        {
          object: "widget",
          id: "w_1",
          name: "hi",
          parts: [{ object: "widget", id: "w_2", name: "inner" }],
        },
      ],
      has_more: false,
    });
  });

  test("returns the body untouched for the latest version and never mutates it", () => {
    const snapshot = structuredClone(latest);
    expect(threeVersions.downgrade(latest, "2026-03-01")).toBe(latest);
    threeVersions.downgrade(latest, "2026-01-01");
    expect(latest).toEqual(snapshot);
  });

  test("keeps key order when renaming and leaves unknown objects and scalars alone", () => {
    const out = <object>(
      threeVersions.downgrade({ object: "widget", a: 1, caption: "x", z: 2 }, "2026-02-01")
    );
    expect(Object.keys(out)).toEqual(["object", "a", "label", "z"]);
    expect(threeVersions.downgrade({ object: "gadget", caption: "x" }, "2026-01-01")).toEqual({
      object: "gadget",
      caption: "x",
    });
    expect(threeVersions.downgrade("text", "2026-01-01")).toBe("text");
    expect(threeVersions.downgrade(null, "2026-01-01")).toBeNull();
  });

  test("never renders customer data in opaque fields (a Hooks payload is not a resource)", () => {
    const widget = { object: "widget", caption: "x" };
    const message = {
      object: "hook_message",
      id: "hmsg_1",
      payload: { nested: widget, list: [widget] },
      echo: widget,
    };
    expect(threeVersions.downgrade({ object: "list", data: [message] }, "2026-01-01")).toEqual({
      object: "list",
      data: [
        {
          object: "hook_message",
          id: "hmsg_1",
          payload: { nested: widget, list: [widget] },
          echo: { object: "widget", name: "x" },
        },
      ],
    });
    const application = {
      object: "hook_application",
      metadata: { object: "widget", caption: "x" },
    };
    expect(threeVersions.downgrade(application, "2026-01-01")).toEqual(application);
  });

  test("eventDataTransform only touches events of its type prefix", () => {
    const testing = testVersioning();
    const email = {
      id: "evt_1",
      object: "event",
      type: "email.bounced",
      data: { email_id: "e", recipient: "a@x.test" },
    };
    const account = {
      id: "evt_2",
      object: "event",
      type: "account.warning",
      data: { recipient: "kept" },
    };
    expect((testing.downgrade(email, LATEST_API_VERSION) as { data: unknown }).data).toEqual({
      email_id: "e",
      address: "a@x.test",
    });
    expect(testing.downgrade(account, LATEST_API_VERSION)).toEqual(account);
    expect(
      eventDataTransform("email.", (d) => omitKeys(d, "x"))({
        object: "event",
        type: "email.sent",
        data: null,
      }),
    ).toEqual({
      object: "event",
      type: "email.sent",
      data: null,
    });
  });
});

describe("requests", () => {
  test("upgrades oldest change first, only for changes after the caller's version", () => {
    expect(threeVersions.upgradeRequest("POST /v1/widgets", {}, "2026-01-01")).toEqual({
      step: ["feb", "mar"],
    });
    expect(threeVersions.upgradeRequest("POST /v1/widgets", {}, "2026-02-01")).toEqual({
      step: ["mar"],
    });
    expect(threeVersions.upgradeRequest("POST /v1/widgets", {}, "2026-03-01")).toEqual({});
    expect(threeVersions.upgradeRequest("POST /v1/gadgets", {}, "2026-01-01")).toEqual({});
    expect(threeVersions.hasRequestChanges("POST /v1/widgets", "2026-02-01")).toBe(true);
    expect(threeVersions.hasRequestChanges("POST /v1/widgets", "2026-03-01")).toBe(false);
    expect(threeVersions.hasRequestChanges("POST /v1/gadgets", "2026-01-01")).toBe(false);
  });
});

describe("resolve and changesBetween", () => {
  test("resolve clamps a pin to the newest known version on or before it", () => {
    expect(threeVersions.resolve("2026-02-15")).toBe("2026-02-01");
    expect(threeVersions.resolve("2030-01-01")).toBe("2026-03-01");
    expect(threeVersions.resolve("2020-01-01")).toBe("2026-01-01");
    expect(threeVersions.isVersion("2026-02-15")).toBe(false);
    expect(threeVersions.isVersion("2026-02-01")).toBe(true);
  });

  test("changesBetween lists the changes an upgrade brings, newest first", () => {
    expect(threeVersions.changesBetween("2026-01-01", "2026-03-01").map((c) => c.version)).toEqual([
      "2026-03-01",
      "2026-02-01",
    ]);
    expect(threeVersions.changesBetween("2026-02-01", "2026-03-01").map((c) => c.version)).toEqual([
      "2026-03-01",
    ]);
    expect(threeVersions.changesBetween("2026-03-01", "2026-03-01")).toEqual([]);
  });

  test("the test registry adds one version after the real ones", () => {
    const testing = testVersioning();
    expect(testing.latest).toBe(TEST_NEXT_VERSION);
    expect(testing.changesBetween(LATEST_API_VERSION, TEST_NEXT_VERSION)).toHaveLength(1);
  });
});
