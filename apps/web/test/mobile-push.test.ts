import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { MobileErrorBody, PushSettings } from "@coss/companion";
import { PUSH_CATEGORIES, type PushCategory } from "@coss/push/schemas";

mock.module("server-only", () => ({}));
mock.module("@sentry/nextjs", () => ({ setTag: () => {}, setUser: () => {} }));

const GOOD_TOKEN = "good-token";
mock.module("@coss/auth", () => ({
  auth: {
    api: {
      getSession: async ({ headers }: { headers: Headers }) =>
        headers.get("cookie") === `session=${GOOD_TOKEN}`
          ? {
              user: { id: "user_1" },
              session: { id: "session_1", ssoProviderId: null, impersonatedBy: null },
            }
          : null,
    },
  },
}));
mock.module("@coss/auth/mobile", () => ({
  mobileSessionHeaders: async (token: string) =>
    token === GOOD_TOKEN ? new Headers({ cookie: `session=${token}` }) : null,
}));
mock.module("@/lib/rate-limit-runtime", () => ({
  rateLimitRuntime: () => ({
    clientIp: () => "203.0.113.9",
    limiter: { consume: async () => ({ allowed: true, retryAfterMs: 0 }) },
  }),
}));

type Device = {
  userId: string;
  sessionId: string;
  token: string;
  apnsEnvironment: string;
  categories: PushCategory[];
};
const devices = new Map<string, Device>();
mock.module("@coss/push", () => ({
  PUSH_CATEGORIES,
  getPushDevice: async (sessionId: string) => devices.get(sessionId) ?? null,
  registerPushDevice: async (
    input: Omit<Device, "categories"> & { categories?: PushCategory[] },
  ) => {
    const device = {
      ...input,
      categories: input.categories ??
        devices.get(input.sessionId)?.categories ?? [...PUSH_CATEGORIES],
    };
    devices.set(input.sessionId, device);
    return device;
  },
  updatePushCategories: async (sessionId: string, categories: PushCategory[]) => {
    const device = devices.get(sessionId);
    if (!device) return null;
    device.categories = categories;
    return device;
  },
  unregisterPushDevice: async (sessionId: string) => {
    devices.delete(sessionId);
  },
}));

const push = await import("../src/app/api/mobile/v1/push/route");

const TOKEN = "ab".repeat(32);

function request(method: string, body?: unknown, bearer: string | null = GOOD_TOKEN): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (bearer) headers.set("authorization", `Bearer ${bearer}`);
  return new Request("http://localhost:3000/api/mobile/v1/push", {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function settingsOf(response: Response): Promise<PushSettings> {
  expect(response.status).toBe(200);
  return (await response.json()) as PushSettings;
}

beforeEach(() => devices.clear());

describe("/api/mobile/v1/push", () => {
  test("needs the app's session", async () => {
    const response = await push.GET(request("GET", undefined, null), undefined);
    expect(response.status).toBe(401);
    const forged = await push.PUT(request("PUT", { token: TOKEN }, "forged"), undefined);
    expect(forged.status).toBe(401);
  });

  test("registers the session's device with every category, then changes them", async () => {
    expect(await settingsOf(await push.GET(request("GET"), undefined))).toEqual({
      registered: false,
      categories: { reputation: true, billing: true, endpoints: true, risk_reviews: true },
    });
    const registered = await settingsOf(
      await push.PUT(
        request("PUT", { token: TOKEN.toUpperCase(), apns_environment: "sandbox" }),
        undefined,
      ),
    );
    expect(registered.registered).toBe(true);
    expect(devices.get("session_1")).toMatchObject({
      userId: "user_1",
      token: TOKEN,
      apnsEnvironment: "sandbox",
    });

    const updated = await settingsOf(
      await push.PATCH(request("PATCH", { categories: ["billing", "reputation"] }), undefined),
    );
    expect(updated.categories).toEqual({
      reputation: true,
      billing: true,
      endpoints: false,
      risk_reviews: false,
    });

    // A refresh (new token after a reinstall) keeps them.
    await push.PUT(
      request("PUT", { token: "cd".repeat(32), apns_environment: "sandbox" }),
      undefined,
    );
    expect(devices.get("session_1")?.categories).toEqual(["billing", "reputation"]);

    const removed = await settingsOf(await push.DELETE(request("DELETE"), undefined));
    expect(removed.registered).toBe(false);
    expect(devices.size).toBe(0);
  });

  test("rejects invalid registrations and changes before registering", async () => {
    for (const body of [
      { token: "not-hex", apns_environment: "sandbox" },
      { token: TOKEN, apns_environment: "development" },
      { token: TOKEN, apns_environment: "sandbox", categories: ["marketing"] },
      { token: TOKEN, apns_environment: "sandbox", extra: true },
    ]) {
      const response = await push.PUT(request("PUT", body), undefined);
      expect(response.status).toBe(400);
      expect(((await response.json()) as MobileErrorBody).error.code).toBe("invalid_request");
    }
    const patch = await push.PATCH(request("PATCH", { categories: ["billing"] }), undefined);
    expect(patch.status).toBe(404);
  });
});
