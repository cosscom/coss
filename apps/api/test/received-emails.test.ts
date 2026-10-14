import { describe, expect, test } from "bun:test";
import { buildTestMessage, receiveFakeEmail } from "@coss/email";
import type { InboundRuntime } from "@coss/email/runtime";
import type {
  DomainObjectOutput,
  InboundAddressObjectOutput,
  ReceivedEmailListOutput,
  ReceivedEmailObjectOutput,
} from "@coss/email/schemas";
import { createVerifiedDomain } from "@coss/email/testing";
import { memoryLogWriter } from "@coss/logs/testing";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { attachmentDisposition } from "../src/routes/received-emails.ts";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  errorOf,
  setKeyPermissions,
} from "./helpers.ts";

async function inboxOf(app: ReturnType<typeof createTestApp>["app"], key: string) {
  const res = await apiRequest(app, "GET", "/v1/received_emails/address", { key });
  expect(res.status).toBe(200);
  return (await res.json()) as InboundAddressObjectOutput;
}

async function receive(
  inbound: InboundRuntime,
  to: string,
  overrides: { subject?: string; attachment?: string } = {},
) {
  const subject = overrides.subject ?? "Hello";
  const raw = buildTestMessage({
    from: "Jane <jane@example.com>",
    to: [to],
    subject,
    text: "Plain body",
    html: "<p>HTML</p>",
    attachments: overrides.attachment
      ? [
          {
            filename: overrides.attachment,
            contentType: "application/pdf",
            content: new TextEncoder().encode("%PDF-1.7"),
          },
        ]
      : [],
  });
  const [outcome] = await receiveFakeEmail(
    { raw, mailFrom: "jane@example.com", recipients: [to], subject },
    { store: inbound.store, managedDomain: inbound.managedDomain },
  );
  if (outcome?.kind !== "received") throw new Error(`not received: ${outcome?.kind}`);
  return outcome.receivedEmailId;
}

async function setup() {
  const tenant: TestTenant = await createTestTenant();
  const testApp = createTestApp();
  if (!testApp.inbound) throw new Error("no inbound runtime");
  const { domain } = await inboxOf(testApp.app, tenant.liveKey);
  return { tenant, ...testApp, inbound: testApp.inbound, to: `support@${domain}` };
}

describe("GET /v1/received_emails/address", () => {
  test("is stable per environment and differs between environments", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const live = await inboxOf(app, tenant.liveKey);
    expect(live).toMatchObject({ object: "inbound_address", environment_id: tenant.production.id });
    expect(live.domain).toEndWith(".inbound.coss.test");
    expect(await inboxOf(app, tenant.liveKey)).toEqual(live);
    expect((await inboxOf(app, tenant.sandboxKey)).domain).not.toBe(live.domain);
  });

  test("is 422 receiving_unavailable when the deployment doesn't receive", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp({ inbound: null });
    const res = await apiRequest(app, "GET", "/v1/received_emails/address", {
      key: tenant.liveKey,
    });
    expect(res.status).toBe(422);
    expect((await errorOf(res)).code).toBe("receiving_unavailable");
  });
});

