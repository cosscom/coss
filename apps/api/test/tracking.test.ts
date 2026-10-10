import { describe, expect, test } from "bun:test";
import { trackingUrls } from "@coss/email/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { PIXEL_GIF } from "../src/routes/tracking.ts";
import {
  apiRequest,
  createTestApp,
  emailBody,
  errorOf,
  sendEmail,
  type TestApp,
  TRACKING_BASE_URL,
} from "./helpers.ts";

const HTML =
  '<html><body><a href="https://acme.com/a">A</a><a href="https://acme.com/b?x=1&amp;y=2">B</a></body></html>';

/** A request for a tracking URL, by its path (`app.request` ignores the origin). */
function hit(app: TestApp, url: string, method: "GET" | "HEAD" = "GET") {
  return Promise.resolve(
    app.request(url.slice(TRACKING_BASE_URL.length), {
      method,
      headers: { "User-Agent": "TestMail/1.0" },
    }),
  );
}

async function sendTracked(tracking: { opens?: boolean; clicks?: boolean }, html = HTML) {
  const tenant = await createTestTenant();
  const { app, sandboxProvider, dispatch } = createTestApp();
  const res = await sendEmail(app, tenant.sandboxKey, emailBody({ html, tracking }));
  expect(res.status).toBe(202);
  const email = (await res.json()) as { id: string; tracking: Record<string, unknown> };
  await dispatch();
  const urls = trackingUrls(sandboxProvider.sent.at(-1)?.html ?? "");
  return { tenant, app, email, urls };
}

describe("tracking endpoints", () => {
  test("Unicode redirects preserve existing percent escapes for GET and HEAD", async () => {
    const { app, urls } = await sendTracked(
      { clicks: true },
      '<a href="https://example.com/日本?q=a%26b&amp;path=%2F#日本%20">link</a>',
    );
    expect(urls.clicks).toHaveLength(1);
    for (const method of ["HEAD", "GET"] as const) {
      const res = await hit(app, urls.clicks[0] ?? "", method);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(
        "https://example.com/%E6%97%A5%E6%9C%AC?q=a%26b&path=%2F#%E6%97%A5%E6%9C%AC%20",
      );
    }
  });

  test("the pixel is a cross-origin, uncacheable GIF and records one open", async () => {
    const { tenant, app, email, urls } = await sendTracked({ opens: true });
    expect(email.tracking).toMatchObject({ opens: true, clicks: false, open_count: 0 });
    expect(urls.open).toStartWith(`${TRACKING_BASE_URL}/t/o/`);

    const head = await hit(app, urls.open ?? "", "HEAD");
    expect(head.status).toBe(200);
    const res = await hit(app, urls.open ?? "");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/gif");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("cross-origin-resource-policy")).toBe("cross-origin");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PIXEL_GIF);

    const current = await apiRequest(app, "GET", `/v1/emails/${email.id}`, {
      key: tenant.sandboxKey,
    });
    expect(((await current.json()) as typeof email).tracking).toMatchObject({ open_count: 1 });
    const events = await apiRequest(app, "GET", `/v1/emails/${email.id}/events`, {
      key: tenant.sandboxKey,
    });
    const opened = (
      (await events.json()) as { data: { type: string; data: unknown }[] }
    ).data.filter((event) => event.type === "email.opened");
    expect(opened).toEqual([
      expect.objectContaining({ data: { open: { user_agent: "TestMail/1.0" } } }),
    ]);
  });

  test("unknown pixels still get the GIF; other routes keep same-origin CORP", async () => {
    const { app } = createTestApp();
    const res = await app.request(`/t/o/${"x".repeat(32)}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/gif");
    const health = await app.request("/health");
    expect(health.headers.get("cross-origin-resource-policy")).toBe("same-origin");
  });

  test("clicks redirect to the stored link and are listed with their counts", async () => {
    const { tenant, app, email, urls } = await sendTracked({ clicks: true });
    expect(urls.open).toBeNull();
    expect(urls.clicks).toHaveLength(2);

    const head = await hit(app, urls.clicks[1] ?? "", "HEAD");
    expect(head.status).toBe(302);
    const res = await hit(app, urls.clicks[1] ?? "");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://acme.com/b?x=1&y=2");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");

    const links = await apiRequest(app, "GET", `/v1/emails/${email.id}/links`, {
      key: tenant.sandboxKey,
    });
    expect(links.status).toBe(200);
    const body = (await links.json()) as {
      object: string;
      data: { position: number; url: string; click_count: number }[];
      has_more: boolean;
    };
    expect(body.object).toBe("list");
    expect(body.has_more).toBe(false);
    expect(body.data.map((link) => [link.position, link.url, link.click_count])).toEqual([
      [0, "https://acme.com/a", 0],
      [1, "https://acme.com/b?x=1&y=2", 1],
    ]);
  });

  test("unknown links are a plain 404, never the JSON envelope", async () => {
    const { app, urls } = await sendTracked({ clicks: true });
    const base = (urls.clicks[0] ?? "").replace(/\/\d+$/, "");
    for (const path of [`${base}/7`, `${base}/abc`, `${TRACKING_BASE_URL}/t/c/nope/0`]) {
      const res = await hit(app, path);
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toStartWith("text/plain");
      expect(res.headers.get("location")).toBeNull();
    }
  });

  test("malformed stored destinations are a plain 404", async () => {
    const { app, urls } = await sendTracked({ clicks: true }, '<a href="https://[">link</a>');
    expect(urls.clicks).toHaveLength(1);
    const res = await hit(app, urls.clicks[0] ?? "");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toStartWith("text/plain");
    expect(res.headers.get("location")).toBeNull();
  });

  test("tracking endpoints are not in the OpenAPI document", async () => {
    const { app } = createTestApp();
    const doc = (await (await app.request("/openapi.json")).json()) as {
      paths: Record<string, unknown>;
    };
    expect(Object.keys(doc.paths).some((path) => path.startsWith("/t/"))).toBe(false);
  });
});

describe("GET /v1/emails/{id}/links", () => {
  test("needs a key and only sees the key's environment", async () => {
    const { tenant, app, email } = await sendTracked({ clicks: true });
    const other = await createTestTenant();
    const anonymous = await apiRequest(app, "GET", `/v1/emails/${email.id}/links`);
    expect(anonymous.status).toBe(401);
    for (const key of [other.sandboxKey, tenant.liveKey]) {
      const res = await apiRequest(app, "GET", `/v1/emails/${email.id}/links`, { key });
      expect(res.status).toBe(404);
      expect((await errorOf(res)).code).toBe("not_found");
    }
  });

  test("send validates `tracking`", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const res = await sendEmail(
      app,
      tenant.sandboxKey,
      emailBody({ tracking: { opens: "yes" } as unknown as { opens: boolean } }),
    );
    expect(res.status).toBe(422);
    expect((await errorOf(res)).issues?.[0]).toMatchObject({ path: "tracking.opens" });
  });
});
