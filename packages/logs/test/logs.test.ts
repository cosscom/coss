import { describe, expect, test } from "bun:test";
import { db, pool } from "@coss/db";
import { dropExpiredPartitions, ensurePartitions, listPartitions } from "@coss/db/partitions";
import { uniqueSuffix } from "@coss/db/testing";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { sql } from "drizzle-orm";
import {
  appendLogEntries,
  createLogWriter,
  dropExpiredLogPartitions,
  ensureLogPartitions,
  getLogEntry,
  type LogEntryInput,
  listLogPartitions,
  listOrgAuditEvents,
  logExportStream,
  logFacets,
  logHistogram,
  queryLogs,
  recordOrgAuditEvent,
  relatedLogEntries,
} from "../src/index.ts";

const T0 = new Date("2026-02-01T10:00:00.000Z");
const at = (seconds: number) => new Date(T0.getTime() + seconds * 1000);
const range = { from: at(-3600), to: at(3600) };

function line(tenant: TestTenant, overrides: Partial<LogEntryInput>): LogEntryInput {
  return {
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    environmentId: tenant.production.id,
    occurredAt: T0,
    source: "api",
    level: "info",
    type: "api.request",
    message: "GET /v1/domains 200",
    method: "GET",
    path: "/v1/domains",
    route: "/v1/domains",
    statusCode: 200,
    ...overrides,
  };
}

function scope(tenant: TestTenant) {
  return { organizationId: tenant.organization.id, environmentId: tenant.production.id };
}

async function seeded() {
  const tenant = await createTestTenant();
  await appendLogEntries(db, [
    line(tenant, {
      occurredAt: at(1),
      requestId: "req_a",
      resourceId: "email_a",
      method: "POST",
      path: "/v1/emails",
      route: "/v1/emails",
      statusCode: 202,
      message: "POST /v1/emails 202",
    }),
    line(tenant, {
      occurredAt: at(2),
      statusCode: 422,
      level: "warning",
      errorCode: "validation_error",
      message: "POST /v1/emails 422",
      method: "POST",
      path: "/v1/emails",
      route: "/v1/emails",
    }),
    line(tenant, {
      occurredAt: at(3),
      statusCode: 500,
      level: "error",
      message: "GET /v1/domains 500",
    }),
    line(tenant, {
      occurredAt: at(4),
      source: "email",
      type: "email.bounced",
      level: "error",
      message: "Bounced: user@example.com",
      resourceId: "email_a",
      recipient: "user@example.com",
      method: null,
      path: null,
      route: null,
      statusCode: null,
    }),
    line(tenant, {
      occurredAt: at(5),
      source: "webhook",
      type: "webhook.attempt",
      level: "warning",
      message: "email.bounced → https://hooks.example.com 500",
      resourceId: "email_a",
      statusCode: 500,
      method: null,
      path: null,
      route: null,
    }),
    // Same millisecond: keyset pagination must still be stable.
    line(tenant, { occurredAt: at(6) }),
    line(tenant, { occurredAt: at(6) }),
    line(tenant, { occurredAt: at(6) }),
    // Another environment of the same organization.
    line(tenant, { occurredAt: at(1), environmentId: tenant.development.id }),
  ]);
  return tenant;
}

