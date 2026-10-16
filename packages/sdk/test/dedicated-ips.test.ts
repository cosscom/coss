/** The dedicated IPs resource: request shape, and how results come back. */
import { describe, expect, test } from "bun:test";
import { Coss, type DedicatedIpPool } from "../src/index.ts";
import { json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_live_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

const samplePool: DedicatedIpPool = {
  object: "dedicated_ip_pool",
  status: "warming",
  ips: [{ ip: "198.51.100.10", delivered_7d: 18_420 }],
  dedicated_share: 0.72,
  message: null,
  created_at: "2026-10-12T09:31:00.000Z",
  ready_at: null,
};

describe("coss.email.dedicatedIps", () => {
  test("get reads the organization's dedicated IPs", async () => {
    const { fetch, calls } = mockFetch(json(200, samplePool));
    const coss = new Coss({ apiKey: API_KEY, baseUrl: "https://api.test", fetch });

    const result = await coss.email.dedicatedIps.get();

    expect(result).toEqual({ data: samplePool, error: null });
    expect(calls[0]).toMatchObject({ method: "GET", url: "https://api.test/v1/dedicated_ips" });
  });
});
