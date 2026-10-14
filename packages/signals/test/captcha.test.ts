import { describe, expect, test } from "bun:test";
import { SITEVERIFY_URLS, verifyCaptcha } from "../src/captcha.ts";

function siteverify(answer: unknown, status = 200) {
  const calls: { url: string; body: string }[] = [];
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: String(init?.body) });
    return Response.json(answer, { status });
  }) as typeof fetch;
  return { fetcher, calls };
}

describe("verifyCaptcha", () => {
  test("posts the secret, token and IP to the provider", async () => {
    const { fetcher, calls } = siteverify({
      success: true,
      hostname: "acme.com",
      action: "signup",
      "error-codes": [],
    });
    const verdict = await verifyCaptcha({
      provider: "turnstile",
      secret: "s3cret",
      token: "tok",
      remoteIp: "203.0.113.7",
      fetch: fetcher,
    });
    expect(verdict).toEqual({
      success: true,
      hostname: "acme.com",
      action: "signup",
      errorCodes: [],
    });
    expect(calls[0]?.url).toBe(SITEVERIFY_URLS.turnstile);
    expect(new URLSearchParams(calls[0]?.body)).toEqual(
      new URLSearchParams({ secret: "s3cret", response: "tok", remoteip: "203.0.113.7" }),
    );
  });

  test("a refused token is success: false with the provider's codes", async () => {
    const { fetcher, calls } = siteverify({
      success: false,
      "error-codes": ["timeout-or-duplicate"],
    });
    expect(
      await verifyCaptcha({ provider: "hcaptcha", secret: "s", token: "t", fetch: fetcher }),
    ).toEqual({
      success: false,
      hostname: null,
      action: null,
      errorCodes: ["timeout-or-duplicate"],
    });
    expect(calls[0]?.url).toBe(SITEVERIFY_URLS.hcaptcha);
  });

  test.each([
    "internal-error",
    "missing-input-secret",
    "invalid-input-secret",
    "bad-request",
    "missing-remoteip",
    "invalid-remoteip",
    "not-using-dummy-passcode",
    "sitekey-secret-mismatch",
  ])("HTTP 200 service/configuration failure %s throws", async (code) => {
    const { fetcher } = siteverify({ success: false, "error-codes": [code] });
    await expect(
      verifyCaptcha({ provider: "turnstile", secret: "s", token: "t", fetch: fetcher }),
    ).rejects.toThrow("service or configuration error");
  });

  test.each([
    "missing-input-response",
    "invalid-input-response",
    "expired-input-response",
    "already-seen-response",
    "timeout-or-duplicate",
  ])("token rejection %s stays a false verdict", async (code) => {
    const { fetcher } = siteverify({ success: false, "error-codes": [code] });
    expect(
      (await verifyCaptcha({ provider: "hcaptcha", secret: "s", token: "t", fetch: fetcher }))
        .success,
    ).toBe(false);
  });

  test.each([null, {}, { success: "false" }])("malformed verdict %j throws", async (answer) => {
    const { fetcher } = siteverify(answer);
    await expect(
      verifyCaptcha({ provider: "turnstile", secret: "s", token: "t", fetch: fetcher }),
    ).rejects.toThrow("invalid verdict");
  });

  test("a provider error throws", async () => {
    const { fetcher } = siteverify({}, 500);
    await expect(
      verifyCaptcha({ provider: "turnstile", secret: "s", token: "t", fetch: fetcher }),
    ).rejects.toThrow("500");
  });
});
