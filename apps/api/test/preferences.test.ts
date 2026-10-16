import { describe, expect, test } from "bun:test";
import { memoryLogWriter } from "@coss/logs/testing";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { createTestApp, errorOf, type TestApp } from "./helpers.ts";

function call(app: TestApp, key: string, method: string, path: string, body?: unknown) {
  return Promise.resolve(
    app.request(path, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

function form(app: TestApp, path: string, fields: Record<string, string>, host?: string) {
  return Promise.resolve(
    app.request(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(host ? { Host: host } : {}),
      },
      body: new URLSearchParams(fields).toString(),
    }),
  );
}

async function contactStatus(app: TestApp, tenant: TestTenant, email: string) {
  const res = await call(
    app,
    tenant.sandboxKey,
    "GET",
    `/v1/contacts/${encodeURIComponent(email)}`,
  );
  return res.status === 404 ? null : ((await res.json()) as { status: string }).status;
}

/** A contact's preference links, through the API. */
async function linksFor(app: TestApp, tenant: TestTenant, email: string, topic?: string) {
  const res = await call(
    app,
    tenant.sandboxKey,
    "POST",
    `/v1/contacts/${encodeURIComponent(email)}/preference_links`,
    topic ? { topic } : {},
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as { preferences_url: string; unsubscribe_url: string };
  return {
    preferences: new URL(body.preferences_url).pathname,
    unsubscribe: new URL(body.unsubscribe_url).pathname,
  };
}

describe("the preference center", () => {
  test("GET shows the page without changing anything; HEAD too", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    await call(app, tenant.sandboxKey, "POST", "/v1/contacts", { email: "ada@example.com" });
    const { preferences, unsubscribe } = await linksFor(app, tenant, "ada@example.com");

    const page = await app.request(preferences);
    expect(page.status).toBe(200);
    expect(page.headers.get("content-type")).toContain("text/html");
    const csp = page.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toMatch(/style-src 'nonce-[^']+'/);
    expect(page.headers.get("cache-control")).toContain("no-store");
    expect(page.headers.get("referrer-policy")).toBe("no-referrer");
    const html = await page.text();
    expect(html).toContain("a•••@example.com");
    expect(html).not.toContain("ada@example.com");
    expect(html).not.toContain("<script");

    for (const path of [preferences, unsubscribe]) {
      expect((await app.request(path, { method: "HEAD" })).status).toBe(200);
      expect((await app.request(path)).status).toBe(200);
    }
    expect(await contactStatus(app, tenant, "ada@example.com")).toBe("subscribed");
  });

  test("an RFC 8058 one-click POST unsubscribes, on any host", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    await call(app, tenant.sandboxKey, "POST", "/v1/contacts", { email: "ada@example.com" });
    const { preferences } = await linksFor(app, tenant, "ada@example.com");
    const res = await form(
      app,
      preferences,
      { "List-Unsubscribe": "One-Click" },
      "links.customer.example",
    );
    expect(res.status).toBe(200);
    expect(await contactStatus(app, tenant, "ada@example.com")).toBe("unsubscribed");
  });

  test("the form saves and redirects; the unsubscribe page takes one POST", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    await call(app, tenant.sandboxKey, "POST", "/v1/topics", {
      key: "news",
      name: "News",
      default_subscription: "opt_in",
    });
    await call(app, tenant.sandboxKey, "POST", "/v1/contacts", { email: "ada@example.com" });
    const { preferences, unsubscribe } = await linksFor(app, tenant, "ada@example.com", "news");
    const saved = await form(app, preferences, {
      action: "save",
      subscribed: "on",
      topics: "news",
    });
    expect(saved.status).toBe(303);
    expect(saved.headers.get("location")).toBe(`${preferences}?saved=1`);
    const topics = await call(
      app,
      tenant.sandboxKey,
      "GET",
      "/v1/contacts/ada%40example.com/topics",
    );
    expect(await topics.json()).toMatchObject({
      topics: [{ topic: "news", subscribed: false, choice: "opted_out" }],
    });

    const done = await form(app, unsubscribe, {});
    expect(done.status).toBe(200);
    expect(await done.text()).toContain("unsubscribed");
  });

  test("request logs never keep preference links (they change consent)", async () => {
    const tenant = await createTestTenant();
    const writer = memoryLogWriter();
    const { app } = createTestApp({ logWriter: writer });
    await call(app, tenant.sandboxKey, "POST", "/v1/contacts", { email: "log@example.com" });
    const links = await linksFor(app, tenant, "log@example.com");
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(writer.entries.length).toBeGreaterThanOrEqual(2);
    const logged = JSON.stringify(writer.entries);
    expect(logged).not.toContain(links.preferences);
    expect(logged).not.toContain(links.unsubscribe);
  });

  test("a bad token is a plain 404, before anything else", async () => {
    const { app } = createTestApp();
    for (const path of ["/t/u/nope", "/t/u/nope/unsubscribe", "/t/u/confirm/nope"]) {
      const res = await app.request(path);
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("text/plain");
    }
  });
});

