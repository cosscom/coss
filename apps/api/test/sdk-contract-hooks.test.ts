/** Contract test: the built SDK's `coss.hooks` against the real app, in process. */
import { describe, expect, test } from "bun:test";
import { runDueHookDeliveries } from "@coss/hooks";
import { testHookDeliveryDeps } from "@coss/hooks/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { webhookReceiver } from "@coss/webhooks/testing";
import { Coss, verifyWebhook } from "coss";
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

describe("coss.hooks against the API", () => {
  test("an application's user receives a signed message they can verify with the secret", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const coss = clientFor(app, tenant.sandboxKey);
    const receiver = webhookReceiver();
    try {
      const type = await coss.hooks.eventTypes.create({
        name: "invoice.paid",
        description: "An invoice was paid.",
        examples: [{ invoice_id: "in_1" }],
      });
      expect(type.error).toBeNull();
      const application = await coss.hooks.applications.create({ name: "Acme", uid: "acme" });
      expect(application.data).toMatchObject({ uid: "acme" });
      const endpoint = await coss.hooks.endpoints.create("acme", {
        url: receiver.url,
        filter_types: ["invoice.paid"],
      });
      if (!endpoint.data) throw new Error(`create failed: ${endpoint.error?.message}`);

      const sent = await coss.hooks.messages.send({
        application: "acme",
        event_type: "invoice.paid",
        payload: { invoice_id: "in_1", amount: 4200 },
      });
      if (!sent.data) throw new Error(`send failed: ${sent.error?.message}`);
      expect(
        await runDueHookDeliveries(
          { scope: { organizationIds: [tenant.organization.id] } },
          testHookDeliveryDeps(),
        ),
      ).toBe(1);

      const [request] = receiver.received;
      if (!request) throw new Error("nothing received");
      const headers = Object.fromEntries(request.headers.entries());
      expect(
        await verifyWebhook<Record<string, unknown>>(request.body, headers, endpoint.data.secret),
      ).toEqual({
        invoice_id: "in_1",
        amount: 4200,
      });

      const deliveries = await coss.hooks.messages.listDeliveries("acme", sent.data.id);
      const [delivery] = deliveries.data?.data ?? [];
      expect(delivery).toMatchObject({ status: "succeeded", endpoint_id: endpoint.data.id });
      if (!delivery) throw new Error("no delivery");
      const attempts = await coss.hooks.deliveries.listAttempts("acme", delivery.id);
      expect(attempts.data?.data).toHaveLength(1);
      expect((await coss.hooks.messages.list("acme")).data?.data.map((m) => m.id)).toEqual([
        sent.data.id,
      ]);
      const session = await coss.hooks.portal.createSession({ application: "acme" });
      expect(session.data?.url).toContain(`/s/${session.data?.id}#cossp_`);
      expect((await coss.hooks.eventTypes.archive("invoice.paid")).data).toMatchObject({
        archived: true,
      });
      const missing = await coss.hooks.applications.get("nobody");
      expect(missing.error).toMatchObject({ status: 404, code: "application_not_found" });
    } finally {
      receiver.stop();
    }
  });
});
