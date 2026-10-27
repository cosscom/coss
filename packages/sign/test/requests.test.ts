import { beforeAll, describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { asc, eq } from "drizzle-orm";
import {
  cancelSignRequest,
  createSignService,
  deleteSignDocument,
  FakeDocumentStore,
  getSignDocument,
  getSignRequest,
  inspectPdf,
  listSignDocuments,
  listSignRequestEvents,
  listSignRequests,
  type SignEnvironment,
  SignError,
  sendSignRequest,
  uploadSignDocument,
  verifySignEventChain,
} from "../src/index.ts";
import type { CreateSignRequestRequestOutput } from "../src/schemas.ts";
import { buildTestPdf, buildTestPdfBase64 } from "../src/testing.ts";

const store = new FakeDocumentStore();
const service = createSignService({ store });
const actor = { kind: "api_key" as const, ipAddress: "203.0.113.7", userAgent: "test" };

let tenant: TestTenant;
let live: SignEnvironment;
let sandbox: SignEnvironment;

beforeAll(async () => {
  tenant = await createTestTenant();
  live = {
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    environmentId: tenant.production.id,
    mode: "live",
  };
  sandbox = { ...live, environmentId: tenant.development.id, mode: "sandbox" };
});

async function expectSignError(promise: Promise<unknown>, code: string): Promise<SignError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(SignError);
    expect((error as SignError).code).toBe(code as SignError["code"]);
    return error as SignError;
  }
  throw new Error(`expected a ${code} SignError`);
}

function request(
  overrides: Partial<CreateSignRequestRequestOutput> &
    Pick<CreateSignRequestRequestOutput, "documents">,
): CreateSignRequestRequestOutput {
  return {
    title: "Services agreement",
    signers: [
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        fields: [{ type: "signature", anchor: "{{signature:signer_1}}" }],
      },
    ],
    ...overrides,
  };
}

describe("inspectPdf", () => {
  test("reads page sizes and anchors, top left origin", async () => {
    const pdf = await buildTestPdf([
      { size: [612, 792], lines: ["Hello"] },
      { size: [595, 842], lines: ["Sign: {{signature:signer_1}}", "{{date_signed:signer_1}}"] },
    ]);
    const { pages, anchors } = await inspectPdf(pdf);
    expect(pages).toEqual([
      { width: 612, height: 792 },
      { width: 595, height: 842 },
    ]);
    expect(anchors.map((anchor) => [anchor.text, anchor.page])).toEqual([
      ["{{signature:signer_1}}", 2],
      ["{{date_signed:signer_1}}", 2],
    ]);
    const [signature, date] = anchors;
    // Line 1's baseline is 72 points below the top; its box sits just above it.
    expect(signature?.y).toBeGreaterThan(55);
    expect(signature?.y).toBeLessThan(72);
    expect(signature?.x).toBeGreaterThan(72);
    expect(date?.x).toBe(72);
    expect(date?.y).toBeGreaterThan(signature?.y ?? 0);
    expect(signature?.width).toBeGreaterThan(50);
  });

  test("refuses files that aren't PDFs", async () => {
    await expectSignError(inspectPdf(new TextEncoder().encode("hello")), "invalid_document");
    await expectSignError(
      inspectPdf(new TextEncoder().encode("%PDF-1.7\nnot really")),
      "invalid_document",
    );
  });
});

