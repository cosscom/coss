import { describe, expect, test } from "bun:test";
import {
  Coss,
  type List,
  type SignDocument,
  type SignEvent,
  type SignRequest,
  type SignSession,
  type SignSettings,
} from "../src/index.ts";
import { mountBuilder, mountSigning, type SigningEvent } from "../src/sign.ts";
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
  reminder_interval_days: null,
  expires_at: null,
  expired_at: null,
  sent_at: "2026-11-10T12:00:00.000Z",
  completed_at: null,
  canceled_at: null,
  declined_at: null,
  signed_document: null,
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
  test("remind is never retried (a retry would answer reminder_not_due)", async () => {
    const { coss, calls } = client(
      json(503, { error: { type: "api_error", code: "x", message: "x", request_id: "req_1" } }),
      json(200, request),
    );
    const failed = await coss.sign.requests.remind(request.id);
    expect(failed.error?.status).toBe(503);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      method: "POST",
      url: `${BASE}/requests/${request.id}/remind`,
    });
  });

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

describe("coss.sign.sessions and coss.sign.settings", () => {
  test("create a session for a signer; read and update the settings", async () => {
    const session: SignSession = {
      object: "sign_session",
      id: "sgs_01k5f9yq8re8vb6q2wmz0tb2xd",
      request_id: request.id,
      signer_id: "ssgn_01k5f9yq8re8vb6q2wmz0tb2xd",
      url: "https://sign.example/s/sgs_01k5f9yq8re8vb6q2wmz0tb2xd#cosss_x",
      token: "cosss_x",
      expires_at: "2026-11-10T13:00:00.000Z",
    };
    const settings: SignSettings = {
      object: "sign_settings",
      allowed_origins: ["https://app.example.com"],
      display_name: "Acme",
      accent_color: null,
      theme: "system",
      disclosure: null,
      email_from: null,
      reminder_interval_days: null,
    };
    const { coss, calls } = client(json(201, session), json(200, settings), json(200, settings));
    const created = await coss.sign.sessions.create(request.id, session.signer_id, {
      expires_in: 600,
    });
    expect(created.data).toEqual(session);
    expect(calls[0]).toMatchObject({
      method: "POST",
      url: `${BASE}/requests/${request.id}/signers/${session.signer_id}/sessions`,
    });
    await coss.sign.settings.get();
    expect(calls[1]).toMatchObject({ method: "GET", url: `${BASE}/settings` });
    await coss.sign.settings.update({ allowed_origins: ["https://app.example.com"] });
    expect(calls[2]).toMatchObject({ method: "PATCH", url: `${BASE}/settings` });
  });
});

describe("mountSigning", () => {
  /** A minimal DOM: one container, one window that dispatches messages. */
  function fakeDom() {
    const listeners = new Set<(event: MessageEvent) => void>();
    const frameWindow = {};
    const iframe = {
      src: "",
      title: "",
      referrerPolicy: "",
      style: {} as Record<string, string>,
      contentWindow: frameWindow,
      removed: false,
      remove() {
        this.removed = true;
      },
    };
    const view = {
      addEventListener: (_: string, listener: (event: MessageEvent) => void) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: (event: MessageEvent) => void) =>
        listeners.delete(listener),
    };
    const container = {
      ownerDocument: { createElement: () => iframe, defaultView: view },
      appendChild: () => iframe,
    } as unknown as HTMLElement;
    const post = (
      data: unknown,
      origin = "https://sign.example",
      source: unknown = frameWindow,
    ) => {
      for (const listener of listeners) listener({ data, origin, source } as MessageEvent);
    };
    return { iframe, container, post, listeners };
  }

  test("forwards the page's events, resizes, and ignores other windows and origins", () => {
    const dom = fakeDom();
    const events: SigningEvent[] = [];
    const embed = mountSigning({
      url: "https://sign.example/s/sgs_1#cosss_x",
      container: dom.container,
      onEvent: (event) => events.push(event),
    });
    expect(dom.iframe.src).toBe("https://sign.example/s/sgs_1#cosss_x");
    expect(dom.iframe.referrerPolicy).toBe("no-referrer");

    const signed = {
      source: "coss-sign",
      version: 1,
      type: "signed",
      request_id: "sreq_1",
      signer_id: "ssgn_1",
      request_status: "completed",
    };
    dom.post({ source: "coss-sign", version: 1, type: "resize", height: 900.2 });
    dom.post(signed);
    dom.post(signed, "https://evil.example");
    dom.post(signed, "https://sign.example", {});
    dom.post({ type: "signed" });
    expect(dom.iframe.style.height).toBe("901px");
    // Never taller than the window: the page's dialogs are centered in the frame.
    expect(dom.iframe.style.maxHeight).toBe("100vh");
    expect(events).toEqual([
      { type: "signed", request_id: "sreq_1", signer_id: "ssgn_1", request_status: "completed" },
    ]);

    embed.destroy();
    expect(dom.iframe.removed).toBe(true);
    expect(dom.listeners.size).toBe(0);
  });
});