describe("queryLogs", () => {
  test("newest first, paginates through equal timestamps without gaps", async () => {
    const tenant = await seeded();
    const seen: string[] = [];
    let after: string | undefined;
    for (;;) {
      const page = await queryLogs({ ...scope(tenant), ...range, limit: 2, after });
      seen.push(...page.data.map((entry) => entry.id));
      if (!page.has_more) break;
      after = page.data.at(-1)?.id;
    }
    expect(seen).toHaveLength(8);
    expect(new Set(seen).size).toBe(8);
    const all = await queryLogs({ ...scope(tenant), ...range, limit: 100 });
    expect(all.data.map((entry) => entry.id)).toEqual(seen);
    expect(all.data[0]?.occurred_at).toBe(at(6).toISOString());
  });

  test("filters", async () => {
    const tenant = await seeded();
    const q = async (filters: Parameters<typeof queryLogs>[0]["filters"]) =>
      (await queryLogs({ ...scope(tenant), ...range, filters, limit: 100 })).data.map(
        (entry) => entry.message,
      );
    expect(await q({ statuses: ["5xx"] })).toEqual([
      "email.bounced → https://hooks.example.com 500",
      "GET /v1/domains 500",
    ]);
    expect(await q({ levels: ["error"], sources: ["api"] })).toEqual(["GET /v1/domains 500"]);
    expect(await q({ methods: ["POST"], statuses: ["4xx"] })).toEqual(["POST /v1/emails 422"]);
    expect((await q({ exclude: { sources: ["api"] } })).length).toBe(2);
    expect((await q({ exclude: { methods: ["GET"] } })).length).toBe(4);
    expect((await q({ exclude: { statuses: ["2xx"] } })).length).toBe(4);
    expect(await q({ text: "BOUNCED: user" })).toEqual(["Bounced: user@example.com"]);
    expect(await q({ text: "100%" })).toEqual([]);
    expect(await q({ recipient: "USER@example.com" })).toEqual(["Bounced: user@example.com"]);
    expect((await q({ resourceId: "email_a" })).length).toBe(3);
    expect(await q({ requestId: "req_a" })).toEqual(["POST /v1/emails 202"]);
    expect((await q({ paths: ["/v1/e"] })).length).toBe(2);
  });

  test("never returns another environment's or organization's lines", async () => {
    const tenant = await seeded();
    const other = await createTestTenant();
    const foreign = await queryLogs({
      organizationId: other.organization.id,
      environmentId: tenant.production.id,
      ...range,
    });
    expect(foreign.data).toEqual([]);
    const dev = await queryLogs({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      ...range,
    });
    expect(dev.data).toHaveLength(1);
  });

  test("live tail returns newer lines oldest first", async () => {
    const tenant = await seeded();
    const page = await queryLogs({ ...scope(tenant), ...range, limit: 100 });
    const third = page.data[5];
    if (!third) throw new Error("missing");
    const newer = await queryLogs({ ...scope(tenant), ...range, before: third.id });
    expect(newer.data.map((entry) => entry.id)).toEqual(
      page.data
        .slice(0, 5)
        .map((e) => e.id)
        .reverse(),
    );
    expect((await queryLogs({ ...scope(tenant), ...range, after: "nope" })).data).toEqual([]);
  });
});

describe("one line", () => {
  test("get and related", async () => {
    const tenant = await seeded();
    const page = await queryLogs({ ...scope(tenant), ...range, filters: { requestId: "req_a" } });
    const request = page.data[0];
    if (!request) throw new Error("missing");
    expect(await getLogEntry(scope(tenant), request.id)).toEqual(request);
    expect(
      await getLogEntry({ ...scope(tenant), environmentId: tenant.development.id }, request.id),
    ).toBeNull();
    expect(await getLogEntry(scope(tenant), "log_nope")).toBeNull();
    const related = await relatedLogEntries(scope(tenant), request);
    expect(related.map((entry) => entry.type)).toEqual([
      "api.request",
      "email.bounced",
      "webhook.attempt",
    ]);
  });
});

