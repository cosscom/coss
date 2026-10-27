import { describe, expect, test } from "bun:test";
import {
  Coss,
  type List,
  type SignDocument,
  type SignEvent,
  type SignRequest,
} from "../src/index.ts";
import { json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";
const BASE = "https://api.coss.com/v1/sign";

const document: SignDocument = {
  object: "sign_document",
  id: "sdoc_01k5f9yq8re8vb6q2wmz0tb2xd",
  filename: "nda.pdf",
  size: 1024,
  sha256: "0".repeat(64),
  page_count: 1,
  pages: [{ width: 612, height: 792 }],
  anchors: [],
  sandbox: true,
  created_at: "2026-11-10T12:00:00.000Z",
};

const request: SignRequest = {
  object: "sign_request",
  id: "sreq_01k5f9yq8re8vb6q2wmz0tb2xd",
  status: "sent",
  title: "NDA",
  message: null,
  signing_order: "parallel",
  documents: [{ id: document.id, filename: "nda.pdf", sha256: document.sha256, page_count: 1 }],
  signers: [],
  fields: [],
  metadata: {},
  sandbox: true,
  expires_at: null,
  sent_at: "2026-11-10T12:00:00.000Z",
  completed_at: null,
  canceled_at: null,
  declined_at: null,
  created_at: "2026-11-10T12:00:00.000Z",
};

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return { coss: new Coss({ apiKey: API_KEY, fetch }), calls };
}

describe("coss.sign.documents", () => {
  test("upload is never retried; list, get and remove use the id", async () => {
    const { coss, calls } = client(
      json(503, { error: { type: "api_error", code: "x", message: "x", request_id: "req_1" } }),
      json(200, document),
    );
    const failed = await coss.sign.documents.upload({ filename: "nda.pdf", content: "JVBERg==" });
    expect(failed.error?.status).toBe(503);
    // One attempt: a retry would upload a second copy.
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: "POST", url: `${BASE}/documents` });

    await coss.sign.documents.list({ limit: 5 });
    expect(calls[1]?.url).toBe(`${BASE}/documents?limit=5`);
    await coss.sign.documents.get(document.id);
    expect(calls[2]?.url).toBe(`${BASE}/documents/${document.id}`);
    await coss.sign.documents.remove(document.id);
    expect(calls[3]).toMatchObject({ method: "DELETE", url: `${BASE}/documents/${document.id}` });
  });
});

describe("coss.sign.requests", () => {
  test("create POSTs with an idempotency key", async () => {
    const { coss, calls } = client(json(201, request));
    const result = await coss.sign.requests.create({
      title: "NDA",
      documents: [{ document_id: document.id }],
      signers: [
        {
          name: "Ada",
          email: "ada@example.com",
          fields: [{ type: "signature", anchor: "{{signature:signer_1}}" }],
        },
      ],
    });
    expect(result).toEqual({ data: request, error: null });
    expect(calls[0]).toMatchObject({ method: "POST", url: `${BASE}/requests` });
    expect(calls[0]?.headers.get("idempotency-key")).toBeTruthy();
  });

  test("list joins statuses; get, send, cancel and the audit trail use the id", async () => {
    const page: List<SignRequest> = { object: "list", data: [request], has_more: false };
    const trail: List<SignEvent> = { object: "list", data: [], has_more: false };
    const { coss, calls } = client(
      json(200, page),
      json(200, request),
      json(200, request),
      json(200, request),
      json(200, trail),
    );
    await coss.sign.requests.list({ status: ["sent", "draft"] });
    expect(calls[0]?.url).toBe(`${BASE}/requests?status=sent%2Cdraft`);
    await coss.sign.requests.get(request.id);
    expect(calls[1]?.url).toBe(`${BASE}/requests/${request.id}`);
    await coss.sign.requests.send(request.id);
    expect(calls[2]).toMatchObject({ method: "POST", url: `${BASE}/requests/${request.id}/send` });
    await coss.sign.requests.cancel(request.id);
    expect(calls[3]).toMatchObject({
      method: "POST",
      url: `${BASE}/requests/${request.id}/cancel`,
    });
    await coss.sign.requests.auditTrail(request.id);
    expect(calls[4]?.url).toBe(`${BASE}/requests/${request.id}/audit_trail`);
  });
});
