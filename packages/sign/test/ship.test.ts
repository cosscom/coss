import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant } from "@coss/tenancy/testing";
import { and, eq } from "drizzle-orm";
import {
  authenticateSignSession,
  cancelSignRequest,
  consentToSign,
  createSignService,
  createSignSession,
  deleteSignRequest,
  FakeDocumentStore,
  getSignRequest,
  LocalSealer,
  openSigning,
  purgeExpiredSignSessions,
  runDueSignCompletions,
  S3DocumentStore,
  type SignEnvironment,
  SignError,
  type SignS3Api,
  signAsSigner,
} from "../src/index.ts";
import { signStoreFromEnv } from "../src/runtime.ts";
import { buildTestPdfBase64, TEST_SIGNATURE_PNG } from "../src/testing.ts";

const store = new FakeDocumentStore();
const service = createSignService({ store });

async function environment(mode: "live" | "sandbox") {
  const tenant = await createTestTenant();
  const env: SignEnvironment = {
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    environmentId: mode === "live" ? tenant.production.id : tenant.development.id,
    mode,
  };
  return { tenant, env };
}

/** A request signed by its one embedded signer, and its session. */
async function signed(env: SignEnvironment) {
  const { request } = await service.create({
    environment: env,
    apiKeyId: null,
    actor: { kind: "api_key" },
    params: {
      title: "NDA",
      documents: [{ filename: "nda.pdf", content: await buildTestPdfBase64() }],
      signers: [
        {
          name: "Ada",
          email: "ada@example.com",
          delivery: "embedded",
          fields: [{ type: "signature", anchor: "{{signature:signer_1}}" }],
        },
      ],
    },
  });
  const session = await createSignSession({
    ...env,
    requestId: request.id,
    signerId: request.signers[0]?.id ?? "",
    signUrl: "https://sign.test",
    apiKeyId: null,
    expiresIn: 60,
  });
  const access = await authenticateSignSession({ id: session.id, token: session.token });
  if (!access) throw new Error("no session");
  const actor = { kind: "signer" as const };
  const view = await openSigning(access, { actor });
  await consentToSign(access, { disclosureSha256: view.disclosure.sha256, actor });
  await signAsSigner(access, { values: {}, signature: TEST_SIGNATURE_PNG, actor, store });
  return request;
}

describe("billing", () => {
  test("a live completion is metered once; sandbox never", async () => {
    const { tenant, env } = await environment("live");
    await signed(env);
    const scope = { organizationIds: [tenant.organization.id] };
    const sealer = await LocalSealer.create();
    await runDueSignCompletions({ limit: 5, scope }, { store, sealer });
    await runDueSignCompletions({ limit: 5, scope }, { store, sealer });
    const usage = await db
      .select({ quantity: schema.billingUsage.quantity })
      .from(schema.billingUsage)
      .where(
        and(
          eq(schema.billingUsage.organizationId, tenant.organization.id),
          eq(schema.billingUsage.meter, "sign.completed_requests"),
        ),
      );
    expect(usage.reduce((total, row) => total + row.quantity, 0)).toBe(1);

    const sandbox = await environment("sandbox");
    await signed(sandbox.env);
    await runDueSignCompletions(
      { limit: 5, scope: { organizationIds: [sandbox.tenant.organization.id] } },
      { store, sealer },
    );
    const none = await db
      .select()
      .from(schema.billingUsage)
      .where(eq(schema.billingUsage.organizationId, sandbox.tenant.organization.id));
    expect(none).toHaveLength(0);
  });
});

