/** The api key resource: the client's key revoking itself. */
import { describe, expect, test } from "bun:test";
import { Coss, type DeletedApiKey } from "../src/index.ts";
import { json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

describe("coss.apiKey", () => {
  test("revoke deletes the client's own key", async () => {
    const deleted: DeletedApiKey = {
      object: "api_key",
      id: "key_01k7c8m4q2f3e9v6t5r1n0p8yz",
      deleted: true,
    };
    const { fetch, calls } = mockFetch(json(200, deleted));
    const coss = new Coss({ apiKey: API_KEY, baseUrl: "https://api.test", fetch });
    expect(await coss.apiKey.revoke()).toEqual({ data: deleted, error: null });
    expect(calls[0]).toMatchObject({ method: "DELETE", url: "https://api.test/v1/api_key" });
  });
});
