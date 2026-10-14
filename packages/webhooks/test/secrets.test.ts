import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { newId } from "@coss/db/id";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { LATEST_API_VERSION } from "@coss/versioning";
import { eq } from "drizzle-orm";
import { runDueWebhookDeliveries } from "../src/deliver.ts";
import {
  createWebhookEndpoint,
  getWebhookEndpoint,
  revealWebhookSecret,
  rollWebhookEndpointSecret,
  toWebhookEndpointObject,
} from "../src/endpoints.ts";
import { enqueueWebhookMessage } from "../src/outbox.ts";
import { reencryptWebhookSecrets } from "../src/reencrypt.ts";
import { DEFAULT_PREVIOUS_SECRET_EXPIRES_IN } from "../src/schemas.ts";
import {
  decryptSecret,
  encryptSecret,
  isEncryptedWithPrimary,
  type SecretsKeyRing,
  secretsKeyRing,
} from "../src/secrets.ts";
import { signPayload } from "../src/signing.ts";
import { testSender, webhookReceiver } from "../src/testing.ts";

const { webhookEndpoint } = schema;
const HOUR = 60 * 60 * 1000;
const OLD_KEY = Buffer.alloc(32, 11);
const NEW_KEY = Buffer.alloc(32, 12);

async function endpointFor(tenant: TestTenant, url: string, keys: SecretsKeyRing) {
  return createWebhookEndpoint(
    {
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      url,
      eventTypes: [],
      apiVersion: LATEST_API_VERSION,
      userId: null,
    },
    { secretsKeys: keys, allowInsecureUrls: true },
  );
}

/** Queues one event, delivers it (at `at`, default now) and returns the signatures it carried. */
async function deliveredSignatures(
  tenant: TestTenant,
  receiver: ReturnType<typeof webhookReceiver>,
  keys: SecretsKeyRing,
  at?: Date,
) {
  const id = newId("evt");
  await enqueueWebhookMessage(db, {
    id,
    organizationId: tenant.organization.id,
    environmentId: tenant.development.id,
    type: "email.delivered",
    payload: { id, object: "event", type: "email.delivered", data: {} },
  });
  await runDueWebhookDeliveries(
    { now: at ?? new Date(), scope: { organizationIds: [tenant.organization.id] } },
    { secretsKeys: keys, send: testSender() },
  );
  const request = receiver.received.find((entry) => entry.headers.get("webhook-id") === id);
  if (!request) throw new Error("nothing received");
  const timestamp = Number(request.headers.get("webhook-timestamp"));
  return {
    header: request.headers.get("webhook-signature"),
    signedBy: (secret: string) => signPayload({ secret, id, timestamp, body: request.body }),
  };
}

