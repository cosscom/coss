import { beforeAll, describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { createWebhookEndpoint } from "@coss/webhooks";
import { testManagementDeps } from "@coss/webhooks/testing";
import { and, asc, eq } from "drizzle-orm";
import {
  authenticateSignSession,
  checkedSignOrigin,
  consentToSign,
  createSignService,
  createSignSession,
  declineAsSigner,
  decodeSignatureImage,
  FakeDocumentStore,
  findSignSession,
  getSignRequest,
  getSignSettings,
  listSignRequestEvents,
  openSigning,
  readSigningDocument,
  type SignEnvironment,
  SignError,
  signAsSigner,
  updateSignSettings,
  verifySignEventChain,
} from "../src/index.ts";
import type { CreateSignRequestRequestOutput } from "../src/schemas.ts";
import { buildTestPdfBase64, TEST_SIGNATURE_PNG } from "../src/testing.ts";

const store = new FakeDocumentStore();
const service = createSignService({ store });
const apiActor = { kind: "api_key" as const };
const signerActor = { kind: "signer" as const, ipAddress: "198.51.100.4", userAgent: "Firefox" };
const SIGN_URL = "https://sign.example";

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

const signer = (
  name: string,
  email: string,
  extra: Partial<CreateSignRequestRequestOutput["signers"][number]> = {},
): CreateSignRequestRequestOutput["signers"][number] => ({
  name,
  email,
  delivery: "embedded",
  fields: [{ type: "signature", page: 1, x: 72, y: 600, width: 160, height: 30 }],
  ...extra,
});

async function createRequest(
  env: SignEnvironment,
  params: Partial<CreateSignRequestRequestOutput> = {},
) {
  const { request } = await service.create({
    environment: env,
    apiKeyId: null,
    actor: apiActor,
    params: {
      title: "Services agreement",
      documents: [{ filename: "msa.pdf", content: await buildTestPdfBase64() }],
      signers: [signer("Ada Lovelace", "ada@example.com")],
      ...params,
    },
  });
  return request;
}

async function session(env: SignEnvironment, requestId: string, signerId: string) {
  const created = await createSignSession({
    organizationId: env.organizationId,
    environmentId: env.environmentId,
    requestId,
    signerId,
    signUrl: SIGN_URL,
    apiKeyId: null,
  });
  const access = await authenticateSignSession({ id: created.id, token: created.token });
  if (!access) throw new Error("session didn't authenticate");
  return { created, access };
}

describe("sessions", () => {
  test("a link with the id in the path and the token in the fragment", async () => {
    const request = await createRequest(sandbox);
    const signerId = request.signers[0]?.id ?? "";
    const { created } = await session(sandbox, request.id, signerId);
    expect(created.url).toBe(`${SIGN_URL}/s/${created.id}#${created.token}`);
    expect(created.token.startsWith("cosss_")).toBe(true);
    // Only the hash is stored.
    const row = await findSignSession(created.id);
    expect(row?.tokenHash).not.toContain(created.token);
  });

  test("wrong tokens, unknown ids and expired sessions don't authenticate", async () => {
    const request = await createRequest(sandbox);
    const signerId = request.signers[0]?.id ?? "";
    const { created } = await session(sandbox, request.id, signerId);
    expect(await authenticateSignSession({ id: created.id, token: "cosss_wrong" })).toBeNull();
    expect(
      await authenticateSignSession({ id: "sgs_01k7c8m4q2f3e9v6t5r1n0p8yz", token: created.token }),
    ).toBeNull();
    const later = new Date(Date.now() + 2 * 60 * 60 * 1000);
    expect(
      await authenticateSignSession({ id: created.id, token: created.token, now: later }),
    ).toBeNull();
  });

  test("only embedded signers of sent requests get one", async () => {
    const byEmail = await createRequest(sandbox, {
      signers: [signer("Ada Lovelace", "ada@example.com", { delivery: "email" })],
    });
    await expectSignError(
      createSignSession({
        ...sandbox,
        requestId: byEmail.id,
        signerId: byEmail.signers[0]?.id ?? "",
        signUrl: SIGN_URL,
        apiKeyId: null,
      }),
      "signer_not_embedded",
    );
    const draft = await createRequest(sandbox, { send: false });
    await expectSignError(
      createSignSession({
        ...sandbox,
        requestId: draft.id,
        signerId: draft.signers[0]?.id ?? "",
        signUrl: SIGN_URL,
        apiKeyId: null,
      }),
      "request_not_signable",
    );
    // Another environment's request is not found.
    await expectSignError(
      createSignSession({
        ...live,
        requestId: draft.id,
        signerId: draft.signers[0]?.id ?? "",
        signUrl: SIGN_URL,
        apiKeyId: null,
      }),
      "not_found",
    );
  });
});

describe("signing", () => {
  test("view, consent, read, sign: the request completes with a sound audit trail", async () => {
    const { endpoint } = await createWebhookEndpoint(
      {
        organizationId: live.organizationId,
        environmentId: live.environmentId,
        url: "https://hooks.example.com/sign",
        eventTypes: [],
        apiVersion: "2026-10-10",
        userId: null,
      },
      testManagementDeps,
    );
    const request = await createRequest(live, {
      signers: [
        signer("Ada Lovelace", "ada@example.com", {
          client_ref: "user_1",
          fields: [
            { type: "signature", anchor: "{{signature:signer_1}}" },
            { type: "date_signed", page: 1, x: 300, y: 600, width: 100, height: 20 },
            { type: "text", page: 1, x: 300, y: 640, width: 100, height: 20, label: "Title" },
            { type: "checkbox", page: 1, x: 300, y: 680, width: 12, height: 12, required: false },
          ],
        }),
      ],
      metadata: { deal: "D-7" },
    });
    const ada = request.signers[0]?.id ?? "";
    const { access } = await session(live, request.id, ada);

    const view = await openSigning(access, { actor: signerActor });
    expect(view).toMatchObject({
      request: { id: request.id, title: "Services agreement", status: "sent" },
      signer: { id: ada, status: "viewed", consented: false },
      requester: { name: tenant.organization.name },
      can_sign: true,
      sandbox: false,
    });
    expect(view.disclosure.text).toContain(tenant.organization.name);
    expect(view.fields.map((field) => field.type).sort()).toEqual([
      "checkbox",
      "date_signed",
      "signature",
      "text",
    ]);
    // Opening it again records nothing more.
    await openSigning(access, { actor: signerActor });

    const document = view.documents[0]?.id ?? "";
    await expectSignError(
      readSigningDocument(access, { documentId: document, store }),
      "consent_required",
    );
    await expectSignError(
      consentToSign(access, { disclosureSha256: "0".repeat(64), actor: signerActor }),
      "invalid_signing",
    );
    await consentToSign(access, { disclosureSha256: view.disclosure.sha256, actor: signerActor });
    const pdf = await readSigningDocument(access, { documentId: document, store });
    expect(Buffer.from(pdf.content).subarray(0, 5).toString()).toBe("%PDF-");

    const text = view.fields.find((field) => field.type === "text")?.id ?? "";
    await expectSignError(
      signAsSigner(access, {
        values: {},
        signature: TEST_SIGNATURE_PNG,
        actor: signerActor,
        store,
      }),
      "invalid_signing",
    );
    await expectSignError(
      signAsSigner(access, {
        values: { [text]: "CEO" },
        signature: Buffer.from("not a png").toString("base64"),
        actor: signerActor,
        store,
      }),
      "invalid_signing",
    );
    await signAsSigner(access, {
      values: { [text]: "CEO" },
      signature: `data:image/png;base64,${TEST_SIGNATURE_PNG}`,
      actor: signerActor,
      store,
    });

    const done = await getSignRequest({ ...live, requestId: request.id });
    expect(done.status).toBe("completed");
    expect(done.signers[0]).toMatchObject({ status: "signed" });
    const fields = await db
      .select({ type: schema.signField.type, value: schema.signField.value })
      .from(schema.signField)
      .where(eq(schema.signField.requestId, request.id));
    expect(fields.find((field) => field.type === "text")?.value).toBe("CEO");
    expect(fields.find((field) => field.type === "checkbox")?.value).toBe("false");
    expect(fields.find((field) => field.type === "date_signed")?.value).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );

    const events = await listSignRequestEvents({ ...live, requestId: request.id });
    expect(events.map((event) => event.type)).toEqual([
      "created",
      "sent",
      "viewed",
      "consented",
      "signed",
      "completed",
    ]);
    expect(events[2]).toMatchObject({
      actor: "signer",
      signer_id: ada,
      ip_address: "198.51.100.4",
      user_agent: "Firefox",
    });
    expect(events[3]?.details.disclosure_sha256).toBe(view.disclosure.sha256);
    expect(events[4]?.details.signature_sha256).toMatch(/^[0-9a-f]{64}$/);
    const rows = await db
      .select()
      .from(schema.signEvent)
      .where(eq(schema.signEvent.requestId, request.id))
      .orderBy(asc(schema.signEvent.sequence));
    expect(verifySignEventChain(rows)).toBeNull();

    // Webhooks for the events that have one, in the latest shape.
    const messages = await db
      .select({ type: schema.webhookMessage.type, payload: schema.webhookMessage.payload })
      .from(schema.webhookDelivery)
      .innerJoin(
        schema.webhookMessage,
        eq(schema.webhookMessage.id, schema.webhookDelivery.messageId),
      )
      .where(eq(schema.webhookDelivery.endpointId, endpoint.id))
      .orderBy(asc(schema.webhookMessage.id));
    expect(messages.map((message) => message.type)).toEqual([
      "sign_request.sent",
      "sign_request.viewed",
      "sign_request.signer_signed",
    ]);
    // `sign_request.completed` waits for the sealed document (complete.test.ts).
    expect(messages[2]?.payload).toMatchObject({
      object: "event",
      type: "sign_request.signer_signed",
      data: {
        sign_request_id: request.id,
        status: "completed",
        metadata: { deal: "D-7" },
        signer: { id: ada, client_ref: "user_1", status: "signed" },
        sandbox: false,
      },
    });

    // And a log line per event.
    const lines = await db
      .select({ type: schema.logEntry.type })
      .from(schema.logEntry)
      .where(and(eq(schema.logEntry.source, "sign"), eq(schema.logEntry.resourceId, request.id)));
    expect(lines).toHaveLength(6);

    // Nothing more can be signed.
    await expectSignError(
      signAsSigner(access, {
        values: { [text]: "CEO" },
        signature: TEST_SIGNATURE_PNG,
        actor: signerActor,
        store,
      }),
      "request_not_signable",
    );
  });

  test("sequential order: the second signer waits for the first", async () => {
    const request = await createRequest(sandbox, {
      signing_order: "sequential",
      signers: [
        signer("Ada Lovelace", "ada@example.com", { order: 1 }),
        signer("Grace Hopper", "grace@example.com", { order: 2 }),
      ],
    });
    const [ada, grace] = request.signers.map((one) => one.id);
    const second = await session(sandbox, request.id, grace ?? "");
    const view = await openSigning(second.access, { actor: signerActor });
    expect(view.can_sign).toBe(false);
    expect(view.waiting_for).toEqual([{ name: "Ada Lovelace" }]);
    await consentToSign(second.access, {
      disclosureSha256: view.disclosure.sha256,
      actor: signerActor,
    });
    await expectSignError(
      signAsSigner(second.access, {
        values: {},
        signature: TEST_SIGNATURE_PNG,
        actor: signerActor,
        store,
      }),
      "not_signers_turn",
    );

    const first = await session(sandbox, request.id, ada ?? "");
    const firstView = await openSigning(first.access, { actor: signerActor });
    await consentToSign(first.access, {
      disclosureSha256: firstView.disclosure.sha256,
      actor: signerActor,
    });
    await signAsSigner(first.access, {
      values: {},
      signature: TEST_SIGNATURE_PNG,
      actor: signerActor,
      store,
    });
    expect((await getSignRequest({ ...sandbox, requestId: request.id })).status).toBe("sent");
    expect((await openSigning(second.access, { actor: signerActor })).can_sign).toBe(true);
    await signAsSigner(second.access, {
      values: {},
      signature: TEST_SIGNATURE_PNG,
      actor: signerActor,
      store,
    });
    expect((await getSignRequest({ ...sandbox, requestId: request.id })).status).toBe("completed");
  });

  test("declining declines the request", async () => {
    const request = await createRequest(sandbox, {
      signers: [
        signer("Ada Lovelace", "ada@example.com"),
        signer("Grace Hopper", "grace@example.com"),
      ],
    });
    const { access } = await session(sandbox, request.id, request.signers[1]?.id ?? "");
    await declineAsSigner(access, { reason: "  Wrong amount  ", actor: signerActor });
    const declined = await getSignRequest({ ...sandbox, requestId: request.id });
    expect(declined.status).toBe("declined");
    expect(declined.signers[1]).toMatchObject({
      status: "declined",
      decline_reason: "Wrong amount",
    });
    const events = await listSignRequestEvents({ ...sandbox, requestId: request.id });
    expect(events.at(-1)).toMatchObject({ type: "declined", details: { reason: "Wrong amount" } });
    await expectSignError(declineAsSigner(access, { actor: signerActor }), "request_not_signable");
  });

  test("a PNG that doesn't decode is refused before anything is signed", async () => {
    const request = await createRequest(sandbox);
    const { access } = await session(sandbox, request.id, request.signers[0]?.id ?? "");
    const view = await openSigning(access, { actor: signerActor });
    await consentToSign(access, { disclosureSha256: view.disclosure.sha256, actor: signerActor });
    // The signature, IHDR and a size, and nothing else.
    const header = Buffer.from(TEST_SIGNATURE_PNG, "base64").subarray(0, 33);
    await expectSignError(
      signAsSigner(access, {
        values: {},
        signature: header.toString("base64"),
        actor: signerActor,
        store,
      }),
      "invalid_signing",
    );
    expect(
      (await getSignRequest({ ...sandbox, requestId: request.id })).signers[0]?.status,
    ).not.toBe("signed");
  });

  test("signature images must be small PNGs", () => {
    expect(decodeSignatureImage(TEST_SIGNATURE_PNG, "signature").length).toBeGreaterThan(0);
    expect(() => decodeSignatureImage("", "signature")).toThrow(SignError);
    // A PNG cut off inside its IHDR chunk.
    const truncated = Buffer.from(TEST_SIGNATURE_PNG, "base64").subarray(0, 20).toString("base64");
    expect(() => decodeSignatureImage(truncated, "signature")).toThrow(SignError);
    expect(() =>
      decodeSignatureImage(Buffer.alloc(600 * 1024).toString("base64"), "signature"),
    ).toThrow(SignError);
  });
});

