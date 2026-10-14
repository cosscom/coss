import { describe, expect, test } from "bun:test";
import { pool } from "@coss/db";
import type { EmailObjectOutput } from "@coss/email/schemas";
import { createVerifiedDomain } from "@coss/email/testing";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { apiRequest, createTestApp, emailBody, sendEmail } from "./helpers.ts";

async function auditEvents(tenant: TestTenant) {
  const { rows } = await pool.query<{
    action: string;
    target_id: string | null;
    environment_id: string | null;
    metadata: Record<string, unknown>;
  }>(
    "select action, target_id, environment_id, metadata from org_audit_event where organization_id = $1 and actor_type = 'api_key' order by id",
    [tenant.organization.id],
  );
  return rows;
}

describe("audit events of API changes", () => {
  test("secret rolls, tracking domains, cancels and reschedules are recorded", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const created = await apiRequest(app, "POST", "/v1/webhook_endpoints", {
      key: tenant.sandboxKey,
      body: { url: "https://hooks.example.com/coss" },
    });
    const endpoint = (await created.json()) as { id: string };
    const rolled = await apiRequest(
      app,
      "POST",
      `/v1/webhook_endpoints/${endpoint.id}/roll_secret`,
      {
        key: tenant.sandboxKey,
        body: { previous_secret_expires_in: 0 },
      },
    );
    expect(rolled.status).toBe(200);

    const domain = await createVerifiedDomain(tenant.organization.id);
    const hostname = `links.${domain.name}`;
    const path = `/v1/domains/${domain.id}/tracking`;
    expect(
      (await apiRequest(app, "POST", path, { key: tenant.liveKey, body: { hostname } })).status,
    ).toBe(200);
    expect((await apiRequest(app, "DELETE", path, { key: tenant.liveKey })).status).toBe(200);

    const inAnHour = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const inADay = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const scheduled = (await (
      await sendEmail(app, tenant.sandboxKey, emailBody({ scheduled_at: inAnHour }))
    ).json()) as EmailObjectOutput;
    const moved = await apiRequest(app, "POST", `/v1/emails/${scheduled.id}/reschedule`, {
      key: tenant.sandboxKey,
      body: { scheduled_at: inADay },
    });
    expect(moved.status).toBe(200);
    const canceled = await apiRequest(app, "POST", `/v1/emails/${scheduled.id}/cancel`, {
      key: tenant.sandboxKey,
    });
    expect(canceled.status).toBe(200);

    const events = await auditEvents(tenant);
    expect(events.map((event) => [event.action, event.target_id])).toEqual([
      ["webhook_endpoint.created", endpoint.id],
      ["webhook_endpoint.secret_rolled", endpoint.id],
      ["tracking_domain.created", domain.id],
      ["tracking_domain.deleted", domain.id],
      ["email.rescheduled", scheduled.id],
      ["email.canceled", scheduled.id],
    ]);
    expect(events[1]?.metadata).toMatchObject({ previous_secret_expires_in: 0 });
    // Tracking domains belong to the organization, not an environment.
    expect(events[2]?.environment_id).toBeNull();
    expect(events[2]?.metadata).toMatchObject({ hostname });
    expect(events[4]?.metadata).toMatchObject({ scheduled_at: inADay });
  });
});
