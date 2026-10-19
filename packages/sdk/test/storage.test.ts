import { describe, expect, test } from "bun:test";
import { Coss, type StorageSettings } from "../src/index.ts";
import { apiError, json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";
const URL = "https://api.coss.com/v1/storage_settings";

const settings: StorageSettings = {
  object: "storage_settings",
  content_storage: "discard",
  updated_at: "2026-10-16T10:00:00.000Z",
};

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return { storage: new Coss({ apiKey: API_KEY, fetch }).email.storage, calls };
}

describe("coss.email.storage", () => {
  test("get GETs the environment's settings", async () => {
    const { storage, calls } = client(json(200, settings));
    expect(await storage.get()).toEqual({ data: settings, error: null });
    expect(calls[0]?.method).toBe("GET");
    expect(calls[0]?.url).toBe(URL);
  });

  test("update PATCHes the content storage", async () => {
    const { storage, calls } = client(json(200, settings));
    expect(await storage.update({ content_storage: "discard" })).toEqual({
      data: settings,
      error: null,
    });
    expect(calls[0]?.method).toBe("PATCH");
    expect(calls[0]?.url).toBe(URL);
    expect(JSON.parse(calls[0]?.body ?? "")).toEqual({ content_storage: "discard" });
  });

  test("returns API errors without throwing", async () => {
    const { storage } = client(
      apiError(422, {
        type: "invalid_request_error",
        code: "validation_error",
        message: "Invalid input.",
      }),
    );
    const result = await storage.update({ content_storage: "discard" });
    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({ code: "validation_error" });
  });
});
