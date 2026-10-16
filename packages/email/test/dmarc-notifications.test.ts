import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import {
  listDmarcNotifications,
  renderDmarcNotification,
  runDueDmarcNotifications,
} from "../src/dmarc-notifications.ts";
import type { Notice } from "../src/notifier.ts";
import { createVerifiedDomain } from "../src/testing.ts";

const RECORD = "v=DMARC1; p=quarantine; rua=mailto:dmarc-abcdefghijkmnpqr@inbound.coss.test;";

function capture() {
  const sent: Notice[] = [];
  return {
    sent,
    deps: {
      dashboardUrl: "https://coss.test",
      notifier: {
        async send(notice: Notice) {
          sent.push(notice);
        },
      },
    },
  };
}

async function setup() {
  const tenant = await createTestTenant();
  const organizationId = tenant.organization.id;
  const since = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
  const row = await createVerifiedDomain(organizationId);
  await db
    .update(schema.domain)
    .set({ dmarcRecord: "v=DMARC1; p=none", dmarcPolicyChangedAt: since })
    .where(eq(schema.domain.id, row.id));
  const [notification] = await db
    .insert(schema.dmarcNotification)
    .values({
      organizationId,
      domainId: row.id,
      kind: "ready_quarantine",
      dedupeKey: `ready_quarantine:${row.id}:${since.toISOString()}`,
      policyChangedAt: since,
      detail: { record: RECORD },
      nextAttemptAt: new Date(),
    })
    .returning();
  return {
    tenant,
    organizationId,
    row,
    notification,
    scope: { organizationIds: [organizationId] },
  };
}

describe("runDueDmarcNotifications", () => {
  test("emails owners the record to publish, once", async () => {
    const { tenant, row, scope, organizationId } = await setup();
    const { sent, deps } = capture();
    expect(await runDueDmarcNotifications({ scope }, deps)).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      to: tenant.owner.email,
      subject: `${row.name} is ready for DMARC p=quarantine`,
    });
    expect(sent[0]?.text).toContain(RECORD);
    expect(sent[0]?.text).toContain(
      `https://coss.test/${tenant.organization.slug}/domains/${row.id}/dmarc`,
    );
    const [settled] = await listDmarcNotifications(organizationId);
    expect(settled).toMatchObject({ status: "sent", recipients: [tenant.owner.email] });
    expect(await runDueDmarcNotifications({ scope }, deps)).toBe(0);
  });

  test("skips a notification whose policy changed since it was queued", async () => {
    const { row, scope, organizationId } = await setup();
    await db
      .update(schema.domain)
      .set({ dmarcRecord: "v=DMARC1; p=quarantine", dmarcPolicyChangedAt: new Date() })
      .where(eq(schema.domain.id, row.id));
    const { sent, deps } = capture();
    await runDueDmarcNotifications({ scope }, deps);
    expect(sent).toHaveLength(0);
    const [settled] = await listDmarcNotifications(organizationId);
    expect(settled).toMatchObject({ status: "skipped" });
  });

  test("retries a failed send with backoff", async () => {
    const { scope, organizationId } = await setup();
    const now = new Date();
    await runDueDmarcNotifications(
      { scope, now },
      {
        dashboardUrl: "https://coss.test",
        notifier: {
          async send() {
            throw new Error("smtp down");
          },
        },
      },
    );
    const [row] = await listDmarcNotifications(organizationId);
    expect(row).toMatchObject({ status: "pending", attemptCount: 1, lastError: "smtp down" });
    expect(row?.nextAttemptAt?.getTime()).toBe(now.getTime() + 60_000);
  });
});

describe("renderDmarcNotification", () => {
  test("escapes names and keeps subjects on one line", () => {
    const message = renderDmarcNotification({
      kind: "pass_rate_dropped",
      domain: "acme.test",
      organizationName: "Acme <script>\nInc",
      detail: { policy: "reject", coss_pass_rate: 0.9 },
      url: "https://coss.test/acme/domains/dom_1/dmarc",
    });
    expect(message.subject).toBe("Mail from acme.test is failing DMARC");
    expect(message.text).toContain("only 90.0% of the mail acme.test sends through COSS");
    expect(message.html).not.toContain("<script>");
    expect(message.text).toContain("owner or admin of Acme <script> Inc");
  });
});