describe("coss.sign.templates", () => {
  test("CRUD paths, requests from a template, builder sessions", async () => {
    const { coss, calls } = client(
      json(201, {}),
      json(200, {}),
      json(200, {}),
      json(200, {}),
      json(200, {}),
      json(201, {}),
      json(201, {}),
    );
    const id = "stpl_01k5f9yq8re8vb6q2wmz0tb2xd";
    await coss.sign.templates.create({ name: "NDA" });
    await coss.sign.templates.list({ limit: 2 });
    await coss.sign.templates.get(id);
    await coss.sign.templates.update(id, { name: "NDA v2" });
    await coss.sign.templates.remove(id);
    await coss.sign.templates.createRequest(id, {
      signers: [{ role: "client", name: "Ada", email: "ada@example.com" }],
      merge_fields: { client_company: "Engines Ltd" },
    });
    await coss.sign.templates.createBuilderSession(id);
    expect(calls.map((call) => `${call.method} ${call.url.replace(BASE, "")}`)).toEqual([
      "POST /templates",
      "GET /templates?limit=2",
      `GET /templates/${id}`,
      `PATCH /templates/${id}`,
      `DELETE /templates/${id}`,
      `POST /templates/${id}/requests`,
      `POST /templates/${id}/builder_sessions`,
    ]);
    expect(calls[5]?.headers.get("idempotency-key")).toBeTruthy();
  });

  test("an update uploading documents isn't retried; one that doesn't is", async () => {
    const failure = json(503, {
      error: { type: "api_error", code: "x", message: "x", request_id: "req_1" },
    });
    const id = "stpl_01k5f9yq8re8vb6q2wmz0tb2xd";
    const uploads = client(failure, json(200, {}));
    await uploads.coss.sign.templates.update(id, {
      documents: [{ filename: "nda.pdf", content: "JVBERg==" }],
    });
    expect(uploads.calls).toHaveLength(1);
    const plain = client(failure, json(200, {}));
    await plain.coss.sign.templates.update(id, { name: "NDA v2" });
    expect(plain.calls).toHaveLength(2);
  });
});

describe("mountBuilder", () => {
  test("forwards saved events and keeps its own height", () => {
    const listeners = new Set<(event: MessageEvent) => void>();
    const frameWindow = {};
    const iframe = {
      style: {} as Record<string, string>,
      contentWindow: frameWindow,
      remove() {},
    } as Record<string, unknown>;
    const container = {
      ownerDocument: {
        createElement: () => iframe,
        defaultView: {
          addEventListener: (_: string, listener: (event: MessageEvent) => void) =>
            listeners.add(listener),
          removeEventListener: (_: string, listener: (event: MessageEvent) => void) =>
            listeners.delete(listener),
        },
      },
      appendChild: () => iframe,
    } as unknown as HTMLElement;
    const events: unknown[] = [];
    mountBuilder({
      url: "https://sign.example/b/sbs_1#cossb_x",
      container,
      onEvent: (e) => events.push(e),
    });
    for (const listener of listeners) {
      const post = (data: unknown) =>
        listener({ data, origin: "https://sign.example", source: frameWindow } as MessageEvent);
      post({ source: "coss-sign", version: 1, type: "resize", height: 2000 });
      post({ source: "coss-sign", version: 1, type: "saved", template_id: "stpl_1", ready: true });
    }
    expect((iframe.style as Record<string, string>).height).toBe("80vh");
    expect(events).toEqual([{ type: "saved", template_id: "stpl_1", ready: true }]);
  });
});
