import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { db, schema } from "@coss/db";
import { createTestTenant } from "@coss/tenancy/testing";
import { encryptSecret } from "@coss/webhooks";
import { TEST_SECRETS_KEYS } from "@coss/webhooks/testing";
import { eq } from "drizzle-orm";
import { handleInboundCallback, handleStatusCallback } from "../src/callbacks.ts";
import { SmsRejectedError, UncertainSendError } from "../src/provider.ts";
import { getSms } from "../src/read.ts";
import { SendSmsRequest } from "../src/schemas.ts";
import { createSmsService } from "../src/service.ts";
import { checkSmsSuppression } from "../src/suppressions.ts";
import { createTestSmsNumber, memorySmsDispatchQueue, testPhoneNumber } from "../src/testing.ts";
import { createTwilioApi } from "../src/twilio/api.ts";
import { statusCallbackEvent } from "../src/twilio/callbacks.ts";
import { createTwilioClient } from "../src/twilio/client.ts";
import { TwilioSmsProvider } from "../src/twilio/provider.ts";
import { twilioSignature, verifyTwilioSignature } from "../src/twilio/signature.ts";

test("signatures match Twilio's documented example", () => {
  const params = {
    CallSid: "CA1234567890ABCDE",
    Caller: "+12349013030",
    Digits: "1234",
    From: "+12349013030",
    To: "+18005551212",
  };
  const url = "https://mycompany.com/myapp.php?foo=1&bar=2";
  expect(twilioSignature("12345", url, params)).toBe("0/KCTR6DLpKmkAf8muzZqo1nDgQ=");
  expect(
    verifyTwilioSignature({
      authToken: "12345",
      url,
      params,
      signature: "0/KCTR6DLpKmkAf8muzZqo1nDgQ=",
    }),
  ).toBe(true);
  expect(
    verifyTwilioSignature({
      authToken: "12345",
      url: `${url}&x=1`,
      params,
      signature: "0/KCTR6DLpKmkAf8muzZqo1nDgQ=",
    }),
  ).toBe(false);
  expect(verifyTwilioSignature({ authToken: "12345", url, params, signature: null })).toBe(false);
});

describe("status callbacks", () => {
  test("map to events; progress statuses record nothing", () => {
    expect(
      statusCallbackEvent("sms_x", { MessageStatus: "sending", MessageSid: "SM1" }),
    ).toBeNull();
    expect(
      statusCallbackEvent("sms_x", { MessageStatus: "delivered", MessageSid: "SM1" }),
    ).toMatchObject({
      type: "sms.delivered",
      providerMessageId: "SM1",
      data: {},
    });
    expect(
      statusCallbackEvent("sms_x", {
        MessageStatus: "undelivered",
        MessageSid: "SM1",
        ErrorCode: "30007",
      }),
    ).toMatchObject({
      type: "sms.undelivered",
      data: { failure: { code: "carrier_filtered" }, provider_error_code: "30007" },
    });
    expect(
      statusCallbackEvent("sms_x", {
        MessageStatus: "undelivered",
        MessageSid: "SM1",
        ErrorCode: "30006",
      }),
    ).toMatchObject({ suppress: "invalid_number", data: { failure: { code: "invalid_number" } } });
    expect(
      statusCallbackEvent("sms_x", {
        MessageStatus: "undelivered",
        MessageSid: "SM1",
        ErrorCode: "99999",
      }),
    ).toMatchObject({ data: { failure: { code: "undelivered" } } });
  });
});

function fakeFetch(respond: (request: Request) => Response | Promise<Response>) {
  const requests: Request[] = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push(request.clone());
    return respond(request);
  }) as typeof fetch;
  return { fetcher, requests };
}

function provider(respond: (request: Request) => Response | Promise<Response>) {
  const { fetcher, requests } = fakeFetch(respond);
  const api = createTwilioApi(
    createTwilioClient({
      credentials: { accountSid: "ACparent", authToken: "secret" },
      fetch: fetcher,
    }),
    { primaryCustomerProfileSid: null },
  );
  return { provider: new TwilioSmsProvider(api, { sleep: async () => {} }), requests };
}

const OUTBOUND = {
  smsId: "sms_x",
  organizationId: "org_x",
  from: "+14155550123",
  to: "+14155550199",
  body: "Hi",
  statusCallbackUrl: "https://api.coss.com/sms/twilio/status?sms_id=sms_x",
  route: { accountSid: "ACsub", messagingServiceSid: "MGservice" },
};

