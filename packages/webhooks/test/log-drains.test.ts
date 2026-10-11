import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { appendLogEntries, type LogEntryInput, recordOrgAuditEvent } from "@coss/logs";
import { suspendOrganization, unsuspendOrganization } from "@coss/tenancy/admin";
import { createTestTenant, createTestUser, type TestTenant } from "@coss/tenancy/testing";
import { and, eq, isNull } from "drizzle-orm";
import { WebhookError } from "../src/errors.ts";
import {
  LOG_DRAIN_CONTENT_TYPE,
  LOG_DRAIN_MAX_ATTEMPTS,
  LOG_DRAIN_RETRY_DELAYS_MS,
  MAX_BATCH_BYTES,
  MAX_BATCH_LINES,
  runDueLogDrainDeliveries,
  takeBatch,
} from "../src/log-drain-delivery.ts";
import {
  countQueuedLogDrainLines,
  createLogDrain,
  deleteLogDrain,
  getLogDrain,
  getLogDrainBatch,
  listLogDrains,
  MAX_LOG_DRAINS_PER_ENVIRONMENT,
  pageLogDrainBatches,
  revealLogDrainSecret,
  toLogDrainObject,
  updateLogDrain,
} from "../src/log-drains.ts";
import { reencryptWebhookSecrets } from "../src/reencrypt.ts";
import { purgeExpiredLogDrainBatches } from "../src/retention.ts";
import { secretsKeyRing } from "../src/secrets.ts";
import { signPayload } from "../src/signing.ts";
import {
  TEST_SECRETS_KEYS,
  testManagementDeps,
  testSender,
  webhookReceiver,
} from "../src/testing.ts";

const { logDrainBatch, logDrainRecord, orgAuditEvent } = schema;
const deps = { secretsKeys: TEST_SECRETS_KEYS, send: testSender() };
const scopeOf = (tenant: TestTenant) => ({ organizationIds: [tenant.organization.id] });
const SECOND = 1000;

async function drainFor(
  tenant: TestTenant,
  url: string,
  sources: ("api" | "email" | "webhook" | "audit")[] = [],
) {
  return createLogDrain(
    {
      organizationId: tenant.organization.id,
      environmentId: tenant.production.id,
      url,
      sources,
      userId: tenant.owner.id,
    },
    testManagementDeps,
  );
}

function line(tenant: TestTenant, overrides: Partial<LogEntryInput> = {}): LogEntryInput {
  return {
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    environmentId: tenant.production.id,
    occurredAt: new Date(),
    source: "api",
    level: "info",
    type: "api.request",
    message: "GET /v1/domains 200",
    method: "GET",
    path: "/v1/domains",
    statusCode: 200,
    ...overrides,
  };
}

async function queued(drainId: string) {
  return db
    .select()
    .from(logDrainRecord)
    .where(eq(logDrainRecord.drainId, drainId))
    .orderBy(logDrainRecord.id);
}

function parseNdjson(body: string): Record<string, unknown>[] {
  expect(body.endsWith("\n")).toBe(true);
  return body
    .slice(0, -1)
    .split("\n")
    .map((text) => JSON.parse(text) as Record<string, unknown>);
}

