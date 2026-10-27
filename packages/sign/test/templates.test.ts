import { beforeAll, describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import {
  authenticateSignBuilderSession,
  authenticateSignSession,
  consentToSign,
  createRequestFromTemplate,
  createSignBuilderSession,
  createSignService,
  createSignSession,
  deleteSignDocument,
  deleteSignTemplate,
  FakeDocumentStore,
  getSignTemplate,
  listSignTemplates,
  openSigning,
  type SignEnvironment,
  SignError,
  signAsSigner,
} from "../src/index.ts";
import { buildTestPdfBase64, TEST_SIGNATURE_PNG } from "../src/testing.ts";

const store = new FakeDocumentStore();
const service = createSignService({ store });
const actor = { kind: "api_key" as const };

let tenant: TestTenant;
let env: SignEnvironment;

beforeAll(async () => {
  tenant = await createTestTenant();
  env = {
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    environmentId: tenant.development.id,
    mode: "sandbox",
  };
});

async function expectSignError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(SignError);
    expect((error as SignError).code).toBe(code as SignError["code"]);
    return;
  }
  throw new Error(`expected ${code}`);
}

async function ndaTemplate() {
  return service.createTemplate({
    environment: env,
    apiKeyId: null,
    params: {
      name: "Mutual NDA",
      documents: [
        {
          filename: "nda.pdf",
          content: await buildTestPdfBase64([
            { lines: ["Client: {{signature:client}}", "Company: {{signature:company}}"] },
          ]),
        },
      ],
      roles: [
        { key: "client", name: "Client" },
        { key: "company", name: "Company" },
      ],
      fields: [
        { role: "client", type: "signature", anchor: "{{signature:client}}" },
        {
          role: "client",
          type: "text",
          page: 1,
          x: 72,
          y: 200,
          width: 200,
          height: 18,
          merge_key: "client_company",
        },
        { role: "company", type: "signature", anchor: "{{signature:company}}" },
      ],
    },
  });
}

describe("templates", () => {
  test("created with roles and anchored fields, resolved to positions", async () => {
    const template = await ndaTemplate();
    expect(template).toMatchObject({
      object: "sign_template",
      name: "Mutual NDA",
      ready: true,
      sandbox: true,
      roles: [
        { key: "client", name: "Client" },
        { key: "company", name: "Company" },
      ],
    });
    expect(template.fields).toHaveLength(3);
    expect(template.fields.every((field) => field.document_id === template.documents[0]?.id)).toBe(
      true,
    );
    expect(template.fields.find((field) => field.type === "text")?.merge_key).toBe(
      "client_company",
    );
    expect((await getSignTemplate({ ...env, templateId: template.id })).id).toBe(template.id);
    const listed = await listSignTemplates(env);
    expect(listed.data.map((item) => item.id)).toContain(template.id);
  });

  test("empty templates are allowed (the builder fills them) but not ready", async () => {
    const empty = await service.createTemplate({
      environment: env,
      apiKeyId: null,
      params: { name: "Draft" },
    });
    expect(empty.ready).toBe(false);
    await expectSignError(
      createRequestFromTemplate(service, {
        ...env,
        templateId: empty.id,
        environment: env,
        apiKeyId: null,
        actor,
        params: { signers: [{ role: "client", name: "Ada", email: "ada@example.com" }] },
      }),
      "template_incomplete",
    );
    await expectSignError(
      service.createTemplate({
        environment: env,
        apiKeyId: null,
        params: {
          name: "Bad",
          roles: [{ key: "client", name: "Client" }],
          fields: [
            { role: "nobody", type: "signature", page: 1, x: 1, y: 1, width: 10, height: 10 },
          ],
        },
      }),
      "invalid_fields",
    );
  });

  test("a request from the template: one signer per role, merge fields shown but fixed", async () => {
    const template = await ndaTemplate();
    const base = { ...env, templateId: template.id, environment: env, apiKeyId: null, actor };
    await expectSignError(
      createRequestFromTemplate(service, {
        ...base,
        params: { signers: [{ role: "client", name: "Ada", email: "ada@example.com" }] },
      }),
      "invalid_signers",
    );
    await expectSignError(
      createRequestFromTemplate(service, {
        ...base,
        params: {
          signers: [
            { role: "client", name: "Ada", email: "ada@example.com" },
            { role: "company", name: "Grace", email: "grace@example.com" },
          ],
          merge_fields: { typo: "x" },
        },
      }),
      "invalid_fields",
    );
    const { request } = await createRequestFromTemplate(service, {
      ...base,
      params: {
        signers: [
          { role: "company", name: "Grace", email: "grace@example.com", delivery: "embedded" },
          { role: "client", name: "Ada", email: "ada@example.com", delivery: "embedded" },
        ],
        merge_fields: { client_company: "Analytical Engines Ltd" },
      },
    });
    expect(request).toMatchObject({ title: "Mutual NDA", status: "sent" });
    // Signers in the template's role order.
    expect(request.signers.map((signer) => signer.name)).toEqual(["Ada", "Grace"]);
    expect(request.fields).toHaveLength(3);

    const ada = request.signers[0]?.id ?? "";
    const session = await createSignSession({
      ...env,
      requestId: request.id,
      signerId: ada,
      signUrl: "https://sign.test",
      apiKeyId: null,
    });
    const access = await authenticateSignSession({ id: session.id, token: session.token });
    if (!access) throw new Error("no session");
    const signer = { kind: "signer" as const };
    const view = await openSigning(access, { actor: signer });
    const merged = view.fields.find((field) => field.type === "text");
    expect(merged).toMatchObject({ prefilled: true, value: "Analytical Engines Ltd" });
    await consentToSign(access, { disclosureSha256: view.disclosure.sha256, actor: signer });
    await expectSignError(
      signAsSigner(access, {
        values: { [merged?.id ?? ""]: "Something else" },
        signature: TEST_SIGNATURE_PNG,
        actor: signer,
        store,
      }),
      "invalid_signing",
    );
    await signAsSigner(access, { values: {}, signature: TEST_SIGNATURE_PNG, actor: signer, store });
  });

  test("updates replace documents, roles and fields; templates keep their documents", async () => {
    const template = await ndaTemplate();
    const renamed = await service.updateTemplate({
      ...env,
      templateId: template.id,
      environment: env,
      apiKeyId: null,
      params: { name: "NDA v2", roles: [{ key: "client", name: "Client" }], fields: [] },
    });
    expect(renamed).toMatchObject({ name: "NDA v2", ready: false, fields: [] });
    expect(renamed.documents).toHaveLength(1);
    await expectSignError(
      deleteSignDocument(store, { ...env, documentId: renamed.documents[0]?.id ?? "" }),
      "document_in_use",
    );
    await deleteSignTemplate({ ...env, templateId: template.id });
    await expectSignError(getSignTemplate({ ...env, templateId: template.id }), "not_found");
  });

  test("builder sessions authenticate for their template only", async () => {
    const template = await ndaTemplate();
    const session = await createSignBuilderSession({
      ...env,
      templateId: template.id,
      signUrl: "https://sign.test",
    });
    expect(session.url).toBe(`https://sign.test/b/${session.id}#${session.token}`);
    const access = await authenticateSignBuilderSession({ id: session.id, token: session.token });
    expect(access?.template.id).toBe(template.id);
    expect(
      await authenticateSignBuilderSession({ id: session.id, token: "cossb_nope" }),
    ).toBeNull();
    await expectSignError(
      createSignBuilderSession({
        ...env,
        environmentId: tenant.production.id,
        templateId: template.id,
        signUrl: "https://sign.test",
      }),
      "not_found",
    );
  });
});