describe("aggregates", () => {
  test("facets ignore their own filter", async () => {
    const tenant = await seeded();
    const facets = await logFacets({ ...scope(tenant), ...range, filters: { levels: ["error"] } });
    expect(facets.levels).toEqual([
      { value: "error", count: 2 },
      { value: "warning", count: 2 },
      { value: "info", count: 4 },
    ]);
    expect(facets.total).toBe(2);
    expect(facets.sources.sort((a, b) => a.value.localeCompare(b.value))).toEqual([
      { value: "api", count: 1 },
      { value: "email", count: 1 },
    ]);
    const all = await logFacets({ ...scope(tenant), ...range });
    expect(all.statuses).toEqual([
      { value: "2xx", count: 4 },
      { value: "4xx", count: 1 },
      { value: "5xx", count: 2 },
    ]);
  });

  test("histogram counts per level, zero-filled", async () => {
    const tenant = await seeded();
    const histogram = await logHistogram({ ...scope(tenant), from: T0, to: at(60), target: 6 });
    expect(histogram.bucketMs).toBe(10_000);
    expect(histogram.buckets).toHaveLength(6);
    expect(histogram.buckets[0]).toEqual({
      start: T0.toISOString(),
      info: 4,
      warning: 2,
      error: 2,
    });
    expect(histogram.buckets[1]).toMatchObject({ info: 0, warning: 0, error: 0 });
  });

  test("export streams CSV", async () => {
    const tenant = await seeded();
    const text = await new Response(
      logExportStream({ ...scope(tenant), ...range, filters: { levels: ["error"] } }, "csv"),
    ).text();
    const lines = text.trim().split("\r\n");
    expect(lines[0]).toStartWith("occurred_at,level,source");
    expect(lines).toHaveLength(3);
  });
});

describe("writer", () => {
  test("batches and flushes", async () => {
    const tenant = await createTestTenant();
    const writer = createLogWriter({ maxBatch: 2, flushMs: 60_000 });
    for (let i = 0; i < 5; i++) writer.write(line(tenant, { occurredAt: at(i) }));
    await writer.close();
    const page = await queryLogs({ ...scope(tenant), ...range, limit: 100 });
    expect(page.data).toHaveLength(5);
  });

  test("fails open", async () => {
    const tenant = await createTestTenant();
    const errors: number[] = [];
    const writer = createLogWriter({
      flushMs: 60_000,
      maxBuffer: 2,
      onError: (_error, dropped) => errors.push(dropped),
    });
    // A full buffer drops the oldest line.
    writer.write(line(tenant, { occurredAt: at(1) }));
    writer.write(line(tenant, { occurredAt: at(2) }));
    writer.write(line(tenant, { occurredAt: at(3) }));
    await writer.flush();
    expect(errors).toEqual([1]);
    const kept = await queryLogs({ ...scope(tenant), ...range });
    expect(kept.data.map((entry) => entry.occurred_at)).toEqual([
      at(3).toISOString(),
      at(2).toISOString(),
    ]);
    // A failed insert drops its batch without throwing.
    writer.write(line(tenant, { environmentId: "env_missing" }));
    await writer.flush();
    expect(errors).toEqual([1, 1]);
  });
});

describe("partitions", () => {
  test("ensure creates days ahead, moves default rows, drop removes expired days", async () => {
    const table = `log_entry_t${uniqueSuffix()}`.replaceAll(/[^a-z0-9_]/g, "");
    await db.execute(
      sql.raw(
        `create table "${table}" (like log_entry including defaults) partition by range (occurred_at); ` +
          `create table "${table}_default" partition of "${table}" default`,
      ),
    );
    try {
      const now = new Date("2026-05-10T12:00:00Z");
      await pool.query(
        `insert into "${table}" (id, organization_id, project_id, environment_id, occurred_at, source, level, type, message) values ('log_x', 'o', 'p', 'e', '2026-05-11T01:00:00Z', 'api', 'info', 't', 'm')`,
      );
      const created = await ensureLogPartitions({ table, now, aheadDays: 2 });
      expect(created).toEqual([
        `${table}_p20260509`,
        `${table}_p20260510`,
        `${table}_p20260511`,
        `${table}_p20260512`,
      ]);
      expect(await ensureLogPartitions({ table, now, aheadDays: 2 })).toEqual([]);
      const moved = await pool.query(`select count(*)::int as n from "${table}_p20260511"`);
      expect(moved.rows[0].n).toBe(1);

      const dropped = await dropExpiredLogPartitions({
        table,
        now: new Date("2026-05-12T03:00:00Z"),
        retentionDays: 2,
      });
      expect(dropped).toEqual([`${table}_p20260509`]);
      expect((await listLogPartitions({ table })).map((p) => p.name)).toEqual([
        `${table}_p20260510`,
        `${table}_p20260511`,
        `${table}_p20260512`,
      ]);
    } finally {
      await db.execute(sql.raw(`drop table if exists "${table}" cascade`));
    }
  });
});

