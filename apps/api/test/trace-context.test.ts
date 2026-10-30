import { describe, expect, test } from "bun:test";
import { pool } from "@coss/db";
import { SMS_SIMULATOR } from "@coss/sms/schemas";
import { createTestTenant } from "@coss/tenancy/testing";
import { runDueWebhookDeliveries, type WebhookRequest } from "@coss/webhooks";
import { TEST_SECRETS_KEYS } from "@coss/webhooks/testing";
import { apiRequest, createTestApp, emailBody, sendEmail, type TestApp } from "./helpers.ts";

const TRACEPARENT = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

/** The stored `traceparent` of emails or text messages, in the order of `ids`. */
async function stored(table: "email" | "sms_message", organizationId: string, ids: string[]) {
  const { rows } = await pool.query<{ id: string; traceparent: string | null }>(
    `select id, traceparent from ${table} where organization_id = $1 and id = any($2)`,
    [organizationId, ids],
  );
  return ids.map((id) => rows.find((row) => row.id === id)?.traceparent);
}

type Line = { type: string; attributes: Record<string, unknown> };

async function subscribe(app: TestApp, key: string, eventTypes: string[]): Promise<void> {
  const res = await apiRequest(app, "POST", "/v1/webhook_endpoints", {
    key,
    body: { url: "https://hooks.example.com/coss", event_types: eventTypes },
  });
  expect(res.status).toBe(200);
}

async function deliver(organizationId: string): Promise<WebhookRequest[]> {
  const sent: WebhookRequest[] = [];
  await runDueWebhookDeliveries(
    { scope: { organizationIds: [organizationId] } },
    {
      secretsKeys: TEST_SECRETS_KEYS,
      send: async (request) => {
        sent.push(request);
        return { status: 204, body: "" };
      },
    },
  );
  return sent;
}

async function logLines(organizationId: string, where: { resourceIds?: string[]; type?: string }) {
  const { rows } = await pool.query<Line>(
    `select type, attributes from log_entry where organization_id = $1
       and ($2::text[] is null or resource_id = any($2)) and ($3::text is null or type = $3)`,
    [organizationId, where.resourceIds ?? null, where.type ?? null],
  );
  return rows;
}