describe("log drain management", () => {
  test("stores an encrypted secret, normalizes sources and validates the URL", async () => {
    const tenant = await createTestTenant();
    const { drain, secret } = await drainFor(tenant, "https://logs.example.com/in", [
      "email",
      "api",
      "email",
    ]);
    expect(drain).toMatchObject({
      sources: ["api", "email"],
      enabled: true,
      projectId: tenant.project.id,
      environmentId: tenant.production.id,
    });
    expect(secret).toStartWith("whsec_");
    expect(drain.secretCiphertext).not.toContain(secret);
    expect(revealLogDrainSecret(drain, TEST_SECRETS_KEYS)).toBe(secret);
    expect(toLogDrainObject(drain)).toMatchObject({
      object: "log_drain",
      disabled_reason: null,
      disabled_at: null,
    });

    const strict = { ...testManagementDeps, allowInsecureUrls: false };
    for (const url of ["http://logs.example.com", "https://127.0.0.1/in", "nope"]) {
      const error = await createLogDrain(
        {
          organizationId: tenant.organization.id,
          environmentId: tenant.production.id,
          url,
          sources: [],
          userId: null,
        },
        strict,
      ).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(WebhookError);
      expect((error as WebhookError).code).toBe("invalid_url");
      expect((error as WebhookError).message).not.toContain("Webhook");
    }
  });

  test("is scoped to its organization and limited per environment", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const { drain } = await drainFor(tenant, "https://logs.example.com/a");
    expect(await getLogDrain({ organizationId: other.organization.id, id: drain.id })).toBeNull();
    expect(await getLogDrain({ organizationId: tenant.organization.id, id: "whep_x" })).toBeNull();
    const foreignEnvironment = await createLogDrain(
      {
        organizationId: other.organization.id,
        environmentId: tenant.production.id,
        url: "https://logs.example.com/b",
        sources: [],
        userId: null,
      },
      testManagementDeps,
    ).catch((caught: unknown) => caught);
    expect((foreignEnvironment as WebhookError).code).toBe("not_found");

    for (let i = 1; i < MAX_LOG_DRAINS_PER_ENVIRONMENT; i++) {
      await drainFor(tenant, `https://logs.example.com/${i}`);
    }
    const tooMany = await drainFor(tenant, "https://logs.example.com/last").catch(
      (caught: unknown) => caught,
    );
    expect((tooMany as WebhookError).code).toBe("too_many_log_drains");
    expect(
      await listLogDrains({
        organizationId: tenant.organization.id,
        environmentId: tenant.production.id,
      }),
    ).toHaveLength(MAX_LOG_DRAINS_PER_ENVIRONMENT);
    await deleteLogDrain({ organizationId: other.organization.id, id: drain.id });
    expect(
      await getLogDrain({ organizationId: tenant.organization.id, id: drain.id }),
    ).not.toBeNull();
  });

  test("disabling drops the backlog; enabling starts from new lines", async () => {
    const tenant = await createTestTenant();
    const { drain } = await drainFor(tenant, "https://logs.example.com/in");
    await appendLogEntries(db, [line(tenant), line(tenant)]);
    const ids = { organizationId: tenant.organization.id, drainId: drain.id };
    expect(await countQueuedLogDrainLines(ids)).toBe(2);

    const disabled = await updateLogDrain(
      { organizationId: tenant.organization.id, id: drain.id, enabled: false },
      testManagementDeps,
    );
    expect(toLogDrainObject(disabled)).toMatchObject({
      enabled: false,
      disabled_reason: "manual",
      disabled_at: expect.any(String),
    });
    expect(await countQueuedLogDrainLines(ids)).toBe(0);
    await appendLogEntries(db, [line(tenant)]);
    expect(await countQueuedLogDrainLines(ids)).toBe(0);

    const enabled = await updateLogDrain(
      { organizationId: tenant.organization.id, id: drain.id, enabled: true, sources: ["email"] },
      testManagementDeps,
    );
    expect(enabled).toMatchObject({ enabled: true, disabledReason: null, sources: ["email"] });
    await appendLogEntries(db, [
      line(tenant),
      line(tenant, { source: "email", type: "email.sent" }),
    ]);
    expect(await countQueuedLogDrainLines(ids)).toBe(1);

    const missing = await updateLogDrain(
      { organizationId: tenant.organization.id, id: "drain_missing", description: "x" },
      testManagementDeps,
    ).catch((caught: unknown) => caught);
    expect((missing as WebhookError).code).toBe("not_found");
  });
});

describe("the log drain outbox", () => {
  test("queues the environment's lines and audit events for the drains that take their source", async () => {
    const tenant = await createTestTenant();
    const all = await drainFor(tenant, "https://logs.example.com/all");
    const audit = await drainFor(tenant, "https://logs.example.com/audit", ["audit"]);
    const development = await createLogDrain(
      {
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        url: "https://logs.example.com/dev",
        sources: [],
        userId: null,
      },
      testManagementDeps,
    );

    await appendLogEntries(db, [line(tenant, { requestId: "req_1" })]);
    await recordOrgAuditEvent({
      organizationId: tenant.organization.id,
      projectId: tenant.project.id,
      environmentId: tenant.production.id,
      actor: { type: "user", id: tenant.owner.id, label: tenant.owner.email },
      action: "webhook_endpoint.created",
      target: { type: "webhook_endpoint", id: "whep_x" },
    });
    // Organization-wide events reach no drain.
    await recordOrgAuditEvent({
      organizationId: tenant.organization.id,
      actor: { type: "user", id: tenant.owner.id, label: tenant.owner.email },
      action: "domain.created",
    });

    const allLines = await queued(all.drain.id);
    expect(allLines.map((record) => record.source)).toEqual(["api", "audit"]);
    expect(allLines[0]?.line).toMatchObject({
      object: "log",
      source: "api",
      request_id: "req_1",
      status_code: 200,
    });
    expect(allLines[0]?.sourceId).toBe(allLines[0]?.line.id as string);
    expect(allLines[0]?.byteSize).toBe(Buffer.byteLength(JSON.stringify(allLines[0]?.line)) + 1);
    expect(allLines[1]?.line).toMatchObject({
      object: "audit_event",
      action: "webhook_endpoint.created",
      actor_type: "user",
      environment_id: tenant.production.id,
    });
    const [auditRow] = await db
      .select()
      .from(orgAuditEvent)
      .where(eq(orgAuditEvent.id, allLines[1]?.sourceId ?? ""));
    expect(auditRow?.action).toBe("webhook_endpoint.created");
    expect((await queued(audit.drain.id)).map((record) => record.source)).toEqual(["audit"]);
    expect(await queued(development.drain.id)).toEqual([]);
  });

  test("writes the line and its records together in the caller's transaction", async () => {
    const tenant = await createTestTenant();
    const { drain } = await drainFor(tenant, "https://logs.example.com/in");
    await db
      .transaction(async (tx) => {
        await appendLogEntries(tx, [line(tenant)]);
        throw new Error("roll back");
      })
      .catch(() => {});
    expect(await queued(drain.id)).toEqual([]);
  });
});