describe("received emails", () => {
  test("list, retrieve, download raw and attachments", async () => {
    const { tenant, app, inbound, to } = await setup();
    const first = await receive(inbound, to);
    const second = await receive(inbound, to, { attachment: "invoice 1.pdf" });

    const list = await apiRequest(app, "GET", "/v1/received_emails?limit=1", {
      key: tenant.liveKey,
    });
    expect(list.status).toBe(200);
    const page = (await list.json()) as ReceivedEmailListOutput;
    expect(page).toMatchObject({ object: "list", has_more: true });
    expect(page.data.map((email) => email.id)).toEqual([second]);
    expect(page.data[0]).not.toHaveProperty("html");
    const next = (await (
      await apiRequest(app, "GET", `/v1/received_emails?after=${second}`, { key: tenant.liveKey })
    ).json()) as ReceivedEmailListOutput;
    expect(next.data.map((email) => email.id)).toEqual([first]);

    const res = await apiRequest(app, "GET", `/v1/received_emails/${second}`, {
      key: tenant.liveKey,
    });
    expect(res.status).toBe(200);
    const email = (await res.json()) as ReceivedEmailObjectOutput;
    expect(email).toMatchObject({
      object: "received_email",
      from: "Jane <jane@example.com>",
      recipients: [to],
      text: "Plain body",
      html: "<p>HTML</p>",
      sandbox: false,
    });

    const raw = await apiRequest(app, "GET", `/v1/received_emails/${second}/raw`, {
      key: tenant.liveKey,
    });
    expect(raw.status).toBe(200);
    expect(raw.headers.get("content-type")).toBe("message/rfc822");
    expect(raw.headers.get("x-content-type-options")).toBe("nosniff");
    expect(raw.headers.get("content-disposition")).toStartWith("attachment;");
    expect(await raw.text()).toContain("Subject: Hello");

    const attachmentId = email.attachments[0]?.id ?? "";
    const file = await apiRequest(
      app,
      "GET",
      `/v1/received_emails/${second}/attachments/${attachmentId}`,
      { key: tenant.liveKey },
    );
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("application/octet-stream");
    expect(file.headers.get("content-disposition")).toBe(
      `attachment; filename="invoice 1.pdf"; filename*=UTF-8''invoice%201.pdf`,
    );
    expect(await file.text()).toBe("%PDF-1.7");
  });

  test("another environment's or organization's email is 404", async () => {
    const { tenant, app, inbound, to } = await setup();
    const id = await receive(inbound, to);
    const other = await createTestTenant();
    for (const key of [tenant.sandboxKey, other.liveKey]) {
      for (const path of [`/v1/received_emails/${id}`, `/v1/received_emails/${id}/raw`]) {
        const res = await apiRequest(app, "GET", path, { key });
        expect(res.status).toBe(404);
        expect((await errorOf(res)).code).toBe("not_found");
      }
    }
    const list = (await (
      await apiRequest(app, "GET", "/v1/received_emails", { key: tenant.sandboxKey })
    ).json()) as ReceivedEmailListOutput;
    expect(list.data).toEqual([]);
  });

  test("delete needs receivedEmail:delete and removes the content", async () => {
    const { tenant, app, inbound, to } = await setup();
    const id = await receive(inbound, to);
    const keyId = await apiKeyIdForEnvironment(tenant.production.id);
    await setKeyPermissions(keyId, { email: ["send", "read"] });
    const refused = await apiRequest(app, "DELETE", `/v1/received_emails/${id}`, {
      key: tenant.liveKey,
    });
    expect(refused.status).toBe(403);
    await setKeyPermissions(keyId, { email: ["send", "read"], receivedEmail: ["delete"] });
    const res = await apiRequest(app, "DELETE", `/v1/received_emails/${id}`, {
      key: tenant.liveKey,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ object: "received_email", id, deleted: true });
    const gone = await apiRequest(app, "GET", `/v1/received_emails/${id}`, { key: tenant.liveKey });
    expect(gone.status).toBe(404);
  });

  test("request logs never copy received content", async () => {
    const tenant = await createTestTenant();
    const writer = memoryLogWriter();
    const testApp = createTestApp({ logWriter: writer });
    if (!testApp.inbound) throw new Error("no inbound runtime");
    const { domain } = await inboxOf(testApp.app, tenant.liveKey);
    const id = await receive(testApp.inbound, `a@${domain}`, { subject: "Top secret subject" });
    for (const path of [`/v1/received_emails/${id}`, "/v1/received_emails"]) {
      const res = await apiRequest(testApp.app, "GET", path, { key: tenant.liveKey });
      expect(res.status).toBe(200);
    }
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(writer.entries.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(writer.entries)).not.toContain("Top secret subject");
    expect(JSON.stringify(writer.entries)).not.toContain("Plain body");
  });
});

test("attachment filenames never break out of Content-Disposition", () => {
  expect(attachmentDisposition('a"b\\c\r\nX-Evil: 1.pdf')).toBe(
    `attachment; filename="a_b_c__X-Evil: 1.pdf"; filename*=UTF-8''a%22b%5Cc%0D%0AX-Evil%3A%201.pdf`,
  );
  expect(attachmentDisposition("Rechnung März.pdf")).toBe(
    `attachment; filename="Rechnung M_rz.pdf"; filename*=UTF-8''Rechnung%20M%C3%A4rz.pdf`,
  );
});

describe("POST /v1/domains/{id}/receiving", () => {
  test("receives at a hostname of the domain for the key's environment", async () => {
    const tenant = await createTestTenant();
    const { app, inbound } = createTestApp();
    if (!inbound) throw new Error("no inbound runtime");
    const parent = await createVerifiedDomain(tenant.organization.id);
    const res = await apiRequest(app, "POST", `/v1/domains/${parent.id}/receiving`, {
      key: tenant.sandboxKey,
      body: { hostname: `in.${parent.name}` },
    });
    expect(res.status).toBe(200);
    const domain = (await res.json()) as DomainObjectOutput;
    expect(domain.receiving).toMatchObject({
      hostname: `in.${parent.name}`,
      environment_id: tenant.development.id,
      record: { type: "MX", value: inbound.mxHost, priority: 10 },
    });

    const id = await receive(inbound, `orders@in.${parent.name}`);
    const email = await apiRequest(app, "GET", `/v1/received_emails/${id}`, {
      key: tenant.sandboxKey,
    });
    expect(email.status).toBe(200);
    expect(((await email.json()) as ReceivedEmailObjectOutput).sandbox).toBe(true);

    const again = await apiRequest(app, "POST", `/v1/domains/${parent.id}/receiving`, {
      key: tenant.sandboxKey,
      body: { hostname: parent.name },
    });
    expect(again.status).toBe(422);
    expect((await errorOf(again)).code).toBe("receiving_domain_exists");

    const removed = await apiRequest(app, "DELETE", `/v1/domains/${parent.id}/receiving`, {
      key: tenant.liveKey,
    });
    expect(removed.status).toBe(200);
    expect(((await removed.json()) as DomainObjectOutput).receiving).toBeNull();
    const missing = await apiRequest(app, "DELETE", `/v1/domains/${parent.id}/receiving`, {
      key: tenant.liveKey,
    });
    expect(missing.status).toBe(404);
  });

  test("a hostname outside the domain is 422 invalid_receiving_hostname", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const parent = await createVerifiedDomain(tenant.organization.id);
    const res = await apiRequest(app, "POST", `/v1/domains/${parent.id}/receiving`, {
      key: tenant.liveKey,
      body: { hostname: "elsewhere.example" },
    });
    expect(res.status).toBe(422);
    expect(await errorOf(res)).toMatchObject({
      code: "invalid_receiving_hostname",
      param: "hostname",
    });
  });
});