describe("deleting requests", () => {
  test("only when not sent; takes the signatures and signed document with it", async () => {
    const { tenant, env } = await environment("sandbox");
    const request = await signed(env);
    await runDueSignCompletions(
      { limit: 5, scope: { organizationIds: [tenant.organization.id] } },
      { store, sealer: await LocalSealer.create() },
    );
    const [signer] = await db
      .select({ key: schema.signSigner.signatureKey })
      .from(schema.signSigner)
      .where(eq(schema.signSigner.requestId, request.id));
    const [row] = await db
      .select({ key: schema.signRequest.signedDocumentKey })
      .from(schema.signRequest)
      .where(eq(schema.signRequest.id, request.id));
    expect(await store.get(signer?.key ?? "")).not.toBeNull();
    await deleteSignRequest(store, { ...env, requestId: request.id });
    expect(await store.get(signer?.key ?? "")).toBeNull();
    expect(await store.get(row?.key ?? "")).toBeNull();
    await expect(getSignRequest({ ...env, requestId: request.id })).rejects.toThrow(SignError);

    const { request: open } = await service.create({
      environment: env,
      apiKeyId: null,
      actor: { kind: "api_key" },
      params: {
        title: "Open",
        documents: [{ filename: "nda.pdf", content: await buildTestPdfBase64() }],
        signers: [
          {
            name: "Ada",
            email: "ada@example.com",
            fields: [{ type: "signature", anchor: "{{signature:signer_1}}" }],
          },
        ],
      },
    });
    await expect(deleteSignRequest(store, { ...env, requestId: open.id })).rejects.toThrow(
      "cancel the request first",
    );
    await cancelSignRequest({ ...env, requestId: open.id, actor: { kind: "api_key" } });
    await deleteSignRequest(store, { ...env, requestId: open.id });
  });
});

describe("retention", () => {
  test("sessions go a week after they expire", async () => {
    const { tenant, env } = await environment("sandbox");
    await signed(env);
    const scope = { organizationIds: [tenant.organization.id] };
    expect(await purgeExpiredSignSessions({ scope })).toBe(0);
    const later = new Date(Date.now() + 8 * 86_400_000);
    expect(await purgeExpiredSignSessions({ now: later, scope })).toBe(1);
  });
});

describe("S3 store", () => {
  test("puts, gets and deletes an organization's prefix page by page", async () => {
    const objects = new Map<string, Uint8Array>();
    const api: SignS3Api = {
      async get(key) {
        return objects.get(key) ?? null;
      },
      async put(key, content) {
        objects.set(key, content);
      },
      async deleteKeys(keys) {
        for (const key of keys) objects.delete(key);
      },
      async list(prefix, token) {
        // Like S3: the token resumes after the last key returned.
        const keys = [...objects.keys()]
          .filter((key) => key.startsWith(prefix) && (!token || key > token))
          .sort();
        const page = keys.slice(0, 2);
        return { keys: page, next: keys.length > 2 ? (page.at(-1) ?? null) : null };
      },
    };
    const s3 = new S3DocumentStore(api);
    for (const index of [1, 2, 3, 4, 5]) {
      await s3.put({
        key: `orgs/org_a/env/documents/${index}.pdf`,
        organizationId: "org_a",
        contentType: "application/pdf",
        content: new Uint8Array([index]),
      });
    }
    await s3.put({
      key: "orgs/org_b/x.pdf",
      organizationId: "org_b",
      contentType: "application/pdf",
      content: new Uint8Array([9]),
    });
    expect(await s3.get("orgs/org_a/env/documents/3.pdf")).toEqual(new Uint8Array([3]));
    await s3.deleteOrganization("org_a");
    expect([...objects.keys()]).toEqual(["orgs/org_b/x.pdf"]);
  });

  test("the store from the environment", () => {
    expect(signStoreFromEnv({})).toBeInstanceOf(FakeDocumentStore);
    expect(
      signStoreFromEnv({ SIGN_DOCUMENTS_BUCKET: "bucket", AWS_REGION: "us-east-2" }),
    ).toBeInstanceOf(S3DocumentStore);
    expect(() => signStoreFromEnv({ SIGN_DOCUMENTS_BUCKET: "bucket" })).toThrow("AWS_REGION");
  });
});
