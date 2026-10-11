import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import {
  listReputationNotifications,
  runDueReputationNotifications,
  suspendOrganization,
} from "@coss/reputation";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { emailReputationNotifier, notificationEnvironment } from "../src/reputation-notifier.ts";
import { dispatchingEmailService } from "../src/testing.ts";
import { verifiedFrom } from "./helpers.ts";

const provider = new FakeEmailProvider({ log: false });
const service = dispatchingEmailService({ liveProvider: provider, sandboxProvider: provider });

describe("emailReputationNotifier", () => {
  test("sends notices from the platform's live environment, once per key", async () => {
    const platform = await createTestTenant();
    const from = await verifiedFrom(platform.organization.id);
    const notifier = emailReputationNotifier({
      service,
      environment: await notificationEnvironment(platform.production.id),
      from,
    });
    const customer = await createTestTenant();
    const now = new Date();
    await suspendOrganization({
      organizationId: customer.organization.id,
      trigger: "complaint_rate",
      actor: { kind: "system" },
      now,
    });
    const deps = { notifier, dashboardUrl: "https://coss.test" };
    const scope = { organizationIds: [customer.organization.id] };
    expect(await runDueReputationNotifications({ now, scope }, deps)).toBe(1);

    const emails = await db
      .select()
      .from(schema.email)
      .where(eq(schema.email.environmentId, platform.production.id));
    expect(emails).toHaveLength(1);
    const [sent] = emails;
    expect(sent).toMatchObject({
      organizationId: platform.organization.id,
      from,
      to: [customer.owner.email],
      subject: `Live sending is suspended for ${customer.organization.name}`,
      category: "account",
      trackOpens: false,
      trackClicks: false,
      status: "sent",
    });
    expect(sent?.text).toContain("Reason: Complaint rate.");
    const [row] = await listReputationNotifications(customer.organization.id);
    expect(row).toMatchObject({ status: "sent", recipients: [customer.owner.email] });

    // A retry after a crash (same key, possibly re-rendered content) never sends twice.
    const notice = {
      idempotencyKey: `${row?.id}:${customer.owner.id}`,
      to: customer.owner.email,
      subject: "Renamed in between",
      text: "Hi",
      html: "<p>Hi</p>",
    };
    await notifier.send(notice);
    const after = await db
      .select({ id: schema.email.id })
      .from(schema.email)
      .where(eq(schema.email.environmentId, platform.production.id));
    expect(after).toHaveLength(1);
  });

  test("refuses a sandbox environment or an invalid sender", async () => {
    const platform = await createTestTenant();
    await expect(notificationEnvironment(platform.development.id)).rejects.toThrow(
      "must be a live environment",
    );
    await expect(notificationEnvironment("env_missing")).rejects.toThrow("does not exist");
    expect(() =>
      emailReputationNotifier({
        service,
        environment: {
          organizationId: platform.organization.id,
          projectId: platform.project.id,
          environmentId: platform.production.id,
          mode: "live",
        },
        from: "not an address",
      }),
    ).toThrow("Invalid notification sender");
  });

  test("a sender the platform may not use fails the attempt (retried later)", async () => {
    const platform = await createTestTenant();
    const notifier = emailReputationNotifier({
      service,
      environment: await notificationEnvironment(platform.production.id),
      from: "COSS <notifications@unverified.coss.test>",
    });
    const customer = await createTestTenant();
    const now = new Date();
    await suspendOrganization({
      organizationId: customer.organization.id,
      trigger: "manual",
      actor: { kind: "system" },
      now,
    });
    const scope = { organizationIds: [customer.organization.id] };
    await runDueReputationNotifications(
      { now, scope },
      { notifier, dashboardUrl: "https://x.test" },
    );
    const [row] = await listReputationNotifications(customer.organization.id);
    expect(row?.status).toBe("pending");
    expect(row?.attemptCount).toBe(1);
    expect(row?.lastError).toBeTruthy();
  });
});
