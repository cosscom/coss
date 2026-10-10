import { describe, expect, test } from "bun:test";
import { auth } from "@coss/auth";
import { pool } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { authenticateApiKey } from "../src/index.ts";
import { createTestTenant } from "../src/testing.ts";

/** Signs the owner in and returns request headers carrying the session cookie. */
async function sessionHeaders(email: string, password: string): Promise<Headers> {
  const { headers } = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

describe("authenticateApiKey", () => {
  test("an internal failure inside Better Auth's verify is thrown (503), not reported as invalid", async () => {
    const tenant = await createTestTenant();
    const original = pool.query.bind(pool);
    // Fail only Better Auth's usage-tracking UPDATE; the initial lookup still succeeds.
    pool.query = ((text: unknown, ...rest: unknown[]) => {
      const sql = typeof text === "string" ? text : (text as { text?: string })?.text;
      if (sql?.startsWith('update "apikey"')) return Promise.reject(new Error("simulated outage"));
      return (original as (...args: unknown[]) => unknown)(text, ...rest);
    }) as typeof pool.query;
    try {
      await expect(authenticateApiKey(tenant.sandboxKey)).rejects.toThrow();
    } finally {
      pool.query = original;
    }
    expect((await authenticateApiKey(tenant.sandboxKey)).ok).toBe(true);
  });
});

describe("organization role hooks", () => {
  test("invitations only accept canonical invitable roles", async () => {
    const tenant = await createTestTenant();
    const headers = await sessionHeaders(tenant.owner.email, tenant.owner.password);
    const invite = (role: string) =>
      auth.api.createInvitation({
        headers,
        body: {
          email: `invitee+${uniqueSuffix()}@coss.test`,
          role: role as "member",
          organizationId: tenant.organization.id,
        },
      });

    for (const role of [" owner", "owner", "admin ", "superuser"]) {
      await expect(invite(role)).rejects.toThrow();
    }
    expect((await invite("admin"))?.role).toBe("admin");
    expect((await invite("member"))?.role).toBe("member");
  });
});
