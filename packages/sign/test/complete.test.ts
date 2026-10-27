import { beforeAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { db, schema } from "@coss/db";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { createWebhookEndpoint } from "@coss/webhooks";
import { testManagementDeps } from "@coss/webhooks/testing";
import { asc, eq } from "drizzle-orm";
import { PDFDict, PDFDocument, PDFHexString, PDFName } from "pdf-lib";
import {
  authenticateSignSession,
  consentToSign,
  createSignService,
  createSignSession,
  FakeDocumentStore,
  getSignRequest,
  HttpTsa,
  inspectPdf,
  LocalSealer,
  LocalTsa,
  listSignRequestEvents,
  openSigning,
  readPdfSeal,
  readSignedDocument,
  readTimestampToken,
  runDueSignCompletions,
  type Sealer,
  SIGNATURE_PLACEHOLDER_BYTES,
  type SignEnvironment,
  SignError,
  sealPdf,
  signAsSigner,
  verifySignEventChain,
  verifyTimestampToken,
} from "../src/index.ts";
import type { CreateSignRequestRequestOutput } from "../src/schemas.ts";
import { asn1js, OID, pkijs, sha256, toArrayBuffer } from "../src/seal/crypto.ts";
import { buildTestPdfBase64, TEST_SIGNATURE_PNG } from "../src/testing.ts";

const store = new FakeDocumentStore();
const service = createSignService({ store });
const actor = { kind: "signer" as const, ipAddress: "198.51.100.4", userAgent: "Firefox" };

let tenant: TestTenant;
let sandbox: SignEnvironment;
let sealer: LocalSealer;
let tsa: LocalTsa;

beforeAll(async () => {
  tenant = await createTestTenant();
  sandbox = {
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    environmentId: tenant.development.id,
    mode: "sandbox",
  };
  sealer = await LocalSealer.create();
  tsa = await LocalTsa.create();
});

const scope = () => ({ organizationIds: [tenant.organization.id] });

/** Creates a request for one embedded signer and signs it through a session. */
async function signedRequest(
  params: Partial<CreateSignRequestRequestOutput>,
  values: (
    fields: { id: string; type: string; label: string | null }[],
  ) => Record<string, string | boolean> = () => ({}),
  env: SignEnvironment = sandbox,
) {
  const { request } = await service.create({
    environment: env,
    apiKeyId: null,
    actor: { kind: "api_key" },
    params: {
      title: "Services agreement",
      documents: [{ filename: "msa.pdf", content: await buildTestPdfBase64() }],
      signers: [
        {
          name: "Ada Lovelace",
          email: "ada@example.com",
          delivery: "embedded",
          fields: [{ type: "signature", anchor: "{{signature:signer_1}}" }],
        },
      ],
      ...params,
    },
  });
  for (const signer of request.signers) {
    const session = await createSignSession({
      ...env,
      requestId: request.id,
      signerId: signer.id,
      signUrl: "https://sign.test",
      apiKeyId: null,
    });
    const access = await authenticateSignSession({ id: session.id, token: session.token });
    if (!access) throw new Error("no session");
    const view = await openSigning(access, { actor });
    await consentToSign(access, { disclosureSha256: view.disclosure.sha256, actor });
    await signAsSigner(access, {
      values: values(view.fields),
      signature: TEST_SIGNATURE_PNG,
      initials: TEST_SIGNATURE_PNG,
      actor,
      store,
    });
  }
  return request;
}

async function verifyCms(cms: Uint8Array, signedBytes: Uint8Array): Promise<boolean> {
  const contentInfo = pkijs.ContentInfo.fromBER(toArrayBuffer(cms));
  const signedData = new pkijs.SignedData({ schema: contentInfo.content });
  try {
    return await signedData.verify({
      signer: 0,
      data: toArrayBuffer(signedBytes),
      checkChain: false,
    });
  } catch {
    // pkijs throws (rather than answering false) when the digest doesn't match.
    return false;
  }
}

describe("completion", () => {
  test("seals the completed document, records `sealed` and sends sign_request.completed", async () => {
    const { endpoint } = await createWebhookEndpoint(
      {
        organizationId: sandbox.organizationId,
        environmentId: sandbox.environmentId,
        url: "https://hooks.example.com/sign",
        eventTypes: ["sign_request.completed"],
        apiVersion: "2026-10-10",
        userId: null,
      },
      testManagementDeps,
    );
    const request = await signedRequest({});
    const completed = await getSignRequest({ ...sandbox, requestId: request.id });
    expect(completed.status).toBe("completed");
    expect(completed.signed_document).toBeNull();
    await expect(readSignedDocument({ ...sandbox, requestId: request.id, store })).rejects.toThrow(
      SignError,
    );

    expect(await runDueSignCompletions({ limit: 10, scope: scope() }, { store, sealer, tsa })).toBe(
      1,
    );
    // Nothing left to do.
    expect(await runDueSignCompletions({ limit: 10, scope: scope() }, { store, sealer, tsa })).toBe(
      0,
    );

    const sealed = await getSignRequest({ ...sandbox, requestId: request.id });
    expect(sealed.signed_document?.sha256).toMatch(/^[0-9a-f]{64}$/);
    const { content, filename } = await readSignedDocument({
      ...sandbox,
      requestId: request.id,
      store,
    });
    expect(filename).toBe("Services agreement (signed).pdf");
    expect(createHash("sha256").update(content).digest("hex")).toBe(
      sealed.signed_document?.sha256 ?? "",
    );

    // The seal covers everything but its own placeholder, and verifies.
    const seal = readPdfSeal(content);
    expect(seal.byteRange[0]).toBe(0);
    expect(seal.byteRange[2] + seal.byteRange[3]).toBe(content.length);
    expect(await verifyCms(seal.cms, seal.signedBytes)).toBe(true);
    // One changed byte breaks it.
    const tampered = new Uint8Array(seal.signedBytes);
    tampered[100] = (tampered[100] ?? 0) ^ 1;
    expect(await verifyCms(seal.cms, tampered)).toBe(false);

    // The timestamp is over the signature value.
    const signedData = new pkijs.SignedData({
      schema: pkijs.ContentInfo.fromBER(toArrayBuffer(seal.cms)).content,
    });
    const signer = signedData.signerInfos[0];
    const token = signer?.unsignedAttrs?.attributes.find(
      (attribute) => attribute.type === OID.signatureTimeStampToken,
    );
    expect(token).toBeDefined();
    const tokenValue = token?.values[0] as asn1js.Sequence | undefined;
    if (!tokenValue) throw new Error("no timestamp token");
    const tokenDer = new Uint8Array(tokenValue.toBER(false));
    readTimestampToken(
      tokenDer,
      await sha256(new Uint8Array(signer?.signature.valueBlock.valueHexView ?? [])),
    );

    // The completed document: the original page, then the certificate.
    const inspected = await inspectPdf(content);
    expect(inspected.pages.length).toBeGreaterThan(1);

    const events = await listSignRequestEvents({ ...sandbox, requestId: request.id });
    expect(events.map((event) => event.type).slice(-3)).toEqual(["signed", "completed", "sealed"]);
    expect(events.at(-1)?.details.signed_document_sha256).toBe(sealed.signed_document?.sha256);
    const rows = await db
      .select()
      .from(schema.signEvent)
      .where(eq(schema.signEvent.requestId, request.id))
      .orderBy(asc(schema.signEvent.sequence));
    expect(verifySignEventChain(rows)).toBeNull();

    const messages = await db
      .select({ type: schema.webhookMessage.type, payload: schema.webhookMessage.payload })
      .from(schema.webhookDelivery)
      .innerJoin(
        schema.webhookMessage,
        eq(schema.webhookMessage.id, schema.webhookDelivery.messageId),
      )
      .where(eq(schema.webhookDelivery.endpointId, endpoint.id));
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      type: "sign_request.completed",
      payload: { data: { sign_request_id: request.id, status: "completed" } },
    });
  });

  test("values land in their boxes on rotated pages", async () => {
    // A text field's value written as an anchor: inspecting the result finds where it landed.
    const pages = [0, 90, 180, 270] as const;
    const request = await signedRequest(
      {
        documents: [
          {
            filename: "rotated.pdf",
            content: await buildTestPdfBase64([
              { lines: ["Signature: {{signature:signer_1}}"] },
              ...pages.slice(1).map((rotate) => ({ rotate, lines: [] })),
            ]),
          },
        ],
        signers: [
          {
            name: "Ada Lovelace",
            email: "ada@example.com",
            delivery: "embedded",
            fields: [
              { type: "signature", anchor: "{{signature:signer_1}}" },
              ...pages.map((rotation, index) => ({
                type: "text" as const,
                page: index + 1,
                x: 100,
                y: 150,
                width: 300,
                height: 24,
                label: `r${rotation}`,
              })),
            ],
          },
        ],
      },
      (fields) =>
        Object.fromEntries(
          fields
            .filter((field) => field.type === "text")
            .map((field) => [field.id, `{{text:${field.label}}}`]),
        ),
    );
    await runDueSignCompletions({ limit: 10, scope: scope() }, { store, sealer, tsa: null });
    const { content } = await readSignedDocument({ ...sandbox, requestId: request.id, store });
    const inspected = await inspectPdf(content);
    for (const [index, rotation] of pages.entries()) {
      const anchor = inspected.anchors.find(
        (candidate) => candidate.text === `{{text:r${rotation}}}`,
      );
      expect({ rotation, page: anchor?.page }).toEqual({ rotation, page: index + 1 });
      // Inside the box (100, 150, 300 × 24), as displayed.
      expect(anchor?.x ?? 0).toBeGreaterThanOrEqual(100);
      expect(anchor?.x ?? 0).toBeLessThan(110);
      expect(anchor?.y ?? 0).toBeGreaterThanOrEqual(149);
      expect((anchor?.y ?? 0) + (anchor?.height ?? 0)).toBeLessThanOrEqual(175);
    }
  });

  test("values land in their boxes when the crop box reaches past the page", async () => {
    // Shown (by pdf.js, and so to the signer) is the crop box within the media box.
    const request = await signedRequest(
      {
        documents: [
          {
            filename: "cropped.pdf",
            content: await buildTestPdfBase64([
              {
                lines: ["Signature: {{signature:signer_1}}"],
                cropBox: [-100, -100, 812, 992],
              },
            ]),
          },
        ],
        signers: [
          {
            name: "Ada Lovelace",
            email: "ada@example.com",
            delivery: "embedded",
            fields: [
              { type: "signature", anchor: "{{signature:signer_1}}" },
              { type: "text", page: 1, x: 100, y: 150, width: 300, height: 24, label: "c" },
            ],
          },
        ],
      },
      (fields) =>
        Object.fromEntries(
          fields.filter((field) => field.type === "text").map((field) => [field.id, "{{text:c}}"]),
        ),
    );
    await runDueSignCompletions({ limit: 10, scope: scope() }, { store, sealer, tsa: null });
    const { content } = await readSignedDocument({ ...sandbox, requestId: request.id, store });
    const anchor = (await inspectPdf(content)).anchors.find((a) => a.text === "{{text:c}}");
    expect(anchor?.x ?? 0).toBeGreaterThanOrEqual(100);
    expect(anchor?.x ?? 0).toBeLessThan(110);
    expect(anchor?.y ?? 0).toBeGreaterThanOrEqual(149);
    expect((anchor?.y ?? 0) + (anchor?.height ?? 0)).toBeLessThanOrEqual(175);
  });

  test("seal text with parentheses and backslashes stays a valid dictionary", async () => {
    const document = await PDFDocument.create();
    document.addPage([200, 200]);
    const reason = "Agreement (draft \\ v2";
    const bytes = await sealPdf(document, {
      sealer,
      name: "coss.com",
      reason,
      location: "Room (1",
      signedAt: new Date(),
    });
    const reloaded = await PDFDocument.load(bytes);
    const field = reloaded.getForm().getFields()[0];
    const value = field?.acroField.dict.lookup(PDFName.of("V"), PDFDict);
    expect(value?.lookup(PDFName.of("Reason"), PDFHexString).decodeText()).toBe(reason);
    const seal = readPdfSeal(bytes);
    expect(await verifyCms(seal.cms, seal.signedBytes)).toBe(true);
  });

  test("a document holding a string like the seal's placeholder keeps it, and the seal verifies", async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([200, 200]);
    const decoy = "0".repeat(SIGNATURE_PLACEHOLDER_BYTES * 2);
    page.node.set(PDFName.of("Decoy"), PDFHexString.of(decoy));
    const bytes = await sealPdf(document, {
      sealer,
      name: "coss.com",
      reason: "Test",
      signedAt: new Date(),
    });
    const seal = readPdfSeal(bytes);
    expect(await verifyCms(seal.cms, seal.signedBytes)).toBe(true);
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPage(0).node.lookup(PDFName.of("Decoy"), PDFHexString).asString()).toBe(
      decoy,
    );
  });

  test("a TSA over HTTP: only tokens that verify; nonces compared as numbers", async () => {
    const digest = new Uint8Array(await sha256(new TextEncoder().encode("seal")));
    const http = new HttpTsa("https://tsa.test", tsa.fetch);
    const token = await http.timestamp(digest);
    await verifyTimestampToken(token);

    // An answer altered on the way (one byte of the token's signature, at its end).
    const altered = (async (input: unknown, init?: RequestInit) => {
      const response = await tsa.fetch(input as string, init);
      const bytes = new Uint8Array(await response.arrayBuffer());
      bytes[bytes.length - 3] = (bytes[bytes.length - 3] ?? 0) ^ 1;
      return new Response(bytes);
    }) as typeof fetch;
    await expect(new HttpTsa("https://tsa.test", altered).timestamp(digest)).rejects.toThrow(
      "doesn't verify",
    );

    // A nonce sent with a leading zero byte, answered in minimal DER.
    const minimal = await tsa.timestamp(
      digest,
      new asn1js.Integer({ valueHex: new Uint8Array([0x12, 0x34]).buffer }),
    );
    expect(() =>
      readTimestampToken(minimal, digest, new Uint8Array([0, 0x12, 0x34])),
    ).not.toThrow();
  });

  test("an organization being deleted gets no seal, even one already in progress", async () => {
    const own = await createTestTenant();
    const env: SignEnvironment = {
      organizationId: own.organization.id,
      projectId: own.project.id,
      environmentId: own.development.id,
      mode: "sandbox",
    };
    const request = await signedRequest({}, () => ({}), env);
    const ownScope = { organizationIds: [own.organization.id] };
    // Deletion is requested while the seal is being made.
    const racing: Sealer = {
      name: "racing",
      certificateChain: sealer.certificateChain,
      sign: async (data) => {
        await db.insert(schema.organizationDeletion).values({
          organizationId: own.organization.id,
          organizationName: own.organization.name,
          organizationSlug: own.organization.slug,
          requestedByEmail: "owner@example.com",
          nextAttemptAt: null,
        });
        return sealer.sign(data);
      },
    };
    await runDueSignCompletions({ limit: 5, scope: ownScope }, { store, sealer: racing });
    const [row] = await db
      .select({ key: schema.signRequest.signedDocumentKey })
      .from(schema.signRequest)
      .where(eq(schema.signRequest.id, request.id));
    expect(row?.key).toBeNull();
    const objects = await db
      .select({ key: schema.signFakeObject.key })
      .from(schema.signFakeObject)
      .where(eq(schema.signFakeObject.organizationId, own.organization.id));
    expect(objects.filter((object) => object.key.includes("/requests/"))).toEqual([]);
    // And it isn't claimed again.
    const later = new Date(Date.now() + 60 * 60_000);
    expect(
      await runDueSignCompletions({ limit: 5, now: later, scope: ownScope }, { store, sealer }),
    ).toBe(0);
  });

  test("a failed seal is retried later, not at once", async () => {
    const request = await signedRequest({});
    const broken: Sealer = {
      name: "broken",
      certificateChain: sealer.certificateChain,
      sign: async () => {
        throw new Error("KMS is down");
      },
    };
    const now = new Date();
    expect(
      await runDueSignCompletions({ limit: 10, now, scope: scope() }, { store, sealer: broken }),
    ).toBe(1);
    const [row] = await db
      .select()
      .from(schema.signRequest)
      .where(eq(schema.signRequest.id, request.id));
    expect(row).toMatchObject({ sealError: "KMS is down", sealAttempts: 1, sealLeaseUntil: null });
    expect(await runDueSignCompletions({ limit: 10, now, scope: scope() }, { store, sealer })).toBe(
      0,
    );
    const later = new Date(now.getTime() + 2 * 60_000);
    expect(
      await runDueSignCompletions({ limit: 10, now: later, scope: scope() }, { store, sealer }),
    ).toBe(1);
    expect(
      (await getSignRequest({ ...sandbox, requestId: request.id })).signed_document,
    ).not.toBeNull();
  });
});