describe("documents", () => {
  test("upload, read, list and delete", async () => {
    const uploaded = await uploadSignDocument(store, {
      environment: sandbox,
      apiKeyId: null,
      filename: "nda.pdf",
      content: await buildTestPdfBase64(),
    });
    expect(uploaded).toMatchObject({
      object: "sign_document",
      filename: "nda.pdf",
      page_count: 1,
      sandbox: true,
    });
    expect(uploaded.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(uploaded.anchors).toHaveLength(1);
    expect(await getSignDocument({ ...sandbox, documentId: uploaded.id })).toEqual(uploaded);
    // Another environment of the same organization can't see it.
    await expectSignError(getSignDocument({ ...live, documentId: uploaded.id }), "not_found");

    const page = await listSignDocuments({ ...sandbox, limit: 100 });
    expect(page.data.map((document) => document.id)).toContain(uploaded.id);

    await deleteSignDocument(store, { ...sandbox, documentId: uploaded.id });
    await expectSignError(getSignDocument({ ...sandbox, documentId: uploaded.id }), "not_found");
    const objects = await db
      .select({ key: schema.signFakeObject.key })
      .from(schema.signFakeObject)
      .where(eq(schema.signFakeObject.organizationId, sandbox.organizationId));
    expect(objects.some((object) => object.key.includes(uploaded.id))).toBe(false);
  });

  test("a document in use can't be deleted", async () => {
    const document = await uploadSignDocument(store, {
      environment: live,
      apiKeyId: null,
      filename: "msa.pdf",
      content: await buildTestPdfBase64(),
    });
    await service.create({
      environment: live,
      apiKeyId: null,
      actor,
      params: request({ documents: [{ document_id: document.id }] }),
    });
    await expectSignError(
      deleteSignDocument(store, { ...live, documentId: document.id }),
      "document_in_use",
    );
  });
});

describe("signature requests", () => {
  test("created and sent with placed and anchored fields, and a valid audit trail", async () => {
    const { request: created, replayed } = await service.create({
      environment: live,
      apiKeyId: null,
      actor,
      params: request({
        documents: [{ filename: "msa.pdf", content: await buildTestPdfBase64() }],
        signers: [
          {
            name: "Ada Lovelace",
            email: "ada@example.com",
            client_ref: "user_42",
            fields: [
              { type: "signature", anchor: "{{signature:signer_1}}", width: 160, height: 30 },
              { type: "date_signed", page: 1, x: 300, y: 100, width: 100, height: 20 },
            ],
          },
          {
            name: "Charles Babbage",
            email: "charles@example.com",
            delivery: "embedded",
            fields: [{ type: "signature", page: 1, x: 72, y: 600, width: 160, height: 30 }],
          },
        ],
        metadata: { deal: "D-1" },
      }),
    });
    expect(replayed).toBe(false);
    expect(created).toMatchObject({
      status: "sent",
      sandbox: false,
      metadata: { deal: "D-1" },
      signing_order: "parallel",
    });
    expect(created.sent_at).not.toBeNull();
    expect(created.documents).toHaveLength(1);
    expect(
      created.signers.map((signer) => [signer.email, signer.order, signer.authentication]),
    ).toEqual([
      ["ada@example.com", 1, "email_link"],
      ["charles@example.com", 2, "customer_asserted"],
    ]);
    expect(created.signers[0]?.client_ref).toBe("user_42");
    expect(created.fields).toHaveLength(3);
    const anchored = created.fields.find((field) => field.anchor);
    expect(anchored).toMatchObject({ type: "signature", width: 160, height: 30, page: 1 });

    expect(await getSignRequest({ ...live, requestId: created.id })).toEqual(created);

    const events = await listSignRequestEvents({ ...live, requestId: created.id });
    expect(events.map((event) => event.type)).toEqual(["created", "sent"]);
    expect(events[0]?.details.document_sha256).toEqual({
      [created.documents[0]?.id ?? ""]: created.documents[0]?.sha256 ?? "",
    });
    expect(events[0]?.ip_address).toBe("203.0.113.7");
    expect(events[1]?.previous_hash).toBe(events[0]?.hash ?? "");

    const rows = await db
      .select()
      .from(schema.signEvent)
      .where(eq(schema.signEvent.requestId, created.id))
      .orderBy(asc(schema.signEvent.sequence));
    expect(verifySignEventChain(rows)).toBeNull();
    // Tampering with any event breaks the chain from there.
    const tampered = rows.map((row, index) =>
      index === 0 ? { ...row, ipAddress: "198.51.100.1" } : row,
    );
    expect(verifySignEventChain(tampered)).toBe(1);
  });

  test("drafts are sent later, and both can be canceled once", async () => {
    const { request: draft } = await service.create({
      environment: sandbox,
      apiKeyId: null,
      actor,
      params: request({
        documents: [{ filename: "a.pdf", content: await buildTestPdfBase64() }],
        send: false,
      }),
    });
    expect(draft).toMatchObject({ status: "draft", sent_at: null, sandbox: true });
    const sent = await sendSignRequest({ ...sandbox, requestId: draft.id, actor });
    expect(sent.status).toBe("sent");
    // A retried send returns the request as is.
    expect((await sendSignRequest({ ...sandbox, requestId: draft.id, actor })).sent_at).toBe(
      sent.sent_at,
    );
    const canceled = await cancelSignRequest({ ...sandbox, requestId: draft.id, actor });
    expect(canceled.status).toBe("canceled");
    expect((await cancelSignRequest({ ...sandbox, requestId: draft.id, actor })).canceled_at).toBe(
      canceled.canceled_at,
    );
    await expectSignError(
      sendSignRequest({ ...sandbox, requestId: draft.id, actor }),
      "request_not_draft",
    );
    const events = await listSignRequestEvents({ ...sandbox, requestId: draft.id });
    expect(events.map((event) => event.type)).toEqual(["created", "sent", "canceled"]);
  });

  test("validation: fields, anchors, signers, documents and expiry", async () => {
    const content = await buildTestPdfBase64();
    const base = { environment: live, apiKeyId: null, actor };
    const offPage = await expectSignError(
      service.create({
        ...base,
        params: request({
          documents: [{ filename: "a.pdf", content }],
          signers: [
            {
              name: "Ada",
              email: "ada@example.com",
              fields: [{ type: "signature", page: 1, x: 600, y: 10, width: 100, height: 20 }],
            },
          ],
        }),
      }),
      "invalid_fields",
    );
    expect(offPage.param).toBe("signers[0].fields[0]");
    const noPage = await expectSignError(
      service.create({
        ...base,
        params: request({
          documents: [{ filename: "a.pdf", content }],
          signers: [
            {
              name: "Ada",
              email: "ada@example.com",
              fields: [{ type: "signature", page: 2, x: 0, y: 0, width: 10, height: 10 }],
            },
          ],
        }),
      }),
      "invalid_fields",
    );
    expect(noPage.param).toBe("signers[0].fields[0].page");
    await expectSignError(
      service.create({
        ...base,
        params: request({
          documents: [{ filename: "a.pdf", content }],
          signers: [
            {
              name: "Ada",
              email: "ada@example.com",
              fields: [{ type: "signature", anchor: "{{signature:nobody}}" }],
            },
          ],
        }),
      }),
      "invalid_fields",
    );
    const noSignature = await expectSignError(
      service.create({
        ...base,
        params: request({
          documents: [{ filename: "a.pdf", content }],
          signers: [
            {
              name: "Ada",
              email: "ada@example.com",
              fields: [{ type: "text", page: 1, x: 0, y: 0, width: 10, height: 10 }],
            },
          ],
        }),
      }),
      "invalid_fields",
    );
    expect(noSignature.param).toBe("signers[0].fields");
    await expectSignError(
      service.create({
        ...base,
        params: request({
          documents: [{ filename: "a.pdf", content }],
          signers: [
            {
              name: "A",
              email: "Ada@example.com",
              fields: [{ type: "signature", anchor: "{{signature:signer_1}}" }],
            },
            {
              name: "B",
              email: "ada@example.com",
              fields: [{ type: "signature", anchor: "{{signature:signer_1}}" }],
            },
          ],
        }),
      }),
      "invalid_signers",
    );
    await expectSignError(
      service.create({
        ...base,
        params: request({ documents: [{ document_id: "sdoc_01k7c8m4q2f3e9v6t5r1n0p8yz" }] }),
      }),
      "not_found",
    );
    await expectSignError(
      service.create({
        ...base,
        params: request({
          documents: [{ filename: "a.pdf", content }],
          expires_at: new Date(Date.now() - 1000).toISOString(),
        }),
      }),
      "invalid_expiry",
    );
    // Nothing was stored for the refused requests' inline documents.
    const leftovers = await db
      .select({ key: schema.signFakeObject.key })
      .from(schema.signFakeObject)
      .where(eq(schema.signFakeObject.organizationId, live.organizationId));
    const stored = await db
      .select({ key: schema.signDocument.storeKey })
      .from(schema.signDocument)
      .where(eq(schema.signDocument.organizationId, live.organizationId));
    expect(leftovers.map((row) => row.key).sort()).toEqual(stored.map((row) => row.key).sort());
  });

  test("idempotency keys replay the request and keep no second copy", async () => {
    const params = request({
      documents: [{ filename: "a.pdf", content: await buildTestPdfBase64() }],
    });
    const first = await service.create({
      environment: sandbox,
      apiKeyId: null,
      actor,
      params,
      idempotencyKey: "k-1",
    });
    const again = await service.create({
      environment: sandbox,
      apiKeyId: null,
      actor,
      params,
      idempotencyKey: "k-1",
    });
    expect(again.replayed).toBe(true);
    expect(again.request).toEqual(first.request);
    const documents = await db
      .select()
      .from(schema.signDocument)
      .where(eq(schema.signDocument.organizationId, sandbox.organizationId));
    const objects = await db
      .select({ key: schema.signFakeObject.key })
      .from(schema.signFakeObject)
      .where(eq(schema.signFakeObject.organizationId, sandbox.organizationId));
    expect(objects.length).toBe(documents.length);
    await expectSignError(
      service.create({
        environment: sandbox,
        apiKeyId: null,
        actor,
        params: { ...params, title: "Another" },
        idempotencyKey: "k-1",
      }),
      "idempotency_key_reused",
    );
  });

  test("lists newest first with a cursor and a status filter", async () => {
    const content = await buildTestPdfBase64();
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const { request: created } = await service.create({
        environment: live,
        apiKeyId: null,
        actor,
        params: request({ documents: [{ filename: "a.pdf", content }], send: i !== 1 }),
      });
      ids.push(created.id);
    }
    const first = await listSignRequests({ ...live, limit: 2 });
    expect(first.data.map((item) => item.id)).toEqual([ids[2] ?? "", ids[1] ?? ""]);
    expect(first.hasMore).toBe(true);
    const next = await listSignRequests({ ...live, limit: 1, after: ids[1] });
    expect(next.data.map((item) => item.id)).toEqual([ids[0] ?? ""]);
    const drafts = await listSignRequests({ ...live, status: ["draft"], limit: 100 });
    expect(drafts.data.map((item) => item.id)).toContain(ids[1] ?? "");
    expect(drafts.data.every((item) => item.status === "draft")).toBe(true);
  });
});

describe("idempotent replays and expiry", () => {
  test("a replay returns the original even once its expires_at has passed", async () => {
    let now = new Date();
    const clocked = createSignService({ store, now: () => now });
    const params = request({
      documents: [{ filename: "nda.pdf", content: await buildTestPdfBase64() }],
      expires_at: new Date(now.getTime() + 60_000).toISOString(),
    });
    const first = await clocked.create({
      environment: sandbox,
      apiKeyId: null,
      actor,
      params,
      idempotencyKey: "expiring",
    });
    now = new Date(now.getTime() + 120_000);
    const replay = await clocked.create({
      environment: sandbox,
      apiKeyId: null,
      actor,
      params,
      idempotencyKey: "expiring",
    });
    expect(replay).toMatchObject({ replayed: true, request: { id: first.request.id } });
    // A new request with that expiry is refused.
    await expectSignError(
      clocked.create({ environment: sandbox, apiKeyId: null, actor, params }),
      "invalid_expiry",
    );
  });
});
