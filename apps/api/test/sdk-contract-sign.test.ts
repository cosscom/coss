/** Contract test: the built SDK's `coss.sign` against the real app, in process. */
import { expect, test } from "bun:test";
import { buildTestPdfBase64 } from "@coss/sign/testing";
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

test("coss.sign uploads documents and creates, sends and cancels requests", async () => {
  const tenant = await createTestTenant();
  const { app } = createTestApp();
  const coss = clientFor(app, tenant.sandboxKey);
  const uploaded = await coss.sign.documents.upload({
    filename: "nda.pdf",
    content: await buildTestPdfBase64(),
  });
  expect(uploaded.error).toBeNull();
  const documentId = uploaded.data?.id ?? "";
  expect(uploaded.data?.anchors.map((anchor) => anchor.text)).toEqual(["{{signature:signer_1}}"]);
  expect((await coss.sign.documents.get(documentId)).data?.id).toBe(documentId);
  expect((await coss.sign.documents.list()).data?.data.map((item) => item.id)).toEqual([
    documentId,
  ]);

  const created = await coss.sign.requests.create({
    title: "NDA",
    documents: [{ document_id: documentId }],
    signers: [
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        delivery: "embedded",
        client_ref: "user_42",
        fields: [
          { type: "signature", anchor: "{{signature:signer_1}}" },
          { type: "date_signed", page: 1, x: 300, y: 100, width: 100, height: 20 },
        ],
      },
    ],
    send: false,
  });
  expect(created.error).toBeNull();
  const id = created.data?.id ?? "";
  expect(created.data).toMatchObject({ status: "draft", sandbox: true });
  expect((await coss.sign.requests.send(id)).data?.status).toBe("sent");
  const session = await coss.sign.sessions.create(id, created.data?.signers[0]?.id ?? "", {
    expires_in: 600,
  });
  expect(session.error).toBeNull();
  expect(session.data?.url).toStartWith("http://localhost:3004/s/sgs_");
  expect((await coss.sign.requests.list({ status: ["sent"] })).data?.data.map((r) => r.id)).toEqual(
    [id],
  );
  expect((await coss.sign.requests.get(id)).data?.signers[0]?.authentication).toBe(
    "customer_asserted",
  );
  expect((await coss.sign.requests.cancel(id)).data?.status).toBe("canceled");
  const trail = await coss.sign.requests.auditTrail(id);
  expect(trail.data?.data.map((event) => event.type)).toEqual(["created", "sent", "canceled"]);

  const inUse = await coss.sign.documents.remove(documentId);
  expect(inUse.error).toMatchObject({ code: "document_in_use" });
});

test("coss.sign.settings reads and updates the environment's settings", async () => {
  const tenant = await createTestTenant();
  const { app } = createTestApp();
  const coss = clientFor(app, tenant.sandboxKey);
  expect((await coss.sign.settings.get()).data).toEqual({
    object: "sign_settings",
    allowed_origins: [],
    display_name: null,
    accent_color: null,
    theme: "system",
    disclosure: null,
  });
  const updated = await coss.sign.settings.update({
    allowed_origins: ["http://localhost:5173"],
    display_name: "Acme",
  });
  expect(updated.data).toMatchObject({
    allowed_origins: ["http://localhost:5173"],
    display_name: "Acme",
  });
  const refused = await coss.sign.settings.update({ allowed_origins: ["ftp://acme.test"] });
  expect(refused.error).toMatchObject({ code: "invalid_origin", param: "allowed_origins" });
});