describe("completion races and long values", () => {
  test("a long value wraps inside its box", async () => {
    const words = Array.from({ length: 24 }, () => "{{text:w}}").join(" ");
    const request = await signedRequest(
      {
        signers: [
          {
            name: "Ada Lovelace",
            email: "ada@example.com",
            delivery: "embedded",
            fields: [
              { type: "signature", anchor: "{{signature:signer_1}}" },
              { type: "text", page: 1, x: 100, y: 300, width: 200, height: 60 },
            ],
          },
        ],
      },
      (fields) =>
        Object.fromEntries(
          fields.filter((field) => field.type === "text").map((field) => [field.id, words]),
        ),
    );
    await runDueSignCompletions({ limit: 10, scope: scope() }, { store, sealer, tsa: null });
    const { content } = await readSignedDocument({ ...sandbox, requestId: request.id, store });
    const inspected = await inspectPdf(content);
    const drawn = inspected.anchors.filter(
      (anchor) => anchor.text === "{{text:w}}" && anchor.page === 1,
    );
    expect(drawn.length).toBeGreaterThan(1);
    for (const anchor of drawn) {
      expect(anchor.x).toBeGreaterThanOrEqual(99);
      expect(anchor.x + anchor.width).toBeLessThanOrEqual(301);
      expect(anchor.y).toBeGreaterThanOrEqual(299);
      expect(anchor.y + anchor.height).toBeLessThanOrEqual(361);
    }
  });

  test("a worker that lost its lease leaves the new holder's lease and no copy of its own", async () => {
    const request = await signedRequest({});
    const takeOver = (async () => {
      await db
        .update(schema.signRequest)
        .set({ sealLeaseUntil: new Date(Date.now() + 3_600_000) })
        .where(eq(schema.signRequest.id, request.id));
    }) as () => Promise<void>;
    const racing: Sealer = {
      name: "racing",
      certificateChain: sealer.certificateChain,
      sign: async (data) => {
        await takeOver();
        return sealer.sign(data);
      },
    };
    await runDueSignCompletions({ limit: 10, scope: scope() }, { store, sealer: racing });
    const [row] = await db
      .select()
      .from(schema.signRequest)
      .where(eq(schema.signRequest.id, request.id));
    expect(row?.sealedAt).toBeNull();
    expect(row?.sealLeaseUntil).not.toBeNull();
    const copies = await db
      .select({ key: schema.signFakeObject.key })
      .from(schema.signFakeObject)
      .where(eq(schema.signFakeObject.organizationId, sandbox.organizationId));
    expect(copies.filter((object) => object.key.includes(`/requests/${request.id}/`))).toEqual([]);

    // A failing worker whose lease was taken over doesn't clear the new one either.
    await db
      .update(schema.signRequest)
      .set({ sealLeaseUntil: null })
      .where(eq(schema.signRequest.id, request.id));
    const failing: Sealer = {
      name: "failing",
      certificateChain: sealer.certificateChain,
      sign: async () => {
        await takeOver();
        throw new Error("KMS is down");
      },
    };
    await runDueSignCompletions({ limit: 10, scope: scope() }, { store, sealer: failing });
    const [after] = await db
      .select()
      .from(schema.signRequest)
      .where(eq(schema.signRequest.id, request.id));
    expect(after?.sealLeaseUntil).not.toBeNull();
    expect(after?.sealError).toBeNull();
  });
});