describe("rollWebhookEndpointSecret", () => {
  const keys = secretsKeyRing([OLD_KEY]);

  test("signs with both secrets until the previous one expires", async () => {
    const tenant = await createTestTenant();
    const receiver = webhookReceiver();
    try {
      const { endpoint, secret: original } = await endpointFor(tenant, receiver.url, keys);
      const before = Date.now();
      const { endpoint: rolled, secret } = await rollWebhookEndpointSecret(
        { organizationId: tenant.organization.id, id: endpoint.id },
        { secretsKeys: keys },
      );

      expect(secret).not.toBe(original);
      expect(revealWebhookSecret(rolled, keys)).toBe(secret);
      const expiresAt = rolled.previousSecretExpiresAt?.getTime() ?? 0;
      expect(expiresAt - before).toBeGreaterThanOrEqual(DEFAULT_PREVIOUS_SECRET_EXPIRES_IN * 1000);
      expect(expiresAt - Date.now()).toBeLessThanOrEqual(DEFAULT_PREVIOUS_SECRET_EXPIRES_IN * 1000);
      expect(toWebhookEndpointObject(rolled).previous_secret_expires_at).toBe(
        rolled.previousSecretExpiresAt?.toISOString() ?? "missing",
      );

      const during = await deliveredSignatures(tenant, receiver, keys);
      expect(during.header).toBe(`${during.signedBy(secret)} ${during.signedBy(original)}`);

      const after = await deliveredSignatures(tenant, receiver, keys, new Date(expiresAt + 1));
      expect(after.header).toBe(after.signedBy(secret));
    } finally {
      receiver.stop();
    }
  });

  test("0 drops the previous secret at once; rolling again drops the older one", async () => {
    const tenant = await createTestTenant();
    const receiver = webhookReceiver();
    try {
      const { endpoint } = await endpointFor(tenant, receiver.url, keys);
      const target = { organizationId: tenant.organization.id, id: endpoint.id };
      const first = await rollWebhookEndpointSecret(target, { secretsKeys: keys });
      const second = await rollWebhookEndpointSecret(
        { ...target, previousSecretExpiresIn: 3600 },
        { secretsKeys: keys },
      );
      const twice = await deliveredSignatures(tenant, receiver, keys);
      expect(twice.header).toBe(`${twice.signedBy(second.secret)} ${twice.signedBy(first.secret)}`);

      const third = await rollWebhookEndpointSecret(
        { ...target, previousSecretExpiresIn: 0 },
        { secretsKeys: keys },
      );
      expect(third.endpoint).toMatchObject({
        previousSecretCiphertext: null,
        previousSecretExpiresAt: null,
      });
      expect(toWebhookEndpointObject(third.endpoint).previous_secret_expires_at).toBeNull();
      const now = await deliveredSignatures(tenant, receiver, keys);
      expect(now.header).toBe(now.signedBy(third.secret));
    } finally {
      receiver.stop();
    }
  });

  test("only rolls endpoints of the given organization, within bounds", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const { endpoint, secret } = await endpointFor(tenant, "https://example.com/hook", keys);
    await expect(
      rollWebhookEndpointSecret(
        { organizationId: other.organization.id, id: endpoint.id },
        { secretsKeys: keys },
      ),
    ).rejects.toMatchObject({ code: "not_found" });
    for (const previousSecretExpiresIn of [-1, 1.5, 7 * 24 * 3600 + 1]) {
      await expect(
        rollWebhookEndpointSecret(
          { organizationId: tenant.organization.id, id: endpoint.id, previousSecretExpiresIn },
          { secretsKeys: keys },
        ),
      ).rejects.toThrow(RangeError);
    }
    const unchanged = await getWebhookEndpoint({
      organizationId: tenant.organization.id,
      id: endpoint.id,
    });
    expect(unchanged && revealWebhookSecret(unchanged, keys)).toBe(secret);
  });
});