describe("double opt-in", () => {
  test("needs a confirmation sender, then sends a confirmation the link completes", async () => {
    const tenant = await createTestTenant();
    const { app, queue } = createTestApp();
    const key = tenant.sandboxKey;
    const refused = await call(app, key, "POST", "/v1/contacts", {
      email: "new@example.com",
      double_opt_in: true,
    });
    expect(refused.status).toBe(422);
    expect((await errorOf(refused)).code).toBe("confirmation_sender_required");
    expect(await contactStatus(app, tenant, "new@example.com")).toBeNull();

    await call(app, key, "PATCH", "/v1/marketing_settings", {
      confirmation_from: "Acme <news@acme.test>",
      confirmed_redirect_url: "https://acme.test/welcome",
    });
    const created = await call(app, key, "POST", "/v1/contacts", {
      email: "new@example.com",
      double_opt_in: true,
    });
    expect(created.status).toBe(201);
    const contact = (await created.json()) as { id: string; status: string };
    expect(contact.status).toBe("pending");
    expect(queue.jobs).toHaveLength(1);

    // Resending right away is the daily cooldown.
    const again = await call(app, key, "POST", `/v1/contacts/${contact.id}/confirmation`);
    expect(await again.json()).toMatchObject({ status: "cooldown" });

    // The confirmation's link: the stored email keeps no body, so mint one like the email did.
    const { mintLinkToken, DEVELOPMENT_LINK_KEYS } = await import("@coss/email");
    const token = mintLinkToken(DEVELOPMENT_LINK_KEYS, {
      kind: "confirmation",
      environmentId: tenant.development.id,
      address: "new@example.com",
      emailId: null,
      topic: null,
    });
    const page = await app.request(`/t/u/confirm/${token}`);
    expect(page.status).toBe(200);
    expect(page.headers.get("content-security-policy")).toContain(
      "form-action 'self' https://acme.test",
    );
    expect(await contactStatus(app, tenant, "new@example.com")).toBe("pending");
    const confirmed = await form(app, `/t/u/confirm/${token}`, {});
    expect(confirmed.status).toBe(303);
    expect(confirmed.headers.get("location")).toBe("https://acme.test/welcome");
    expect(await contactStatus(app, tenant, "new@example.com")).toBe("subscribed");
  });
});

describe("marketing sends", () => {
  test("one recipient, no List-Unsubscribe header, and the postal address first", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;
    const send = (body: Record<string, unknown>) =>
      call(app, key, "POST", "/v1/emails", {
        from: "news@acme.test",
        subject: "Sale",
        html: "<p>Sale!</p>",
        stream: "marketing",
        ...body,
      });
    const two = await send({ to: ["a@example.com", "b@example.com"] });
    expect(two.status).toBe(422);
    expect((await errorOf(two)).issues?.[0]?.path).toBe("to");
    const header = await send({
      to: "a@example.com",
      headers: { "List-Unsubscribe": "<mailto:x@example.com>" },
    });
    expect(header.status).toBe(422);
    const noAddress = await send({ to: "a@example.com" });
    expect(noAddress.status).toBe(422);
    expect(await errorOf(noAddress)).toMatchObject({
      code: "mailing_address_required",
      param: "stream",
    });
    await call(app, key, "PATCH", "/v1/marketing_settings", { mailing_address: "1 Main St" });
    const ok = await send({ to: "a@example.com" });
    expect(ok.status).toBe(202);
    expect(await ok.json()).toMatchObject({ stream: "marketing" });
  });
});
