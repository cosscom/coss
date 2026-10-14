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

  test("a provider error throws", async () => {
    const { fetcher } = siteverify({}, 500);
    await expect(
      verifyCaptcha({ provider: "turnstile", secret: "s", token: "t", fetch: fetcher }),
    ).rejects.toThrow("500");
  });
});
