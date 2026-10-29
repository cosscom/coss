/** Contract test: the built SDK's `coss.verify` against the real app, in process. */
import { expect, test } from "bun:test";
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

test("coss.verify starts, checks, reads and cancels", async () => {
  const tenant = await createTestTenant();
  const { app } = createTestApp();
  const coss = clientFor(app, tenant.sandboxKey);
  const started = await coss.verify.start({ to: "+15005550006", user_id: "user_42" });
  expect(started.error).toBeNull();
  expect(started.data).toMatchObject({ object: "verification", status: "pending", sandbox: true });
  const id = started.data?.id ?? "";

  const wrong = await coss.verify.check({ verification_id: id, code: "123456" });
  expect(wrong.data).toMatchObject({ valid: false, verification: { attempts: 1 } });
  const right = await coss.verify.check({ to: "+15005550006", code: "000000" });
  expect(right.data).toMatchObject({ valid: true, verification: { status: "approved" } });
  expect((await coss.verify.get(id)).data?.status).toBe("approved");
  expect((await coss.verify.list({ status: "approved" })).data?.data.map((v) => v.id)).toEqual([
    id,
  ]);

  const other = await coss.verify.start({ to: "ada@example.com" });
  const canceled = await coss.verify.cancel(other.data?.id ?? "");
  expect(canceled.data?.status).toBe("canceled");
  expect((await coss.verify.cancel(id)).error).toMatchObject({
    code: "verification_not_cancelable",
  });
});
