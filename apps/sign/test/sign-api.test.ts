import { describe, expect, test } from "bun:test";
import { memoryLimiter } from "@coss/ratelimit/testing";
import {
  createSignService,
  createSignSession,
  FakeDocumentStore,
  getSignRequest,
  LocalSealer,
  runDueSignCompletions,
  type SigningView,
} from "@coss/sign";
import { buildTestPdfBase64, TEST_SIGNATURE_PNG } from "@coss/sign/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { contentSecurityPolicy } from "../src/lib/security-headers.ts";
import { handleSignRequest, readBodyText, type SignApiDeps } from "../src/lib/sign-api.ts";

const store = new FakeDocumentStore();

async function setup(deps: Partial<SignApiDeps> = {}) {
  const tenant = await createTestTenant();
  const environment = {
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    environmentId: tenant.development.id,
    mode: "sandbox" as const,
  };
  const { request } = await createSignService({ store }).create({
    environment,
    apiKeyId: null,
    actor: { kind: "api_key" },
    params: {
      title: "NDA",
      documents: [{ filename: "nda.pdf", content: await buildTestPdfBase64() }],
      signers: [
        {
          name: "Ada Lovelace",
          email: "ada@example.com",
          delivery: "embedded",
          fields: [{ type: "signature", anchor: "{{signature:signer_1}}" }],
        },
      ],
    },
  });
  const session = await createSignSession({
    ...environment,
    requestId: request.id,
    signerId: request.signers[0]?.id ?? "",
    signUrl: "https://sign.test",
    apiKeyId: null,
  });
  const fullDeps: SignApiDeps = {
    store,
    limiter: memoryLimiter(),
    clientIp: "198.51.100.7",
    ...deps,
  };
  const call = (
    method: string,
    path: string[] = [],
    init: { body?: unknown; token?: string; sessionId?: string } = {},
  ) =>
    handleSignRequest(
      new Request(`https://sign.test/api/sessions/${session.id}/${path.join("/")}`, {
        method,
        headers: {
          authorization: `Bearer ${init.token ?? session.token}`,
          "user-agent": "Safari",
          ...(init.body === undefined ? {} : { "content-type": "application/json" }),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      }),
      init.sessionId ?? session.id,
      path,
      fullDeps,
    );
  return { environment, request, session, call };
}

describe("signing API", () => {
  test("answers every bad session or token the same way", async () => {
    const { call, session } = await setup();
    for (const response of [
      await call("GET", [], { token: `${session.token}x` }),
      await call("GET", [], { token: "nope" }),
      await call("GET", [], { sessionId: "sgs_01m4xppzm8fp2b8nf8asd2zr0q" }),
    ]) {
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: { code: "not_found", message: "This signing link is invalid or has expired." },
      });
    }
  });

  test("open, consent, download, sign", async () => {
    const { call, environment, request } = await setup();
    const opened = await call("GET");
    expect(opened.status).toBe(200);
    const view = (await opened.json()) as SigningView;
    expect(view).toMatchObject({ can_sign: true, signer: { status: "viewed", consented: false } });

    const early = await call("GET", ["documents", view.documents[0]?.id ?? ""]);
    expect(early.status).toBe(403);
    expect((await early.json()).error.code).toBe("consent_required");

    const consented = await call("POST", ["consent"], {
      body: { disclosure_sha256: view.disclosure.sha256 },
    });
    expect(((await consented.json()) as SigningView).signer.consented).toBe(true);

    const pdf = await call("GET", ["documents", view.documents[0]?.id ?? ""]);
    expect(pdf.headers.get("content-type")).toBe("application/pdf");
    expect(
      Buffer.from(await pdf.arrayBuffer())
        .subarray(0, 5)
        .toString(),
    ).toBe("%PDF-");

    const invalid = await call("POST", ["sign"], { body: { signature: "bm9wZQ==" } });
    expect(invalid.status).toBe(422);
    expect((await invalid.json()).error).toMatchObject({
      code: "invalid_signing",
      param: "signature",
    });

    const signed = await call("POST", ["sign"], {
      body: { values: {}, signature: `data:image/png;base64,${TEST_SIGNATURE_PNG}` },
    });
    expect(signed.status).toBe(200);
    expect(((await signed.json()) as SigningView).signer.status).toBe("signed");
    const done = await getSignRequest({ ...environment, requestId: request.id });
    expect(done.status).toBe("completed");

    // The signed copy, once the worker sealed it.
    const early2 = await call("GET", ["signed_document"]);
    expect((await early2.json()).error.code).toBe("signed_document_not_ready");
    await runDueSignCompletions(
      { limit: 5, scope: { organizationIds: [environment.organizationId] } },
      { store, sealer: await LocalSealer.create() },
    );
    expect(((await (await call("GET")).json()) as SigningView).request.signed_document_ready).toBe(
      true,
    );
    const copy = await call("GET", ["signed_document"]);
    expect(copy.headers.get("content-disposition")).toBe('attachment; filename="NDA (signed).pdf"');
    expect(
      Buffer.from(await copy.arrayBuffer())
        .subarray(0, 5)
        .toString(),
    ).toBe("%PDF-");
  });

  test("decline", async () => {
    const { call } = await setup();
    const response = await call("POST", ["decline"], { body: { reason: "Not today" } });
    const view = (await response.json()) as SigningView;
    expect(view.signer.status).toBe("declined");
    expect(view.request.status).toBe("declined");
  });

  test("rate limits come before the token check; no store answers 503", async () => {
    const denying = {
      consume: async () => ({ allowed: false }),
      refund: async () => {},
    } as unknown as SignApiDeps["limiter"];
    const limited = await setup({ limiter: denying });
    expect((await limited.call("GET")).status).toBe(429);
    const unavailable = await setup({ store: null });
    expect((await unavailable.call("GET")).status).toBe(503);
  });
});

describe("headers", () => {
  test("frame-ancestors lists the allowed origins, else 'none'", () => {
    expect(contentSecurityPolicy({ dev: false, frameAncestors: [] })).toContain(
      "frame-ancestors 'none'",
    );
    expect(
      contentSecurityPolicy({ dev: false, frameAncestors: ["https://app.example.com"] }),
    ).toContain("frame-ancestors https://app.example.com");
  });

  test("a streamed body is refused once it passes the limit, without a Content-Length", async () => {
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++;
        controller.enqueue(new Uint8Array(64 * 1024));
      },
    });
    const request = new Request("https://sign.test/api/sessions/x", {
      method: "POST",
      body: stream,
      // @ts-expect-error: Bun and Node need it for a stream body.
      duplex: "half",
    });
    try {
      await readBodyText(request, 1024 * 1024);
      throw new Error("expected 413");
    } catch (error) {
      expect((error as { status?: number }).status).toBe(413);
    }
    expect(pulled).toBeLessThan(40);
    expect(
      await readBodyText(new Request("https://sign.test", { method: "POST", body: "{}" }), 10),
    ).toBe("{}");
  });

  test("without a client IP, guesses across session ids still share one limit", async () => {
    const { call } = await setup({ clientIp: null });
    const statuses = new Set<number>();
    for (let attempt = 0; attempt < 200; attempt++) {
      const response = await call("GET", [], { sessionId: `sgs_guess${attempt}` });
      statuses.add(response.status);
    }
    expect(statuses.has(429)).toBe(true);
  });
});
