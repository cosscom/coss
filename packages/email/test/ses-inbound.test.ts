import { describe, expect, test } from "bun:test";
import { parseSesReceipt, S3InboundStore } from "../src/ses/inbound.ts";
import { FakeS3Api, sesReceiptNotification } from "../src/testing.ts";

describe("parseSesReceipt", () => {
  const body = sesReceiptNotification({
    messageId: "abc123",
    source: "jane@example.com",
    recipients: ["support@inbound.acme.com"],
    bucketName: "coss-inbound",
    objectKey: "landing/abc123",
    verdicts: { spam: "FAIL", dmarc: "FAIL" },
    dmarcPolicy: "REJECT",
  });

  test("reads the envelope, verdicts and S3 object of a raw delivery", () => {
    expect(parseSesReceipt(body)).toEqual({
      kind: "received",
      receipt: {
        messageId: "abc123",
        source: "jane@example.com",
        // The envelope recipients, not `mail.destination` (the To/Cc headers).
        recipients: ["support@inbound.acme.com"],
        timestamp: new Date("2026-10-12T10:00:00.000Z"),
        verdicts: {
          spam: "fail",
          virus: "pass",
          spf: "pass",
          dkim: "pass",
          dmarc: "fail",
          dmarcPolicy: "reject",
        },
        bucketName: "coss-inbound",
        objectKey: "landing/abc123",
      },
    });
  });

  test("unwraps an SNS envelope", () => {
    const envelope = JSON.stringify({ Type: "Notification", Message: body });
    expect(parseSesReceipt(envelope).kind).toBe("received");
  });

  test("ignores setup notifications, subscription confirmations and non-S3 actions", () => {
    expect(
      parseSesReceipt(JSON.stringify({ notificationType: "AMAZON_SES_SETUP_NOTIFICATION" })),
    ).toMatchObject({ kind: "ignored" });
    expect(parseSesReceipt(JSON.stringify({ Type: "SubscriptionConfirmation" }))).toMatchObject({
      kind: "ignored",
    });
    const sns = JSON.parse(body);
    sns.receipt.action = { type: "SNS", topicArn: "arn" };
    expect(parseSesReceipt(JSON.stringify(sns))).toMatchObject({ kind: "ignored" });
    expect(parseSesReceipt("not json")).toMatchObject({ kind: "ignored" });
  });
});

describe("S3InboundStore", () => {
  test("puts, gets, deletes and removes a whole organization page by page", async () => {
    const s3 = new FakeS3Api();
    const store = new S3InboundStore(s3, "bucket");
    const bytes = new TextEncoder().encode("x");
    for (const key of [
      "orgs/org_a/env/1/raw.eml",
      "orgs/org_a/env/2/raw.eml",
      "orgs/org_a/env/3/raw.eml",
      "orgs/org_b/env/1/raw.eml",
    ]) {
      await store.put({
        key,
        organizationId: "org",
        contentType: "message/rfc822",
        content: bytes,
      });
    }
    expect(await store.get("orgs/org_a/env/1/raw.eml")).toEqual(bytes);
    expect(await store.get("missing")).toBeNull();
    await store.delete(["orgs/org_a/env/1/raw.eml"]);
    expect(await store.get("orgs/org_a/env/1/raw.eml")).toBeNull();
    await store.deleteOrganization("org_a");
    expect([...s3.objects.keys()]).toEqual(["bucket/orgs/org_b/env/1/raw.eml"]);
  });
});