describe("TwilioSmsProvider", () => {
  test("posts the message to the subaccount with smart encoding off", async () => {
    const { provider: twilio, requests } = provider(() =>
      Response.json({ sid: "SM123", status: "queued", error_code: null }, { status: 201 }),
    );
    expect(await twilio.send(OUTBOUND)).toEqual({ providerMessageId: "SM123" });
    const [request] = requests;
    expect(request?.url).toBe("https://api.twilio.com/2010-04-01/Accounts/ACsub/Messages.json");
    expect(request?.headers.get("authorization")).toBe(`Basic ${btoa("ACparent:secret")}`);
    const form = new URLSearchParams(await request?.text());
    expect(Object.fromEntries(form)).toEqual({
      To: "+14155550199",
      From: "+14155550123",
      Body: "Hi",
      MessagingServiceSid: "MGservice",
      StatusCallback: OUTBOUND.statusCallbackUrl,
      SmartEncoded: "false",
    });
  });

  test("refusals are certain, server errors and timeouts aren't, 429 is retried", async () => {
    const refused = provider(() =>
      Response.json({ code: 21211, message: "Invalid 'To' Phone Number" }, { status: 400 }),
    );
    const error = await refused.provider.send(OUTBOUND).catch((caught) => caught);
    expect(error).toBeInstanceOf(SmsRejectedError);
    expect(error).toMatchObject({
      failure: { code: "invalid_number" },
      suppress: "invalid_number",
    });

    const broken = provider(() => new Response("oops", { status: 503 }));
    expect(await broken.provider.send(OUTBOUND).catch((caught) => caught)).toBeInstanceOf(
      UncertainSendError,
    );

    const offline = provider(() => {
      throw new TypeError("fetch failed");
    });
    expect(await offline.provider.send(OUTBOUND).catch((caught) => caught)).toBeInstanceOf(
      UncertainSendError,
    );

    let calls = 0;
    const throttled = provider(() => {
      calls++;
      return calls < 3
        ? Response.json({ code: 20429, message: "Too Many Requests" }, { status: 429 })
        : Response.json({ sid: "SM9", status: "queued" }, { status: 201 });
    });
    expect(await throttled.provider.send(OUTBOUND)).toEqual({ providerMessageId: "SM9" });
  });

  test("an answer cut off or unreadable after Twilio accepted is uncertain", async () => {
    const cutOff = provider(
      () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('{"sid": "SM'));
              controller.error(new Error("connection reset"));
            },
          }),
          { status: 201 },
        ),
    );
    expect(await cutOff.provider.send(OUTBOUND).catch((caught) => caught)).toBeInstanceOf(
      UncertainSendError,
    );
    const garbled = provider(() => new Response("<html>", { status: 201 }));
    expect(await garbled.provider.send(OUTBOUND).catch((caught) => caught)).toBeInstanceOf(
      UncertainSendError,
    );
  });
});

describe("Twilio API", () => {
  test("a secondary customer profile is assigned coss.com's primary one, by the subaccount", async () => {
    let next = 0;
    const { fetcher, requests } = fakeFetch((request) =>
      Response.json(
        request.url.endsWith("/CustomerProfiles")
          ? { sid: "BUsecondary", status: "draft" }
          : { sid: `XX${next++}`, status: "compliant" },
        { status: 201 },
      ),
    );
    const api = createTwilioApi(
      createTwilioClient({
        credentials: { accountSid: "ACparent", authToken: "secret" },
        fetch: fetcher,
      }),
      { primaryCustomerProfileSid: "BUprimary" },
    );
    const as = { accountSid: "ACsub", authToken: "subsecret" };
    expect(
      await api.createCustomerProfile(as, {
        legalName: "Acme Inc.",
        companyType: "PRIVATE_PROFIT",
        taxId: "12-3456789",
        taxIdType: "EIN",
        industry: "TECHNOLOGY",
        website: "https://acme.com",
        street: "1 Main St",
        city: "San Francisco",
        region: "CA",
        postalCode: "94105",
        country: "US",
        contact: {
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@acme.com",
          phone: "+14155550123",
          title: "CTO",
          jobPosition: "CEO",
        },
      }),
    ).toEqual({ sid: "BUsecondary" });
    const assignments = [];
    for (const request of requests) {
      if (!request.url.endsWith("/EntityAssignments")) continue;
      const form = new URLSearchParams(await request.text());
      assignments.push({
        url: request.url,
        objectSid: form.get("ObjectSid"),
        authorization: request.headers.get("authorization"),
      });
    }
    expect(assignments).toContainEqual({
      url: "https://trusthub.twilio.com/v1/CustomerProfiles/BUsecondary/EntityAssignments",
      objectSid: "BUprimary",
      authorization: `Basic ${btoa("ACsub:subsecret")}`,
    });
    expect(assignments.every((assignment) => !assignment.url.includes("BUprimary"))).toBe(true);
  });
});