describe("log drain delivery", () => {
  test("posts queued lines as signed NDJSON, in order, one batch per request", async () => {
    const tenant = await createTestTenant();
    const receiver = webhookReceiver();
    try {
      const { drain, secret } = await drainFor(tenant, receiver.url);
      await appendLogEntries(db, [
        line(tenant, { requestId: "req_1" }),
        line(tenant, { requestId: "req_2" }),
      ]);
      await appendLogEntries(db, [line(tenant, { requestId: "req_3" })]);

      expect(await runDueLogDrainDeliveries({ scope: scopeOf(tenant) }, deps)).toBe(1);
      expect(receiver.received).toHaveLength(1);
      const request = receiver.received[0];
      if (!request) throw new Error("nothing received");
      expect(request.headers.get("content-type")).toBe(LOG_DRAIN_CONTENT_TYPE);
      expect(request.headers.get("user-agent")).toBe("COSS-LogDrains/1.0");
      expect(request.headers.get("coss-log-drain-id")).toBe(drain.id);
      expect(request.headers.get("coss-environment-id")).toBe(tenant.production.id);
      const lines = parseNdjson(request.body);
      // In the order they were written (lines of separate writes in one millisecond may swap).
      const requestIds = lines.map((entry) => entry.request_id);
      expect(requestIds.toSorted()).toEqual(["req_1", "req_2", "req_3"]);
      expect(requestIds.indexOf("req_1")).toBeLessThan(requestIds.indexOf("req_2"));
      expect(lines.every((entry) => entry.object === "log")).toBe(true);

      const batchId = request.headers.get("webhook-id") ?? "";
      expect(batchId).toStartWith("drainbat_");
      const timestamp = Number(request.headers.get("webhook-timestamp"));
      expect(request.headers.get("webhook-signature")).toBe(
        signPayload({ secret, id: batchId, timestamp, body: request.body }),
      );

      const batch = await getLogDrainBatch({
        organizationId: tenant.organization.id,
        drainId: drain.id,
        id: batchId,
      });
      expect(batch).toMatchObject({
        status: "succeeded",
        recordCount: 3,
        byteSize: Buffer.byteLength(request.body),
        attemptCount: 1,
        lastStatusCode: 200,
      });
      expect(batch?.attempts).toHaveLength(1);
      expect(batch?.attempts[0]).toMatchObject({ statusCode: 200, responseExcerpt: "ok" });

      // Nothing left to send.
      expect(await runDueLogDrainDeliveries({ scope: scopeOf(tenant) }, deps)).toBe(0);
    } finally {
      receiver.stop();
    }
  });

  test("keeps one open batch per drain and retries it with backoff", async () => {
    const tenant = await createTestTenant();
    let status = 503;
    const receiver = webhookReceiver(() => new Response("busy", { status }));
    try {
      const { drain } = await drainFor(tenant, receiver.url);
      await appendLogEntries(db, [line(tenant, { requestId: "req_1" })]);
      const t0 = new Date();
      expect(await runDueLogDrainDeliveries({ now: t0, scope: scopeOf(tenant) }, deps)).toBe(1);
      // More lines wait behind the open batch.
      await appendLogEntries(db, [line(tenant, { requestId: "req_2" })]);
      expect(await runDueLogDrainDeliveries({ now: t0, scope: scopeOf(tenant) }, deps)).toBe(0);

      const [failing] = (
        await pageLogDrainBatches({ organizationId: tenant.organization.id, drainId: drain.id })
      ).batches;
      expect(failing).toMatchObject({
        status: "pending",
        attemptCount: 1,
        lastStatusCode: 503,
        lastError: "HTTP 503",
        nextAttemptAt: new Date(t0.getTime() + (LOG_DRAIN_RETRY_DELAYS_MS[0] ?? 0)),
      });
      expect(failing?.attempts[0]?.responseExcerpt).toBe("busy");

      status = 200;
      const t1 = new Date(t0.getTime() + 5 * SECOND);
      // The retry, then a new batch for the line that waited.
      expect(await runDueLogDrainDeliveries({ now: t1, scope: scopeOf(tenant) }, deps)).toBe(1);
      expect(await runDueLogDrainDeliveries({ now: t1, scope: scopeOf(tenant) }, deps)).toBe(1);
      const bodies = receiver.received.map((request) =>
        parseNdjson(request.body).map((entry) => entry.request_id),
      );
      expect(bodies).toEqual([["req_1"], ["req_1"], ["req_2"]]);
      expect(receiver.received[0]?.headers.get("webhook-id")).toBe(
        receiver.received[1]?.headers.get("webhook-id") ?? "",
      );
      const page = await pageLogDrainBatches({
        organizationId: tenant.organization.id,
        drainId: drain.id,
        status: "succeeded",
      });
      expect(page.batches).toHaveLength(2);
      const firstPage = await pageLogDrainBatches({
        organizationId: tenant.organization.id,
        drainId: drain.id,
        limit: 1,
      });
      expect(firstPage.hasMore).toBe(true);
      const secondPage = await pageLogDrainBatches({
        organizationId: tenant.organization.id,
        drainId: drain.id,
        limit: 1,
        after: firstPage.batches[0]?.id,
      });
      expect(secondPage.batches.map((batch) => batch.id)).not.toContain(firstPage.batches[0]?.id);
    } finally {
      receiver.stop();
    }
  });

  test("disables a drain whose batch fails every attempt, and drops its backlog", async () => {
    const tenant = await createTestTenant();
    const receiver = webhookReceiver(() => new Response("nope", { status: 500 }));
    try {
      const { drain } = await drainFor(tenant, receiver.url);
      await appendLogEntries(db, [line(tenant)]);
      let now = new Date();
      for (let attempt = 1; attempt <= LOG_DRAIN_MAX_ATTEMPTS; attempt++) {
        expect(await runDueLogDrainDeliveries({ now, scope: scopeOf(tenant) }, deps)).toBe(1);
        if (attempt === 2) await appendLogEntries(db, [line(tenant)]);
        now = new Date(now.getTime() + (LOG_DRAIN_RETRY_DELAYS_MS[attempt - 1] ?? 0));
      }
      expect(receiver.received).toHaveLength(LOG_DRAIN_MAX_ATTEMPTS);
      const row = await getLogDrain({ organizationId: tenant.organization.id, id: drain.id });
      expect(row).toMatchObject({ enabled: false, disabledReason: "failing" });
      const [batch] = (
        await pageLogDrainBatches({ organizationId: tenant.organization.id, drainId: drain.id })
      ).batches;
      expect(batch).toMatchObject({ status: "failed", attemptCount: LOG_DRAIN_MAX_ATTEMPTS });
      expect(
        await countQueuedLogDrainLines({
          organizationId: tenant.organization.id,
          drainId: drain.id,
        }),
      ).toBe(0);
      const [audit] = await db
        .select()
        .from(orgAuditEvent)
        .where(
          and(
            eq(orgAuditEvent.organizationId, tenant.organization.id),
            eq(orgAuditEvent.action, "log_drain.disabled"),
          ),
        );
      expect(audit).toMatchObject({
        actorType: "system",
        targetId: drain.id,
        environmentId: tenant.production.id,
        metadata: { reason: "failing", batch_id: batch?.id },
      });
      expect(await runDueLogDrainDeliveries({ now, scope: scopeOf(tenant) }, deps)).toBe(0);
    } finally {
      receiver.stop();
    }
  });

  test("holds drains of suspended organizations, and resumes once lifted", async () => {
    const tenant = await createTestTenant();
    const admin = await createTestUser();
    const receiver = webhookReceiver();
    try {
      await drainFor(tenant, receiver.url);
      await suspendOrganization({
        organizationId: tenant.organization.id,
        reason: "test",
        actor: { userId: admin.id, email: admin.email },
      });
      await appendLogEntries(db, [line(tenant)]);
      expect(await runDueLogDrainDeliveries({ scope: scopeOf(tenant) }, deps)).toBe(0);
      await unsuspendOrganization({
        organizationId: tenant.organization.id,
        actor: { userId: admin.id, email: admin.email },
      });
      expect(await runDueLogDrainDeliveries({ scope: scopeOf(tenant) }, deps)).toBe(1);
      expect(receiver.received).toHaveLength(1);
    } finally {
      receiver.stop();
    }
  });

  test("concurrent runs never form two batches for one drain", async () => {
    const tenant = await createTestTenant();
    const receiver = webhookReceiver();
    try {
      const { drain } = await drainFor(tenant, receiver.url);
      const written = Array.from({ length: 20 }, (_, i) => `req_${i}`);
      await appendLogEntries(
        db,
        written.map((requestId) => line(tenant, { requestId })),
      );
      const runs = await Promise.all(
        Array.from({ length: 4 }, () => runDueLogDrainDeliveries({ scope: scopeOf(tenant) }, deps)),
      );
      expect(runs.reduce((sum, count) => sum + count, 0)).toBe(1);
      expect(receiver.received).toHaveLength(1);
      expect(
        parseNdjson(receiver.received[0]?.body ?? "").map((entry) => entry.request_id),
      ).toEqual(written);
      const unbatched = await db
        .select()
        .from(logDrainRecord)
        .where(and(eq(logDrainRecord.drainId, drain.id), isNull(logDrainRecord.batchId)));
      expect(unbatched).toEqual([]);
    } finally {
      receiver.stop();
    }
  });

  test("takeBatch stays within both limits, but always takes one line", () => {
    const lines = (count: number, byteSize: number) =>
      Array.from({ length: count }, () => ({ byteSize }));
    expect(takeBatch(lines(MAX_BATCH_LINES + 5, 10))).toHaveLength(MAX_BATCH_LINES);
    expect(takeBatch(lines(10, MAX_BATCH_BYTES / 4))).toHaveLength(4);
    expect(takeBatch(lines(3, MAX_BATCH_BYTES * 2))).toHaveLength(1);
    expect(takeBatch([])).toEqual([]);
  });
});

