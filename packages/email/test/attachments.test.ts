import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { db, schema } from "@coss/db";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { asc, eq, sql } from "drizzle-orm";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { getEmail } from "../src/read.ts";
import { CreateSuppressionRequest } from "../src/schemas.ts";
import { createEmailService } from "../src/service.ts";
import { addSuppression } from "../src/suppressions.ts";
import { sweepStaleClaims } from "../src/sweeps.ts";
import { gatedProvider, params, sendEnvironment } from "./helpers.ts";

const pdf = Buffer.from("%PDF-1.7 invoice");
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

const withAttachments = (overrides: Parameters<typeof params>[0] = {}) =>
  params({
    html: '<p>Hi <img src="cid:logo@acme"></p>',
    attachments: [
      { filename: "invoice.pdf", content: pdf.toString("base64") },
      { filename: "logo.png", content: png.toString("base64"), content_id: "logo@acme" },
    ],
    ...overrides,
  });

async function storedAttachments(emailId: string) {
  return db
    .select()
    .from(schema.emailAttachment)
    .where(eq(schema.emailAttachment.emailId, emailId))
    .orderBy(asc(schema.emailAttachment.position));
}

function fakeProviders(opts: { fail?: boolean } = {}) {
  const liveProvider = new FakeEmailProvider({ log: false });
  const sandboxProvider = new FakeEmailProvider({ log: false, fail: () => opts.fail ?? false });
  return { sandboxProvider, service: createEmailService({ liveProvider, sandboxProvider }) };
}

const read = (tenant: TestTenant, id: string) =>
  getEmail({
    organizationId: tenant.organization.id,
    environmentId: tenant.development.id,
    id,
  });

