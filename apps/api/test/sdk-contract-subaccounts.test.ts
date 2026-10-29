/** Contract test: the built SDK's `coss.email.subaccounts` against the real app, in process. */
import { describe, expect, test } from "bun:test";
import { createTestTenant } from "@coss/tenancy/testing";
import { Coss } from "coss";
import { createTestApp, type TestApp } from "./helpers.ts";

function clientFor(app: TestApp, apiKey: string): Coss {
  return new Coss({
    apiKey,
    baseUrl: "http://api.test",
    fetch: (input, init) =>
      Promise.resolve(
        app.fetch(
          input instanceof Request ? new Request(input, init) : new Request(String(input), init),
        ),
      ),
  });
}

describe("coss.email.subaccounts against the API", () => {
  test("create, get by uid, update, list and delete", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const coss = clientFor(app, tenant.sandboxKey);

    const created = await coss.email.subaccounts.create({
      name: "Acme Bakery",
      uid: "user_1",
      quotas: { recipients_per_day: 100 },
    });
    if (!created.data) throw new Error(`create failed: ${created.error?.message}`);
    expect(created.data).toMatchObject({ object: "subaccount", status: "active" });

    const fetched = await coss.email.subaccounts.get("user_1");
    expect(fetched.data?.id).toBe(created.data.id);

    const updated = await coss.email.subaccounts.update("user_1", {
      quotas: { recipients_per_second: 2, burst: 4 },
    });
    expect(updated.data?.quotas).toEqual({
      recipients_per_day: 100,
      recipients_per_second: 2,
      burst: 4,
    });

    const list = await coss.email.subaccounts.list({ limit: 10 });
    expect(list.data?.data.map((row) => row.id)).toEqual([created.data.id]);

    const deleted = await coss.email.subaccounts.delete("user_1");
    expect(deleted.data?.status).toBe("deleting");

    const missing = await coss.email.subaccounts.get("nobody");
    expect(missing.error).toMatchObject({ type: "not_found_error", code: "subaccount_not_found" });
  });
});