describe("verified callbacks", () => {
  async function twilioTenant() {
    const tenant = await createTestTenant();
    const authToken = randomUUID();
    const accountSid = `AC${randomUUID().replaceAll("-", "")}`;
    const number = await createTestSmsNumber(tenant.organization.id, {
      provider: "twilio",
      receivingEnvironmentId: tenant.production.id,
    });
    await db
      .update(schema.smsAccount)
      .set({
        provider: "twilio",
        subaccountSid: accountSid,
        authToken: encryptSecret(authToken, TEST_SECRETS_KEYS),
      })
      .where(eq(schema.smsAccount.organizationId, tenant.organization.id));
    return { tenant, authToken, accountSid, number };
  }

  test("a signed status callback records the event; a forged one doesn't", async () => {
    const { tenant, authToken, accountSid, number } = await twilioTenant();
    const sent: string[] = [];
    const service = createSmsService({
      liveProvider: {
        name: "twilio",
        async send(message) {
          sent.push(message.smsId);
          return { providerMessageId: "SMabc" };
        },
      },
      sandboxProvider: { name: "fake", send: async () => ({ providerMessageId: "x" }) },
      queue: memorySmsDispatchQueue(),
    });
    const { sms } = await service.send({
      environment: {
        organizationId: tenant.organization.id,
        projectId: tenant.project.id,
        environmentId: tenant.production.id,
        mode: "live",
      },
      apiKeyId: null,
      params: SendSmsRequest.parse({ from: number.phoneNumber, to: testPhoneNumber(), body: "Hi" }),
    });
    await service.dispatch({ organizationId: tenant.organization.id, smsId: sms.id });
    expect(sent).toEqual([sms.id]);
    const url = `https://api.coss.com/sms/twilio/status?sms_id=${sms.id}`;
    const params = { AccountSid: accountSid, MessageSid: "SMabc", MessageStatus: "delivered" };
    const forged = await handleStatusCallback(
      { url, params, signature: twilioSignature("wrong", url, params), smsId: sms.id },
      TEST_SECRETS_KEYS,
    );
    expect(forged).toEqual({ status: "invalid_signature" });
    const signed = await handleStatusCallback(
      { url, params, signature: twilioSignature(authToken, url, params), smsId: sms.id },
      TEST_SECRETS_KEYS,
    );
    expect(signed).toEqual({ status: "recorded" });
    expect(
      await getSms({
        organizationId: tenant.organization.id,
        environmentId: tenant.production.id,
        smsId: sms.id,
      }),
    ).toMatchObject({ status: "delivered" });
    expect(
      await handleStatusCallback(
        { url, params: { ...params, AccountSid: "ACnobody" }, signature: null, smsId: sms.id },
        TEST_SECRETS_KEYS,
      ),
    ).toEqual({ status: "unknown_account" });
  });

  test("a signed inbound STOP opts the sender out", async () => {
    const { tenant, authToken, accountSid, number } = await twilioTenant();
    const from = testPhoneNumber();
    const url = "https://api.coss.com/sms/twilio/inbound";
    const params = {
      AccountSid: accountSid,
      MessageSid: `SM${randomUUID().replaceAll("-", "")}`,
      From: from,
      To: number.phoneNumber,
      Body: "STOP",
    };
    const outcome = await handleInboundCallback(
      { url, params, signature: twilioSignature(authToken, url, params) },
      TEST_SECRETS_KEYS,
    );
    expect(outcome).toMatchObject({ status: "received", result: { status: "stored" } });
    expect(
      (
        await checkSmsSuppression({
          organizationId: tenant.organization.id,
          environmentId: tenant.production.id,
          phoneNumber: from,
        })
      ).suppressed,
    ).toBe(true);
  });
});
