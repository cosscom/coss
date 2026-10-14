import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { buildTestMessage, inboundAddressFor } from "@coss/email";
import { S3InboundStore } from "@coss/email/ses";
import { FakeS3Api, sesReceiptNotification } from "@coss/email/testing";
import { memoryLimiter } from "@coss/ratelimit/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import { inboundQuota, pollSesInbound } from "../src/inbound.ts";
import type { QueueMessage, SqsApi } from "../src/sqs.ts";

const MANAGED = "inbound.coss.test";
const BUCKET = "coss-inbound";

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

describe("pollSesInbound", () => {
  test("records a receipt, deletes its landing object, and keeps what failed", async () => {
    const tenant = await createTestTenant();
    const { domain } = await inboundAddressFor(
      { organizationId: tenant.organization.id, environmentId: tenant.production.id },
      MANAGED,
    );
    const s3 = new FakeS3Api();
    const messageId = `ses-${uniqueSuffix()}`;
    const objectKey = `landing/${messageId}`;
    const to = `orders@${domain}`;
    await s3.putObject(
      BUCKET,
      objectKey,
      buildTestMessage({ from: "jane@example.com", to: [to], subject: "Order", text: "Hi" }),
      "message/rfc822",
    );
    const receipt = sesReceiptNotification({
      messageId,
      source: "jane@example.com",
      recipients: [to, "nobody@unrouted.example"],
      bucketName: BUCKET,
      objectKey,
      verdicts: { spam: "GRAY" },
    });
    const failing = sesReceiptNotification({
      messageId: `ses-${uniqueSuffix()}`,
      source: "jane@example.com",
      recipients: [to],
      bucketName: BUCKET,
      objectKey: "landing/unreadable",
    });
    const { sqs, deleted } = fakeQueue([
      receipt,
      // Redelivered: the landing object is gone, nothing is recorded twice.
      receipt,
      JSON.stringify({ notificationType: "AMAZON_SES_SETUP_NOTIFICATION" }),
      failing,
    ]);
    const getObject = s3.getObject.bind(s3);
    s3.getObject = async (bucket, key) => {
      if (key === "landing/unreadable") throw new Error("S3 is down");
      return getObject(bucket, key);
    };
    const store = new S3InboundStore(s3, BUCKET);

    expect(
      await pollSesInbound({ sqs, s3, bucket: BUCKET, inbound: { store, managedDomain: MANAGED } }),
    ).toBe(4);
    expect(deleted).toEqual(["m0", "m1", "m2"]);
    expect(s3.objects.has(`${BUCKET}/${objectKey}`)).toBe(false);

    const rows = await db
      .select()
      .from(schema.receivedEmail)
      .where(eq(schema.receivedEmail.environmentId, tenant.production.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      provider: "ses",
      providerMessageId: messageId,
      recipients: [to],
      subject: "Order",
      spamVerdict: "gray",
    });
    expect(s3.objects.has(`${BUCKET}/${rows[0]?.rawKey}`)).toBe(true);
  });
});

describe("inboundQuota", () => {
  test("charges the organization's daily inbound bucket", async () => {
    const tenant = await createTestTenant();
    const quota = inboundQuota(
      memoryLimiter({
        overrides: async () => ({
          "email.inbound.day": { limit: 1, periodMs: 24 * 60 * 60 * 1000 },
        }),
      }),
    );
    expect(await quota.consume(tenant.organization.id)).toBe(true);
    expect(await quota.consume(tenant.organization.id)).toBe(false);
  });
});