describe("template writes", () => {
  test("a refused template leaves no uploaded bytes; a name-only update keeps roles", async () => {
    const own = await createTestTenant();
    const ownEnv: SignEnvironment = {
      organizationId: own.organization.id,
      projectId: own.project.id,
      environmentId: own.development.id,
      mode: "sandbox",
    };
    await expectSignError(
      service.createTemplate({
        environment: ownEnv,
        apiKeyId: null,
        params: {
          name: "Bad",
          documents: [{ filename: "nda.pdf", content: await buildTestPdfBase64() }],
          roles: [{ key: "client", name: "Client" }],
          fields: [
            { role: "client", type: "signature", page: 9, x: 1, y: 1, width: 10, height: 10 },
          ],
        },
      }),
      "invalid_fields",
    );
    const leftovers = await db
      .select()
      .from(schema.signFakeObject)
      .where(eq(schema.signFakeObject.organizationId, own.organization.id));
    expect(leftovers).toEqual([]);

    const template = await service.createTemplate({
      environment: ownEnv,
      apiKeyId: null,
      params: { name: "Roles", roles: [{ key: "client", name: "Client" }] },
    });
    const update = (params: Parameters<typeof service.updateTemplate>[0]["params"]) =>
      service.updateTemplate({
        ...ownEnv,
        templateId: template.id,
        environment: ownEnv,
        apiKeyId: null,
        params,
      });
    await update({ roles: [{ key: "buyer", name: "Buyer" }] });
    const renamed = await update({ name: "Renamed" });
    expect(renamed.roles).toEqual([{ key: "buyer", name: "Buyer" }]);
  });

  test("reordering documents moves their fields; a removed document's fields go", async () => {
    const template = await ndaTemplate();
    const first = template.documents[0]?.id ?? "";
    const second = await service.uploadDocument({
      environment: env,
      apiKeyId: null,
      filename: "annex.pdf",
      content: await buildTestPdfBase64(),
    });
    const update = (params: Parameters<typeof service.updateTemplate>[0]["params"]) =>
      service.updateTemplate({
        ...env,
        templateId: template.id,
        environment: env,
        apiKeyId: null,
        params,
      });
    const reordered = await update({
      documents: [{ document_id: second.id }, { document_id: first }],
    });
    expect(reordered.documents.map((document) => document.id)).toEqual([second.id, first]);
    expect(reordered.fields).toHaveLength(3);
    expect(reordered.fields.every((field) => field.document_id === first)).toBe(true);
    expect(reordered.ready).toBe(true);

    const removed = await update({ documents: [{ document_id: second.id }] });
    expect(removed.fields).toEqual([]);
    expect(removed.ready).toBe(false);
  });

  test("a retry replays its request even after the template changed", async () => {
    const template = await ndaTemplate();
    const input = {
      ...env,
      templateId: template.id,
      environment: env,
      apiKeyId: null,
      actor,
      idempotencyKey: `tpl-${template.id}`,
      params: {
        signers: [
          { role: "client" as const, name: "Ada", email: "ada@example.com" },
          { role: "company" as const, name: "Grace", email: "grace@example.com" },
        ],
      },
    };
    const first = await createRequestFromTemplate(service, input);
    expect(first.replayed).toBe(false);
    // The template no longer has these roles: a new request would be refused, a retry isn't.
    await service.updateTemplate({
      ...env,
      templateId: template.id,
      environment: env,
      apiKeyId: null,
      params: { roles: [{ key: "buyer", name: "Buyer" }], fields: [] },
    });
    const again = await createRequestFromTemplate(service, input);
    expect(again).toMatchObject({ replayed: true, request: { id: first.request.id } });
    await expectSignError(
      createRequestFromTemplate(service, { ...input, idempotencyKey: `${input.idempotencyKey}-2` }),
      "template_incomplete",
    );
  });
});