describe("attachments", () => {
  test("are handed to the provider, returned as metadata and purged after sending", async () => {
    const tenant = await createTestTenant();
    const { service, sandboxProvider } = fakeProviders();

    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: withAttachments(),
    });

    expect(email.status).toBe("sent");
    expect(email.attachments).toEqual([
      {
        id: expect.stringMatching(/^att_/),
        filename: "invoice.pdf",
        content_type: "application/pdf",
        content_id: null,
        size: pdf.byteLength,
      },
      {
        id: expect.stringMatching(/^att_/),
        filename: "logo.png",
        content_type: "image/png",
        content_id: "logo@acme",
        size: png.byteLength,
      },
    ]);
    expect(await read(tenant, email.id)).toEqual(email);
    expect(sandboxProvider.sent[0]?.attachments).toEqual([
      {
        filename: "invoice.pdf",
        contentType: "application/pdf",
        contentId: null,
        size: pdf.byteLength,
        sha256: sha256(pdf),
      },
      {
        filename: "logo.png",
        contentType: "image/png",
        contentId: "logo@acme",
        size: png.byteLength,
        sha256: sha256(png),
      },
    ]);

    const rows = await storedAttachments(email.id);
    expect(rows.map((row) => [row.organizationId, row.sha256, row.content])).toEqual([
      [tenant.organization.id, sha256(pdf), null],
      [tenant.organization.id, sha256(png), null],
    ]);
  });

  test("emails without attachments have none", async () => {
    const tenant = await createTestTenant();
    const { service, sandboxProvider } = fakeProviders();
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params(),
    });
    expect(email.attachments).toEqual([]);
    expect(sandboxProvider.sent[0]?.attachments).toEqual([]);
  });

  test("are purged when the provider rejects the email", async () => {
    const tenant = await createTestTenant();
    const { service } = fakeProviders({ fail: true });
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: withAttachments(),
    });
    expect(email).toMatchObject({ status: "failed", attachments: [{}, {}] });
    expect((await storedAttachments(email.id)).map((row) => row.content)).toEqual([null, null]);
  });

  test("are purged when every recipient is suppressed", async () => {
    const tenant = await createTestTenant();
    const { service, sandboxProvider } = fakeProviders();
    await addSuppression(
      { organizationId: tenant.organization.id, environmentId: tenant.development.id },
      CreateSuppressionRequest.parse({ address: "user@example.com" }),
    );
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: withAttachments(),
    });
    expect(email.status).toBe("failed");
    expect(sandboxProvider.sent).toHaveLength(0);
    expect((await storedAttachments(email.id)).map((row) => row.content)).toEqual([null, null]);
  });

  test("an idempotent replay returns the same metadata", async () => {
    const tenant = await createTestTenant();
    const { service, sandboxProvider } = fakeProviders();
    const input = {
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: withAttachments(),
      idempotencyKey: "attachments-replay",
    };
    const first = await service.send(input);
    const second = await service.send(input);
    expect(second).toEqual({ email: first.email, replayed: true });
    expect(sandboxProvider.sent).toHaveLength(1);
  });

  test("an email whose content is gone is failed instead of sent without it", async () => {
    const tenant = await createTestTenant();
    const gated = gatedProvider("fake");
    const service = createEmailService({
      liveProvider: gated.provider,
      sandboxProvider: gated.provider,
    });
    const [row] = await db
      .insert(schema.email)
      .values({
        organizationId: tenant.organization.id,
        projectId: tenant.project.id,
        environmentId: tenant.development.id,
        from: "hello@acme.com",
        to: ["user@example.com"],
        subject: "Queued",
        text: "Hi",
      })
      .returning();
    if (!row) throw new Error("insert failed");
    await db.insert(schema.emailAttachment).values({
      organizationId: row.organizationId,
      emailId: row.id,
      position: 0,
      filename: "invoice.pdf",
      contentType: "application/pdf",
      size: pdf.byteLength,
      sha256: sha256(pdf),
      content: null,
    });

    const email = await service.dispatch({ organizationId: row.organizationId, emailId: row.id });
    expect(email.status).toBe("failed");
    expect(gated.sent).toHaveLength(0);
    const [stored] = await db.select().from(schema.email).where(eq(schema.email.id, row.id));
    expect(stored?.errorCode).toBe("attachments_unavailable");
  });

  test("a queued email keeps its content until dispatch delivers it", async () => {
    const tenant = await createTestTenant();
    const gated = gatedProvider("fake");
    const service = createEmailService({
      liveProvider: gated.provider,
      sandboxProvider: gated.provider,
    });
    const sending = service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: withAttachments(),
    });
    await gated.called;
    const [message] = gated.sent;
    if (!message) throw new Error("not sent");
    expect(message.attachments.map((a) => Buffer.from(a.content).toString("base64"))).toEqual([
      pdf.toString("base64"),
      png.toString("base64"),
    ]);
    // Still queued while the provider call is in flight: the content is still there.
    const inFlight = await storedAttachments(message.emailId);
    expect(inFlight.map((row) => row.content?.equals(row.position === 0 ? pdf : png))).toEqual([
      true,
      true,
    ]);
    gated.release();
    expect((await sending).email.status).toBe("sent");
    expect((await storedAttachments(message.emailId)).map((row) => row.content)).toEqual([
      null,
      null,
    ]);
  });

  test("are purged when the stale-claim sweep resolves an interrupted send", async () => {
    const tenant = await createTestTenant();
    const gated = gatedProvider("fake");
    const service = createEmailService({
      liveProvider: gated.provider,
      sandboxProvider: gated.provider,
    });
    void service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: withAttachments(),
    });
    await gated.called;
    const [message] = gated.sent;
    if (!message) throw new Error("not sent");
    await db
      .update(schema.email)
      .set({ updatedAt: sql`now() - interval '1 hour'` })
      .where(eq(schema.email.id, message.emailId));

    expect(await sweepStaleClaims({ scope: { organizationIds: [tenant.organization.id] } })).toBe(
      1,
    );
    expect((await storedAttachments(message.emailId)).map((row) => row.content)).toEqual([
      null,
      null,
    ]);
    gated.release();
  });
});