describe("traceparent", () => {
  test("an email's log lines and webhooks echo the traceparent it was sent with", async () => {
    const tenant = await createTestTenant();
    const { app, dispatch } = createTestApp();
    await subscribe(app, tenant.sandboxKey, ["email.sent", "email.delivered"]);
    const res = await sendEmail(app, tenant.sandboxKey, emailBody(), {
      // Of several (an instrumented `fetch` appends its own), the last one counts.
      traceparent: `00-${"1".repeat(32)}-${"2".repeat(16)}-01, ${TRACEPARENT}`,
    });
    expect(res.status).toBe(202);
    const { id } = (await res.json()) as { id: string };
    await dispatch();

    expect(await stored("email", tenant.organization.id, [id])).toEqual([TRACEPARENT]);

    const lines = await logLines(tenant.organization.id, { resourceIds: [id] });
    const eventLines = lines.filter((line) => line.type.startsWith("email."));
    expect(eventLines.length).toBeGreaterThan(0);
    for (const line of eventLines) expect(line.attributes.traceparent).toBe(TRACEPARENT);

    const sent = await deliver(tenant.organization.id);
    expect(sent.length).toBeGreaterThan(0);
    for (const request of sent) {
      expect(request.headers.traceparent).toBe(TRACEPARENT);
      expect(JSON.parse(request.body).data.traceparent).toBe(TRACEPARENT);
    }
    // The attempt's own log line names the trace too.
    const attempts = await logLines(tenant.organization.id, { type: "webhook.attempt" });
    expect(attempts.length).toBe(sent.length);
    for (const line of attempts) expect(line.attributes.traceparent).toBe(TRACEPARENT);
  });

  test("a batch stores it on every email", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const res = await apiRequest(app, "POST", "/v1/emails/batch", {
      key: tenant.sandboxKey,
      body: { emails: [emailBody(), emailBody({ to: "other@example.com" })] },
      headers: { traceparent: TRACEPARENT },
    });
    expect(res.status).toBe(202);
    const { data } = (await res.json()) as { data: { id: string }[] };
    const ids = data.map((item) => item.id);
    expect(await stored("email", tenant.organization.id, ids)).toEqual([TRACEPARENT, TRACEPARENT]);
  });

  test("without one (or with an invalid one) nothing is added", async () => {
    const tenant = await createTestTenant();
    const { app, dispatch } = createTestApp();
    await subscribe(app, tenant.sandboxKey, ["email.sent"]);
    const ids: string[] = [];
    for (const traceparent of [
      undefined,
      "00-4BF92F3577B34DA6A3CE929D0E0E4736-00F067AA0BA902B7-01",
      `00-${"0".repeat(32)}-00f067aa0ba902b7-01`,
      `ff-${"1".repeat(32)}-${"2".repeat(16)}-01`,
      `${TRACEPARENT}-extra`,
    ]) {
      const res = await sendEmail(
        app,
        tenant.sandboxKey,
        emailBody(),
        traceparent ? { traceparent } : {},
      );
      expect(res.status).toBe(202);
      ids.push(((await res.json()) as { id: string }).id);
    }
    await dispatch();
    expect(await stored("email", tenant.organization.id, ids)).toEqual(ids.map(() => null));
    for (const line of await logLines(tenant.organization.id, { resourceIds: ids })) {
      expect(line.attributes).not.toHaveProperty("traceparent");
    }
    const sent = await deliver(tenant.organization.id);
    expect(sent).toHaveLength(ids.length);
    for (const request of sent) {
      expect(request.headers).not.toHaveProperty("traceparent");
      expect(JSON.parse(request.body).data).not.toHaveProperty("traceparent");
    }
  });

  test("an inbox's sends store it too", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = await apiRequest(app, "POST", "/v1/inboxes", {
      key: tenant.sandboxKey,
      body: { username: "traced-agent" },
    });
    expect(created.status).toBe(201);
    const inbox = (await created.json()) as { id: string };
    const res = await apiRequest(app, "POST", `/v1/inboxes/${inbox.id}/messages`, {
      key: tenant.sandboxKey,
      body: { to: "bob@example.com", subject: "Hello Bob", text: "Hi!" },
      headers: { traceparent: TRACEPARENT },
    });
    expect(res.status).toBe(202);
    const { email_id: emailId } = (await res.json()) as { email_id: string };
    expect(await stored("email", tenant.organization.id, [emailId])).toEqual([TRACEPARENT]);
  });

  test("a later version is stored as version 00", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const res = await sendEmail(app, tenant.sandboxKey, emailBody(), {
      traceparent: `01-${TRACEPARENT.slice(3)}-future`,
    });
    const { id } = (await res.json()) as { id: string };
    expect(await stored("email", tenant.organization.id, [id])).toEqual([TRACEPARENT]);
  });

  test("a text message's log lines and webhooks echo it too", async () => {
    const tenant = await createTestTenant();
    const { app, dispatchSms } = createTestApp();
    await subscribe(app, tenant.sandboxKey, ["sms.sent", "sms.delivered"]);
    const res = await apiRequest(app, "POST", "/v1/sms", {
      key: tenant.sandboxKey,
      body: { from: "+14155550123", to: SMS_SIMULATOR.delivered, body: "Hello" },
      headers: { traceparent: TRACEPARENT },
    });
    expect(res.status).toBe(202);
    const { id } = (await res.json()) as { id: string };
    await dispatchSms();

    expect(await stored("sms_message", tenant.organization.id, [id])).toEqual([TRACEPARENT]);
    const lines = (await logLines(tenant.organization.id, { resourceIds: [id] })).filter((line) =>
      line.type.startsWith("sms."),
    );
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line.attributes.traceparent).toBe(TRACEPARENT);

    const sent = await deliver(tenant.organization.id);
    expect(sent.length).toBeGreaterThan(0);
    for (const request of sent) {
      expect(request.headers.traceparent).toBe(TRACEPARENT);
      expect(JSON.parse(request.body).data.traceparent).toBe(TRACEPARENT);
    }
  });
});