describe("log drain retention", () => {
  test("purges finished batches and an old backlog, never open batches", async () => {
    const tenant = await createTestTenant();
    const receiver = webhookReceiver();
    try {
      const { drain } = await drainFor(tenant, receiver.url);
      await appendLogEntries(db, [line(tenant)]);
      await runDueLogDrainDeliveries({ scope: scopeOf(tenant) }, deps);
      await appendLogEntries(db, [line(tenant)]);
      const scope = scopeOf(tenant);

      expect(await purgeExpiredLogDrainBatches({ scope })).toEqual([0, 0]);
      const later = new Date(Date.now() + 8 * 24 * 60 * 60 * SECOND);
      expect(await purgeExpiredLogDrainBatches({ scope, now: later })).toEqual([1, 1]);
      expect(await queued(drain.id)).toEqual([]);
      const batches = await db
        .select()
        .from(logDrainBatch)
        .where(eq(logDrainBatch.drainId, drain.id));
      expect(batches).toEqual([]);
    } finally {
      receiver.stop();
    }
  });
});

describe("log drain secrets", () => {
  test("are re-encrypted with the newest key", async () => {
    const tenant = await createTestTenant();
    const before = secretsKeyRing([Buffer.alloc(32, 1)]);
    const during = secretsKeyRing([Buffer.alloc(32, 2), Buffer.alloc(32, 1)]);
    const { drain, secret } = await createLogDrain(
      {
        organizationId: tenant.organization.id,
        environmentId: tenant.production.id,
        url: "https://logs.example.com/in",
        sources: [],
        userId: null,
      },
      { ...testManagementDeps, secretsKeys: before },
    );
    const result = await reencryptWebhookSecrets({ keys: during, scope: scopeOf(tenant) });
    expect(result).toEqual({ checked: 1, reencrypted: 1, unreadable: [], conflicts: 0 });
    const row = await getLogDrain({ organizationId: tenant.organization.id, id: drain.id });
    if (!row) throw new Error("missing drain");
    expect(revealLogDrainSecret(row, secretsKeyRing([Buffer.alloc(32, 2)]))).toBe(secret);
  });
});
