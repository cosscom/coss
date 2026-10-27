import { describe, expect, test } from "bun:test";
import { memoryLimiter } from "@coss/ratelimit/testing";
import {
  createSignBuilderSession,
  createSignService,
  FakeDocumentStore,
  uploadSignDocument,
} from "@coss/sign";
import type { SignTemplateObjectOutput } from "@coss/sign/schemas";
import { buildTestPdfBase64 } from "@coss/sign/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { type BuilderApiDeps, handleBuilderRequest } from "../src/lib/builder-api.ts";

const store = new FakeDocumentStore();

async function setup() {
  const tenant = await createTestTenant();
  const environment = {
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    environmentId: tenant.development.id,
    mode: "sandbox" as const,
  };
  const template = await createSignService({ store }).createTemplate({
    environment,
    apiKeyId: null,
    params: { name: "Empty" },
  });
  const session = await createSignBuilderSession({
    ...environment,
    templateId: template.id,
    signUrl: "https://sign.test",
  });
  const deps: BuilderApiDeps = { store, limiter: memoryLimiter(), clientIp: null };
  const call = (
    method: string,
    path: string[] = [],
    init: { body?: unknown; token?: string } = {},
  ) =>
    handleBuilderRequest(
      new Request(`https://sign.test/api/builder/${session.id}/${path.join("/")}`, {
        method,
        headers: {
          authorization: `Bearer ${init.token ?? session.token}`,
          ...(init.body === undefined ? {} : { "content-type": "application/json" }),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      }),
      session.id,
      path,
      deps,
    );
  return { environment, template, call };
}

type Overview = { template: SignTemplateObjectOutput; read_only: boolean };

describe("builder API", () => {
  test("bad tokens are a 404", async () => {
    const { call } = await setup();
    expect((await call("GET", [], { token: "cossb_nope" })).status).toBe(404);
  });

  test("upload a document, place fields for roles, save: the template is ready", async () => {
    const { call, environment } = await setup();
    const empty = (await (await call("GET")).json()) as Overview;
    expect(empty.template).toMatchObject({ name: "Empty", ready: false, documents: [] });

    const uploaded = await call("POST", ["documents"], {
      body: { filename: "nda.pdf", content: await buildTestPdfBase64() },
    });
    const withDocument = (await uploaded.json()) as Overview;
    const documentId = withDocument.template.documents[0]?.id ?? "";
    const pdf = await call("GET", ["documents", documentId]);
    expect(
      Buffer.from(await pdf.arrayBuffer())
        .subarray(0, 5)
        .toString(),
    ).toBe("%PDF-");

    const saved = await call("PUT", [], {
      body: {
        name: "Mutual NDA",
        title: null,
        message: null,
        signing_order: "parallel",
        documents: [documentId],
        roles: [{ key: "client", name: "Client" }],
        fields: [
          {
            role: "client",
            type: "signature",
            document: 0,
            page: 1,
            x: 72,
            y: 600,
            width: 160,
            height: 40,
            required: true,
            label: null,
            merge_key: null,
          },
        ],
      },
    });
    const done = (await saved.json()) as Overview;
    expect(done.template).toMatchObject({ name: "Mutual NDA", ready: true });
    expect(done.template.fields).toHaveLength(1);

    // Another document of the environment can't be pulled in, or read.
    const other = await uploadSignDocument(store, {
      environment,
      apiKeyId: null,
      filename: "other.pdf",
      content: await buildTestPdfBase64(),
    });
    const refused = await call("PUT", [], {
      body: {
        name: "Mutual NDA",
        title: null,
        message: null,
        signing_order: "parallel",
        documents: [other.id],
        roles: [],
        fields: [],
      },
    });
    expect(refused.status).toBe(422);
    expect((await call("GET", ["documents", other.id])).status).toBe(404);
  });
});
