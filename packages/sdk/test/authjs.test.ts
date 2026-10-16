import { describe, expect, test } from "bun:test";
import Coss, { CossSendError } from "../src/authjs.ts";
import { VERSION } from "../src/index.ts";
import { apiError, json, mockFetch, sampleEmail } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

function request(provider: { apiKey?: string; from?: string }) {
  return {
    identifier: "ada@example.com",
    url: "https://acme.com/api/auth/callback/coss?token=abc",
    token: "abc",
    expires: new Date("2026-10-16T00:00:00Z"),
    provider,
    theme: { brandColor: "#000" },
  };
}

describe("Coss (Auth.js provider)", () => {
  test("is an email provider with Auth.js's defaults", () => {
    const provider = Coss({ from: "auth@acme.com" });
    expect(provider).toMatchObject({ id: "coss", type: "email", name: "Email", maxAge: 86_400 });
  });

  test("sends the sign-in link as account mail without tracking", async () => {
    const mock = mockFetch(json(202, sampleEmail));
    const provider = Coss({ from: "Acme <auth@acme.com>", apiKey: API_KEY, fetch: mock.fetch });
    await provider.sendVerificationRequest(request(provider));

    const call = mock.calls[0];
    expect(call?.headers.get("authorization")).toBe(`Bearer ${API_KEY}`);
    expect(call?.headers.get("user-agent")).toBe(`coss-typescript/${VERSION} (authjs)`);
    expect(call?.headers.get("idempotency-key")).toMatch(/^authjs_[0-9a-f]{64}$/);
    const sent = JSON.parse(call?.body ?? "null");
    expect(sent).toMatchObject({
      from: "Acme <auth@acme.com>",
      to: "ada@example.com",
      subject: "Sign in to acme.com",
      category: "account",
      tracking: { opens: false, clicks: false },
    });
    expect(sent.html).toContain('href="https://acme.com/api/auth/callback/coss?token=abc"');
    expect(sent.html).toContain('bgcolor="#000"');
  });

  test("uses the key and sender Auth.js resolved onto the provider (AUTH_COSS_KEY)", async () => {
    const mock = mockFetch(json(202, sampleEmail));
    const provider = Coss({ fetch: mock.fetch });
    await provider.sendVerificationRequest(
      request({ apiKey: "coss_test_from_auth_env", from: "auth@acme.com" }),
    );
    expect(mock.calls[0]?.headers.get("authorization")).toBe("Bearer coss_test_from_auth_env");
  });

  test("render replaces the email", async () => {
    const mock = mockFetch(json(202, sampleEmail));
    const provider = Coss({
      from: "auth@acme.com",
      apiKey: API_KEY,
      fetch: mock.fetch,
      render: ({ url, host }) => ({ subject: `Log in to ${host}`, html: url, text: url }),
    });
    await provider.sendVerificationRequest(request(provider));
    expect(JSON.parse(mock.calls[0]?.body ?? "null").subject).toBe("Log in to acme.com");
  });

  test("needs a sender, and throws CossSendError when coss.com refuses", async () => {
    const mock = mockFetch(
      apiError(401, { type: "authentication_error", code: "invalid_api_key", message: "Bad key." }),
    );
    const provider = Coss({ apiKey: API_KEY, fetch: mock.fetch });
    await expect(provider.sendVerificationRequest(request({}))).rejects.toThrow(/set `from`/);
    const error = await provider
      .sendVerificationRequest(request({ from: "auth@acme.com" }))
      .catch((err: unknown) => err);
    expect(error).toBeInstanceOf(CossSendError);
    expect(error).toMatchObject({ code: "invalid_api_key", status: 401 });
  });
});