describe("settings", () => {
  test("defaults, partial updates and origin rules", async () => {
    const own = await createTestTenant();
    const env = { organizationId: own.organization.id, environmentId: own.production.id };
    expect(await getSignSettings(env)).toEqual({
      allowedOrigins: [],
      displayName: null,
      accentColor: null,
      theme: "system",
      disclosure: null,
      emailFrom: null,
      reminderIntervalDays: null,
    });
    await updateSignSettings({
      ...env,
      update: {
        allowed_origins: ["https://app.example.com/", "https://app.example.com"],
        display_name: " Acme ",
        accent_color: "#2563EB",
      },
    });
    const updated = await updateSignSettings({ ...env, update: { theme: "dark" } });
    expect(updated).toEqual({
      allowedOrigins: ["https://app.example.com"],
      displayName: "Acme",
      accentColor: "#2563eb",
      theme: "dark",
      disclosure: null,
      emailFrom: null,
      reminderIntervalDays: null,
    });
    await expectSignError(
      updateSignSettings({ ...env, update: { allowed_origins: ["http://localhost:3000"] } }),
      "invalid_origin",
    );
    // Concurrent updates of different settings both stick.
    await Promise.all([
      updateSignSettings({ ...env, update: { display_name: "Acme 2" } }),
      updateSignSettings({ ...env, update: { accent_color: "#111111" } }),
    ]);
    expect(await getSignSettings(env)).toMatchObject({
      displayName: "Acme 2",
      accentColor: "#111111",
      allowedOrigins: ["https://app.example.com"],
    });
    expect(checkedSignOrigin("http://localhost:3000", "sandbox")).toBe("http://localhost:3000");
    expect(() => checkedSignOrigin("https://app.example.com/path", "live")).toThrow(SignError);
  });
});

