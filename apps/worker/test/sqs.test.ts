import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { getEmail } from "@coss/email";
import { createEmailRuntime } from "@coss/email/runtime";
import { createVerifiedDomain, dispatchingEmailService, FakeSesApi } from "@coss/email/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import { pollSesEvents, type QueueMessage, type SqsApi } from "../src/sqs.ts";

function fakeQueue(bodies: string[]) {
  const messages: QueueMessage[] = bodies.map((body, index) => ({
    id: `m${index}`,
    receiptHandle: `r${index}`,
    body,
  }));
  const deleted: string[] = [];
  const sqs: SqsApi = {
    receive: async () => messages.splice(0, 10),
    delete: async (done) => {
      deleted.push(...done.map((m) => m.id));
    },
  };
  return { sqs, deleted };
}

describe("pollSesEvents", () => {
  test("records events and tenant changes, and keeps what it couldn't parse", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const tenantPrefix = `w${uniqueSuffix()}`;
    const api = new FakeSesApi();
    const runtime = createEmailRuntime({
      provider: "ses",
      ses: {
        region: "eu-west-1",
        configurationSets: { transactional: "coss", marketing: "coss-marketing" },
        tenantPrefix,
      },
      sesApi: api,
      dns: null,
      log: false,
    });
    const domain = await createVerifiedDomain(organizationId, { provider: "ses" });
    const tenantName = `${tenantPrefix}-${organizationId}`;
    await db.insert(schema.emailTenant).values({ organizationId, provider: "ses", tenantName });
    const { email } = await dispatchingEmailService(runtime).send({
      environment: {
        organizationId,
        projectId: tenant.project.id,
        environmentId: tenant.production.id,
        mode: "live",
      },
      apiKeyId: null,
      params: {
        from: `hello@${domain.name}`,
        to: ["a@example.com"],
        cc: [],
        bcc: [],
        reply_to: [],
        subject: "Hi",
        html: null,
        text: "Hi",
        headers: {},
        tags: [],
      },
    });
    const mail = {
      timestamp: new Date().toISOString(),
      messageId: "ses-1",
      destination: ["a@example.com"],
      tags: { coss_email_id: [email.id] },
    };
    const delivery = JSON.stringify({
      eventType: "Delivery",
      mail,
      delivery: { timestamp: new Date().toISOString(), recipients: ["a@example.com"] },
    });
    const { sqs, deleted } = fakeQueue([
      delivery,
      // Redelivered by SQS: recorded once.
      delivery,
      JSON.stringify({ eventType: "Open", mail, open: {} }),
      "{not json",
      JSON.stringify({
        source: "aws.ses",
        "detail-type": "Sending Status Disabled",
        time: new Date().toISOString(),
        resources: [`arn:aws:ses:eu-west-1:123456789012:tenant/${tenantName}/t-1`],
        detail: { data: { record: { status: "DISABLED", cause: "Complaints" } } },
      }),
    ]);

    expect(await pollSesEvents(sqs, { tenantPrefix })).toBe(5);

    expect(deleted).toEqual(["m0", "m1", "m2", "m4"]);
    const after = await getEmail({
      organizationId,
      environmentId: tenant.production.id,
      id: email.id,
    });
    expect(after?.recipients).toMatchObject([{ address: "a@example.com", status: "delivered" }]);
    const [row] = await db
      .select()
      .from(schema.emailTenant)
      .where(eq(schema.emailTenant.organizationId, organizationId));
    expect(row).toMatchObject({ sendingStatus: "disabled", statusCause: "Complaints" });
  });
});
