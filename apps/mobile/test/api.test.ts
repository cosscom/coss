import { describe, expect, mock, test } from "bun:test";
import { createApiClient } from "../src/lib/api";

function client(response: Response | Error, token: string | null = "tok") {
  const onUnauthorized = mock(() => {});
  const fetcher = mock(async (_url: string, _init: RequestInit) => {
    if (response instanceof Error) throw response;
    return response;
  });
  const api = createApiClient({
    baseUrl: "https://coss.com",
    getToken: () => token,
    onUnauthorized,
    fetch: fetcher as unknown as typeof fetch,
  });
  return { api, fetcher, onUnauthorized };
}

describe("API client", () => {
  test("sends the bearer token, never cookies", async () => {
    const { api, fetcher } = client(Response.json({ ok: 1 }));
    expect(await api("/me")).toEqual({ data: { ok: 1 }, error: null });
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://coss.com/api/mobile/v1/me");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer tok");
    expect(init?.credentials).toBe("omit");
  });

  test("a 401 for a replaced credential doesn't forget the new one", async () => {
    let current = "old";
    const onUnauthorized = mock(() => {});
    const api = createApiClient({
      baseUrl: "https://coss.com",
      getToken: () => current,
      onUnauthorized,
      fetch: (async () => {
        current = "new";
        return Response.json({}, { status: 401 });
      }) as unknown as typeof fetch,
    });
    await api("/me");
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  test("a 401 forgets the session", async () => {
    const body = { error: { code: "unauthorized", message: "Sign in again." } };
    const { api, onUnauthorized } = client(Response.json(body, { status: 401 }));
    const result = await api("/me");
    expect(result.error).toEqual({ code: "unauthorized", message: "Sign in again.", status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  test("keeps the page that resolves an access requirement", async () => {
    const body = { error: { code: "sso_required", message: "SSO", url: "/sso?org=acme" } };
    const { api, onUnauthorized } = client(Response.json(body, { status: 403 }));
    expect((await api("/orgs/acme")).error).toMatchObject({
      code: "sso_required",
      url: "/sso?org=acme",
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  test("network failures and non-JSON errors are errors, not exceptions", async () => {
    expect((await client(new TypeError("offline")).api("/me")).error?.code).toBe("network_error");
    const html = new Response("<html>", { status: 502 });
    expect((await client(html).api("/me")).error).toMatchObject({
      code: "internal_error",
      status: 502,
    });
  });
});