describe("signature images", () => {
  test("a failed initials upload removes the signature image the attempt wrote", async () => {
    const request = await createRequest(sandbox, {
      signers: [
        signer("Ada Lovelace", "ada@example.com", {
          fields: [
            { type: "signature", page: 1, x: 72, y: 600, width: 160, height: 30 },
            { type: "initials", page: 1, x: 300, y: 600, width: 40, height: 20 },
          ],
        }),
      ],
    });
    const signerId = request.signers[0]?.id ?? "";
    const { access } = await session(sandbox, request.id, signerId);
    const view = await openSigning(access, { actor: signerActor });
    await consentToSign(access, { disclosureSha256: view.disclosure.sha256, actor: signerActor });
    const failing = Object.assign(Object.create(store), {
      put: async (object: { key: string }) => {
        if (object.key.includes("-initials-")) throw new Error("S3 is down");
        return store.put(object as Parameters<typeof store.put>[0]);
      },
    }) as FakeDocumentStore;
    await expect(
      signAsSigner(access, {
        values: {},
        signature: TEST_SIGNATURE_PNG,
        initials: TEST_SIGNATURE_PNG,
        actor: signerActor,
        store: failing,
      }),
    ).rejects.toThrow("S3 is down");
    const objects = await db
      .select({ key: schema.signFakeObject.key })
      .from(schema.signFakeObject)
      .where(eq(schema.signFakeObject.organizationId, sandbox.organizationId));
    expect(objects.filter((object) => object.key.includes(`/signatures/${signerId}`))).toEqual([]);
  });

  test("a rejected second attempt leaves the committed image alone; optional initials can stay empty", async () => {
    const request = await createRequest(sandbox, {
      signers: [
        signer("Ada Lovelace", "ada@example.com", {
          fields: [
            { type: "signature", page: 1, x: 72, y: 600, width: 160, height: 30 },
            { type: "initials", page: 1, x: 300, y: 600, width: 40, height: 20, required: false },
          ],
        }),
      ],
    });
    const { access } = await session(sandbox, request.id, request.signers[0]?.id ?? "");
    const view = await openSigning(access, { actor: signerActor });
    await consentToSign(access, { disclosureSha256: view.disclosure.sha256, actor: signerActor });
    await signAsSigner(access, {
      values: {},
      signature: TEST_SIGNATURE_PNG,
      actor: signerActor,
      store,
    });
    const [row] = await db
      .select({ key: schema.signSigner.signatureKey, sha: schema.signSigner.signatureSha256 })
      .from(schema.signSigner)
      .where(eq(schema.signSigner.id, request.signers[0]?.id ?? ""));
    const before = await store.get(row?.key ?? "");
    expect(before).not.toBeNull();

    // Another image, after signing: refused, and nothing it wrote stays.
    const other = Buffer.from(TEST_SIGNATURE_PNG, "base64");
    other[other.length - 5] = (other[other.length - 5] ?? 0) ^ 1;
    await expectSignError(
      signAsSigner(access, {
        values: {},
        signature: other.toString("base64"),
        actor: signerActor,
        store,
      }),
      "request_not_signable",
    );
    expect(await store.get(row?.key ?? "")).toEqual(before);
    // The same image again: its own attempt's key, so its cleanup leaves the committed one.
    await expectSignError(
      signAsSigner(access, {
        values: {},
        signature: TEST_SIGNATURE_PNG,
        actor: signerActor,
        store,
      }),
      "request_not_signable",
    );
    expect(await store.get(row?.key ?? "")).toEqual(before);
    const objects = await db
      .select({ key: schema.signFakeObject.key })
      .from(schema.signFakeObject)
      .where(eq(schema.signFakeObject.organizationId, sandbox.organizationId));
    const images = objects.filter((object) =>
      object.key.includes(`/signatures/${request.signers[0]?.id}`),
    );
    expect(images.map((object) => object.key)).toEqual([row?.key ?? ""]);
  });
});