describe("partitions without a default partition", () => {
  test("detach expired days concurrently, and finish a detach that was cut short", async () => {
    const table = `scratch_t${uniqueSuffix()}`.replaceAll(/[^a-z0-9_]/g, "").slice(0, 30);
    await db.execute(
      sql.raw(
        `create table "${table}" (id text not null, made_at timestamptz not null, primary key (made_at, id)) partition by range (made_at)`,
      ),
    );
    const spec = { table, column: "made_at", defaultPartition: false };
    try {
      const now = new Date("2026-05-10T12:00:00Z");
      expect(await ensurePartitions(spec, { now, aheadDays: 3 })).toHaveLength(5);
      await pool.query(`insert into "${table}" values ('a', '2026-05-09T10:00:00Z')`);
      // Outside every partition: refused, there is no default partition to catch it.
      await expect(
        pool.query(`insert into "${table}" values ('b', '2026-06-01T10:00:00Z')`),
      ).rejects.toThrow();

      // A detach interrupted after it detached but before it dropped the table.
      await pool.query(`alter table "${table}" detach partition "${table}_p20260510"`);

      const later = new Date("2026-05-12T03:00:00Z");
      const dropped = await dropExpiredPartitions(spec, { now: later, retentionDays: 1 });
      expect(dropped.sort()).toEqual([`${table}_p20260509`, `${table}_p20260510`]);
      expect((await listPartitions(table)).map((p) => p.name)).toEqual([
        `${table}_p20260511`,
        `${table}_p20260512`,
        `${table}_p20260513`,
      ]);
      const leftover = await pool.query("select to_regclass($1) as found", [`${table}_p20260510`]);
      expect(leftover.rows[0].found).toBeNull();
    } finally {
      await db.execute(sql.raw(`drop table if exists "${table}" cascade`));
      await db.execute(sql.raw(`drop table if exists "${table}_p20260510"`));
    }
  });
});

describe("org audit", () => {
  test("records and lists newest first with filters", async () => {
    const tenant = await createTestTenant();
    const actor = { type: "user" as const, id: tenant.owner.id, label: tenant.owner.email };
    const organizationId = tenant.organization.id;
    await recordOrgAuditEvent({
      organizationId,
      actor,
      action: "domain.created",
      target: { type: "domain", id: "dom_1", label: "a.test" },
    });
    await recordOrgAuditEvent({
      organizationId,
      actor,
      action: "domain.deleted",
      target: { type: "domain", id: "dom_1", label: "a.test" },
    });
    await recordOrgAuditEvent({ organizationId, actor, action: "api_key.created" });
    const all = await listOrgAuditEvents({ organizationId });
    expect(all.events.map((event) => event.action)).toEqual([
      "api_key.created",
      "domain.deleted",
      "domain.created",
    ]);
    const domains = await listOrgAuditEvents({ organizationId, filters: { actions: ["domain."] } });
    expect(domains.events).toHaveLength(2);
    const page = await listOrgAuditEvents({ organizationId, limit: 2 });
    expect(page.nextBefore).toBe(page.events[1]?.id ?? null);
    const rest = await listOrgAuditEvents({ organizationId, before: page.nextBefore ?? "" });
    expect(rest.events.map((event) => event.action)).toEqual(["domain.created"]);
    const other = await createTestTenant();
    expect((await listOrgAuditEvents({ organizationId: other.organization.id })).events).toEqual(
      [],
    );
  });
});
