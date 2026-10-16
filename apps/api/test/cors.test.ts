import { describe, expect, test } from "bun:test";
import { createTestTenant } from "@coss/tenancy/testing";
import { createTestApp, emailBody, errorOf, sendEmail } from "./helpers.ts";

const DOCS = "https://coss.com";

function preflight(app: ReturnType<typeof createTestApp>["app"], origin: string) {
  return app.request("/v1/emails", {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization, content-type, idempotency-key",
    },
  });
}

describe("CORS", () => {
  test("a preflight from an allowed origin may send the key and an Idempotency-Key", async () => {
    const { app } = createTestApp({ corsOrigins: [DOCS] });
    const res = await preflight(app, DOCS);

    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(DOCS);
    expect(res.headers.get("access-control-allow-headers")).toBe(
      "Authorization,Content-Type,Idempotency-Key,Coss-Version",
    );
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    // Bearer keys only: browsers must never send cookies along.
    expect(res.headers.get("access-control-allow-credentials")).toBeNull();
  });

  test("a preflight allows every method the API uses, PUT included (template drafts)", async () => {
    const { app } = createTestApp({ corsOrigins: [DOCS] });
    const res = await app.request("/v1/email_templates/welcome/draft", {
      method: "OPTIONS",
      headers: {
        Origin: DOCS,
        "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "authorization, content-type",
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-methods")?.split(",")).toEqual([
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ]);
  });

  test("other origins, and every origin by default, get no CORS headers", async () => {
    const allowList = createTestApp({ corsOrigins: [DOCS] }).app;
    const byDefault = createTestApp().app;

    for (const res of [
      await preflight(allowList, "https://evil.example"),
      await preflight(byDefault, DOCS),
    ]) {
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    }
  });

  test("successes and error envelopes are readable by an allowed origin", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp({ corsOrigins: [DOCS] });
    const origin = { Origin: DOCS };

    const ok = await sendEmail(app, tenant.sandboxKey, emailBody(), origin);
    const unauthorized = await sendEmail(app, null, emailBody(), origin);
    const invalid = await sendEmail(app, tenant.sandboxKey, emailBody({ subject: "" }), origin);

    expect([ok.status, unauthorized.status, invalid.status]).toEqual([202, 401, 422]);
    for (const res of [ok, unauthorized, invalid]) {
      expect(res.headers.get("access-control-allow-origin")).toBe(DOCS);
      expect(res.headers.get("access-control-expose-headers")).toBe(
        "X-Request-Id,Idempotent-Replayed,Retry-After,Coss-Version",
      );
    }
    await errorOf(unauthorized);
  });

  test("only applies to /v1", async () => {
    const { app } = createTestApp({ corsOrigins: [DOCS] });
    const res = await app.request("/health", { headers: { Origin: DOCS } });

    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