describe("reencryptWebhookSecrets", () => {
  test("moves current and previous secrets onto the newest key and drops expired ones", async () => {
    const tenant = await createTestTenant();
    const scope = { organizationIds: [tenant.organization.id] };
    const before = secretsKeyRing([OLD_KEY]);
    const during = secretsKeyRing([NEW_KEY, OLD_KEY]);
    const after = secretsKeyRing([NEW_KEY]);

    const plain = await endpointFor(tenant, "https://example.com/plain", before);
    const rolling = await endpointFor(tenant, "https://example.com/rolling", before);
    const rolled = await rollWebhookEndpointSecret(
      { organizationId: tenant.organization.id, id: rolling.endpoint.id },
      { secretsKeys: before },
    );
    const expired = await endpointFor(tenant, "https://example.com/expired", during);
    await rollWebhookEndpointSecret(
      {
        organizationId: tenant.organization.id,
        id: expired.endpoint.id,
        previousSecretExpiresIn: 60,
      },
      { secretsKeys: during },
    );
    const now = new Date(Date.now() + HOUR);
    const read = async (id: string) => {
      const row = await getWebhookEndpoint({ organizationId: tenant.organization.id, id });
      if (!row) throw new Error("missing endpoint");
      return row;
    };
    const updatedAtBefore = (await read(plain.endpoint.id)).updatedAt;

    expect(await reencryptWebhookSecrets({ keys: during, scope, now, dryRun: true })).toEqual({
      checked: 3,
      reencrypted: 3,
      unreadable: [],
      conflicts: 0,
    });
    expect(isEncryptedWithPrimary((await read(plain.endpoint.id)).secretCiphertext, during)).toBe(
      false,
    );

    expect(await reencryptWebhookSecrets({ keys: during, scope, now })).toEqual({
      checked: 3,
      reencrypted: 3,
      unreadable: [],
      conflicts: 0,
    });
    // Idempotent.
    expect(await reencryptWebhookSecrets({ keys: during, scope, now })).toMatchObject({
      reencrypted: 0,
    });

    // The old key can go: everything decrypts with the new one alone.
    const plainRow = await read(plain.endpoint.id);
    expect(revealWebhookSecret(plainRow, after)).toBe(plain.secret);
    expect(plainRow.updatedAt).toEqual(updatedAtBefore);
    const rollingRow = await read(rolling.endpoint.id);
    expect(revealWebhookSecret(rollingRow, after)).toBe(rolled.secret);
    expect(decryptSecret(rollingRow.previousSecretCiphertext ?? "", after)).toBe(rolling.secret);
    expect(rollingRow.previousSecretExpiresAt).toEqual(rolled.endpoint.previousSecretExpiresAt);
    expect(await read(expired.endpoint.id)).toMatchObject({
      previousSecretCiphertext: null,
      previousSecretExpiresAt: null,
    });
  });

  test("covers Hooks endpoint secrets too", async () => {
    const tenant = await createTestTenant();
    const scope = { organizationIds: [tenant.organization.id] };
    const before = secretsKeyRing([OLD_KEY]);
    const during = secretsKeyRing([NEW_KEY, OLD_KEY]);
    const after = secretsKeyRing([NEW_KEY]);
    const [application] = await db
      .insert(schema.hookApplication)
      .values({
        organizationId: tenant.organization.id,
        projectId: tenant.project.id,
        environmentId: tenant.development.id,
        name: "Acme",
      })
      .returning();
    if (!application) throw new Error("no application");
    const [endpoint] = await db
      .insert(schema.hookEndpoint)
      .values({
        organizationId: tenant.organization.id,
        projectId: tenant.project.id,
        environmentId: tenant.development.id,
        applicationId: application.id,
        url: "https://example.com/hook",
        secretCiphertext: encryptSecret("whsec_current", before),
        previousSecretCiphertext: encryptSecret("whsec_previous", before),
        previousSecretExpiresAt: new Date(Date.now() + 10 * HOUR),
      })
      .returning();
    if (!endpoint) throw new Error("no endpoint");

    expect(await reencryptWebhookSecrets({ keys: during, scope })).toMatchObject({
      checked: 1,
      reencrypted: 1,
    });
    const [row] = await db
      .select()
      .from(schema.hookEndpoint)
      .where(eq(schema.hookEndpoint.id, endpoint.id));
    expect(decryptSecret(row?.secretCiphertext ?? "", after)).toBe("whsec_current");
    expect(decryptSecret(row?.previousSecretCiphertext ?? "", after)).toBe("whsec_previous");
  });

  test("also moves risk settings' captcha secrets", async () => {
    const tenant = await createTestTenant();
    const scope = { organizationIds: [tenant.organization.id] };
    await db.insert(schema.riskSettings).values({
      organizationId: tenant.organization.id,
      environmentId: tenant.production.id,
      reviewThreshold: 0.5,
      blockThreshold: 0.85,
      captchaProvider: "turnstile",
      captchaSecretCiphertext: encryptSecret("0xcaptcha", secretsKeyRing([OLD_KEY])),
    });
    expect(
      await reencryptWebhookSecrets({ keys: secretsKeyRing([NEW_KEY, OLD_KEY]), scope }),
    ).toEqual({ checked: 1, reencrypted: 1, unreadable: [], conflicts: 0 });
    const [row] = await db
      .select({ ciphertext: schema.riskSettings.captchaSecretCiphertext })
      .from(schema.riskSettings)
      .where(eq(schema.riskSettings.environmentId, tenant.production.id));
    expect(decryptSecret(row?.ciphertext ?? "", secretsKeyRing([NEW_KEY]))).toBe("0xcaptcha");
  });

  test("reports secrets no listed key decrypts and leaves them alone", async () => {
    const tenant = await createTestTenant();
    const scope = { organizationIds: [tenant.organization.id] };
    const { endpoint } = await endpointFor(
      tenant,
      "https://example.com/hook",
      secretsKeyRing([OLD_KEY]),
    );
    const result = await reencryptWebhookSecrets({ keys: secretsKeyRing([NEW_KEY]), scope });
    expect(result).toMatchObject({ checked: 1, reencrypted: 0, conflicts: 0 });
    expect(result.unreadable).toEqual([
      {
        id: endpoint.id,
        organizationId: tenant.organization.id,
        error: expect.stringContaining("not in WEBHOOK_SECRETS_KEY"),
      },
    ]);
    const [row] = await db
      .select({ secretCiphertext: webhookEndpoint.secretCiphertext })
      .from(webhookEndpoint)
      .where(eq(webhookEndpoint.id, endpoint.id));
    expect(row?.secretCiphertext).toBe(endpoint.secretCiphertext);
  });
});
