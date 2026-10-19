/** Contract test: the built SDK's `coss.sms` against the real app, in process. */
import { expect, test } from "bun:test";
import { createTestSmsNumber, testPhoneNumber } from "@coss/sms/testing";
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

test("coss.sms sends, reads, suppresses and lists numbers", async () => {
  const tenant = await createTestTenant();
  const { app, dispatchSms } = createTestApp();
  await createTestSmsNumber(tenant.organization.id, {
    receivingEnvironmentId: tenant.production.id,
  });
  const sandbox = clientFor(app, tenant.sandboxKey);
  const sent = await sandbox.sms.send({
    from: "+14155550123",
    to: "+15005550006",
    body: "Your code is 123456",
    tags: [{ name: "flow", value: "sign_in" }],
  });
  expect(sent.error).toBeNull();
  expect(sent.data).toMatchObject({ object: "sms", status: "queued", sandbox: true });
  await dispatchSms();
  const id = sent.data?.id ?? "";
  expect((await sandbox.sms.get(id)).data?.status).toBe("delivered");
  expect(
    (await sandbox.sms.list({ status: ["delivered"] })).data?.data.map((sms) => sms.id),
  ).toEqual([id]);
  expect((await sandbox.sms.listEvents(id)).data?.data.map((event) => event.type)).toEqual([
    "sms.sent",
    "sms.delivered",
  ]);
  const number = testPhoneNumber();
  const added = await sandbox.sms.suppressions.add({ phone_number: number });
  expect(added.data).toMatchObject({ phone_number: number, reason: "manual" });
  expect((await sandbox.sms.suppressions.check({ phone_number: number })).data?.suppressed).toBe(
    true,
  );
  expect((await sandbox.sms.suppressions.remove(added.data?.id ?? "")).data?.deleted).toBe(true);
  expect((await sandbox.sms.received.list()).data?.data).toEqual([]);
  const numbers = await clientFor(app, tenant.liveKey).sms.numbers.list();
  expect(numbers.data?.data).toMatchObject([{ can_send: true, receives_here: true }]);
  const refused = await clientFor(app, tenant.liveKey).sms.send({
    from: "+14155550123",
    to: "+14155550199",
    body: "Hi",
  });
  expect(refused.error).toMatchObject({ code: "sender_not_found" });
});
