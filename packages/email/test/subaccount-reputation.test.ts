import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { getReputationStanding } from "@coss/reputation";
import { screenMessage } from "@coss/screening";
import { fakeClassifier } from "@coss/screening/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { LATEST_API_VERSION } from "@coss/versioning";
import { createWebhookEndpoint } from "@coss/webhooks";
import { testManagementDeps } from "@coss/webhooks/testing";
import { and, eq } from "drizzle-orm";
import { ingestProviderEvents } from "../src/events.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import {
  decideSubaccount,
  reinstateSubaccount,
  runDueSubaccountEvaluations,
} from "../src/subaccount-reputation.ts";
import { createSubaccount, getSubaccount } from "../src/subaccounts.ts";
import { createVerifiedDomain, dispatchingEmailService } from "../src/testing.ts";
import { params, sendEnvironment } from "./helpers.ts";

async function setup(opts: { screen?: boolean } = {}) {
  const tenant = await createTestTenant();
  const organizationId = tenant.organization.id;
  const live = { organizationId, environmentId: tenant.production.id };
  const a = await createSubaccount({ ...live, name: "A", uid: "a" });
  const b = await createSubaccount({ ...live, name: "B", uid: "b" });
  const shared = await createVerifiedDomain(organizationId);
  await db
    .update(schema.domain)
    .set({ sharedWithSubaccounts: true })
    .where(eq(schema.domain.id, shared.id));
  // Small minimum volumes, so a handful of emails is enough to act on.
  await db
    .insert(schema.reputationStanding)
    .values({
      organizationId,
      policyOverrides: {
        bounceRate: { minimumRecipients: 4 },
        complaintRate: { minimumRecipients: 4 },
      },
    })
    .onConflictDoNothing();
  const provider = new FakeEmailProvider({ log: false });
  const service = dispatchingEmailService({
    liveProvider: provider,
    sandboxProvider: provider,
    ...(opts.screen
      ? { screen: (input) => screenMessage(input, { classifier: fakeClassifier() }) }
      : {}),
  });
  const send = (subaccount: string, to: string, html = "<p>Hi</p>") =>
    service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from: `hello@${shared.name}`, to, subaccount, html, text: undefined }),
    });
  return { tenant, organizationId, a, b, send };
}

function bounce(emailId: string, address: string) {
  return {
    provider: "fake",
    providerEventType: "Bounce",
    emailId,
    providerMessageId: null,
    type: "email.bounced" as const,
    recipients: [address],
    occurredAt: new Date(),
    sourceId: crypto.randomUUID(),
    data: { bounce: { type: "permanent" as const, sub_type: "General", diagnostic_code: null } },
  };
}

const refusal = (promise: Promise<unknown>) => promise.then(() => null).catch((error) => error);

describe("sub-account reputation", () => {
  test("decides like the guard, but a pause is never lifted on its own", () => {
    const result = (severity: "ok" | "warning" | "suspend") => ({
      trigger: "bounce_rate",
      severity,
      message: "",
      rate: null,
      count: 0,
      volume: 0,
      warningThreshold: null,
      suspendThreshold: null,
      minimumVolume: null,
    });
    expect(decideSubaccount("good", [result("warning")])).toEqual({
      to: "warning",
      trigger: "bounce_rate",
    });
    expect(decideSubaccount("warning", [result("suspend")])).toEqual({
      to: "paused",
      trigger: "bounce_rate",
    });
    expect(decideSubaccount("warning", [result("ok")])).toEqual({
      to: "good",
      trigger: "recovered",
    });
    expect(decideSubaccount("paused", [result("ok")])).toBeNull();
  });

  test("its own bounces pause it; others keep sending; reinstating measures again", async () => {
    const { tenant, organizationId, a, send } = await setup();
    const endpoint = await createWebhookEndpoint(
      {
        organizationId,
        environmentId: tenant.production.id,
        url: "https://example.com/hooks",
        eventTypes: ["subaccount.paused", "subaccount.reinstated"],
        apiVersion: LATEST_API_VERSION,
        userId: null,
      },
      testManagementDeps,
    );
    const emails = [];
    for (let index = 0; index < 4; index++) {
      emails.push((await send("a", `user${index}@example.com`)).email);
    }
    await ingestProviderEvents(
      emails.slice(0, 2).map((email, index) => bounce(email.id, `user${index}@example.com`)),
    );
    const scope = { organizationIds: [organizationId] };
    expect(await runDueSubaccountEvaluations({ scope })).toBe(1);
    expect(await getSubaccount({ organizationId, id: a.id })).toMatchObject({
      reputationStatus: "paused",
      reputationTrigger: "bounce_rate",
    });

    expect(await refusal(send("a", "next@example.com"))).toMatchObject({
      code: "subaccount_paused",
      status: 403,
    });
    expect((await send("b", "next@example.com")).email.status).toBe("sent");
    // Only the sub-account's own scan ran: the organization keeps its standing.
    expect((await getReputationStanding(organizationId))?.status ?? "good").toBe("good");

    const messages = await db
      .select({ type: schema.webhookMessage.type })
      .from(schema.webhookMessage)
      .where(eq(schema.webhookMessage.organizationId, organizationId));
    expect(messages.map((row) => row.type)).toContain("subaccount.paused");
    expect(endpoint.endpoint.id).toStartWith("whep_");

    const { row, changed } = await reinstateSubaccount({ organizationId, id: a.id });
    expect(changed).toBe(true);
    expect(row).toMatchObject({ reputationStatus: "good", reputationTrigger: "reinstated" });
    expect(row.reinstatedAt).not.toBeNull();
    // Measured from the reinstatement: the old bounces no longer count.
    expect((await send("a", "after@example.com")).email.status).toBe("sent");
    expect((await reinstateSubaccount({ organizationId, id: a.id })).changed).toBe(false);
  });

  test("a screening block pauses the sub-account, never the organization", async () => {
    const { organizationId, a, send } = await setup({ screen: true });
    const blocked = await send("a", "victim@example.com", "<p>[coss-test:phishing] Log in</p>");
    expect(blocked.email.status).toBe("failed");
    expect(await getSubaccount({ organizationId, id: a.id })).toMatchObject({
      reputationStatus: "paused",
      reputationTrigger: "content_screening",
    });
    expect((await getReputationStanding(organizationId))?.status ?? "good").toBe("good");
    // Its verdict carries the group, so the organization's own check leaves it out.
    const [verdict] = await db
      .select()
      .from(schema.contentScreening)
      .where(
        and(
          eq(schema.contentScreening.organizationId, organizationId),
          eq(schema.contentScreening.subjectId, blocked.email.id),
        ),
      );
    expect(verdict).toMatchObject({ verdict: "blocked", groupId: a.id });
    expect((await send("b", "fine@example.com")).email.status).toBe("sent");
  });
});
