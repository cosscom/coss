import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { addMember, createTestTenant, createTestUser } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import {
  enqueueNotification,
  listNotifications,
  type NotificationKinds,
  purgeExpiredNotifications,
  runDueNotifications,
} from "../src/index.ts";
import { recordingNotifier } from "../src/testing.ts";

const DASHBOARD = "https://coss.test";
const MINUTE = 60_000;

const kinds: NotificationKinds = {
  "test.hello": {
    render: (context) => ({
      subject: `Hello ${context.organization.name}`,
      blocks: [
        { paragraph: `Payload says ${String(context.payload.word)}.` },
        { button: { label: "Open", url: context.url(`/${context.organization.slug}/sms`) } },
      ],
    }),
  },
  "test.stale": { render: () => ({ skip: "Already done." }) },
};

async function enqueue(organizationId: string, kind: string, extra: { notBefore?: Date } = {}) {
  return db.transaction((tx) =>
    enqueueNotification(tx, {
      organizationId,
      kind,
      dedupeKey: "one",
      payload: { word: "hi" },
      ...extra,
    }),
  );
}

describe("notification outbox", () => {
  test("sends once per dedupe key to verified owners and admins, with the shared footer", async () => {
    const tenant = await createTestTenant();
    const admin = await createTestUser();
    const unverified = await createTestUser({ emailVerified: false });
    const plain = await createTestUser();
    await addMember({ organizationId: tenant.organization.id, userId: admin.id, role: "admin" });
    await addMember({
      organizationId: tenant.organization.id,
      userId: unverified.id,
      role: "admin",
    });
    await addMember({ organizationId: tenant.organization.id, userId: plain.id, role: "member" });

    expect(await enqueue(tenant.organization.id, "test.hello")).toBe(true);
    expect(await enqueue(tenant.organization.id, "test.hello")).toBe(false);

    const notifier = recordingNotifier();
    const scope = { organizationIds: [tenant.organization.id] };
    expect(await runDueNotifications({ scope }, { notifier, kinds, dashboardUrl: DASHBOARD })).toBe(
      1,
    );
    expect(notifier.sent.map((notice) => notice.to).sort()).toEqual(
      [tenant.owner.email, admin.email].sort(),
    );
    const [notice] = notifier.sent;
    expect(notice?.subject).toBe(`Hello ${tenant.organization.name}`);
    expect(notice?.text).toContain(`Open: ${DASHBOARD}/${tenant.organization.slug}/sms`);
    expect(notice?.text).toContain("You're receiving this because you're an owner or admin");
    expect(notice?.idempotencyKey).toMatch(/^ntf_/);

    const [row] = await listNotifications(tenant.organization.id);
    expect(row?.status).toBe("sent");
    expect(row?.nextAttemptAt).toBeNull();
    // Nothing left to send.
    expect(await runDueNotifications({ scope }, { notifier, kinds, dashboardUrl: DASHBOARD })).toBe(
      0,
    );
  });

  test("waits for notBefore, and skips what its kind says is stale", async () => {
    const tenant = await createTestTenant();
    const now = new Date();
    await enqueue(tenant.organization.id, "test.stale", {
      notBefore: new Date(now.getTime() + 60 * MINUTE),
    });
    const notifier = recordingNotifier();
    const scope = { organizationIds: [tenant.organization.id] };
    const deps = { notifier, kinds, dashboardUrl: DASHBOARD };
    expect(await runDueNotifications({ scope, now }, deps)).toBe(0);
    expect(
      await runDueNotifications({ scope, now: new Date(now.getTime() + 61 * MINUTE) }, deps),
    ).toBe(1);
    expect(notifier.sent).toEqual([]);
    const [row] = await listNotifications(tenant.organization.id);
    expect(row?.status).toBe("skipped");
    expect(row?.lastError).toBe("Already done.");
  });

  test("an unknown kind or a failing sender is retried with backoff, then given up", async () => {
    const tenant = await createTestTenant();
    await enqueue(tenant.organization.id, "test.unknown");
    const scope = { organizationIds: [tenant.organization.id] };
    const deps = { notifier: recordingNotifier(), kinds, dashboardUrl: DASHBOARD };
    let now = new Date();
    for (let attempt = 1; attempt <= 8; attempt++) {
      expect(await runDueNotifications({ scope, now }, deps)).toBe(1);
      now = new Date(now.getTime() + 61 * MINUTE);
    }
    const [row] = await listNotifications(tenant.organization.id);
    expect(row?.status).toBe("failed");
    expect(row?.lastError).toContain("Unknown notification kind");
  });

  test("a worker whose lease ran out can't overwrite the outcome of the one that took over", async () => {
    const tenant = await createTestTenant();
    await enqueue(tenant.organization.id, "test.hello");
    const scope = { organizationIds: [tenant.organization.id] };
    const now = new Date();
    const takeover = recordingNotifier();
    // The first worker's send outlives its lease: another worker claims, sends and settles the
    // row meanwhile, then the first one's send fails.
    const slow = {
      async send() {
        await runDueNotifications(
          { scope, now: new Date(now.getTime() + 6 * MINUTE) },
          { notifier: takeover, kinds, dashboardUrl: DASHBOARD },
        );
        throw new Error("Timed out (test).");
      },
    };
    await runDueNotifications({ scope, now }, { notifier: slow, kinds, dashboardUrl: DASHBOARD });
    expect(takeover.sent).toHaveLength(1);
    const [row] = await listNotifications(tenant.organization.id);
    expect(row).toMatchObject({ status: "sent", nextAttemptAt: null, attemptCount: 2 });
  });

  test("old notifications are skipped, and settled ones are purged after retention", async () => {
    const tenant = await createTestTenant();
    await enqueue(tenant.organization.id, "test.hello");
    const scope = { organizationIds: [tenant.organization.id] };
    const later = new Date(Date.now() + 4 * 24 * 60 * MINUTE);
    const notifier = recordingNotifier();
    await runDueNotifications({ scope, now: later }, { notifier, kinds, dashboardUrl: DASHBOARD });
    expect(notifier.sent).toEqual([]);
    const [row] = await listNotifications(tenant.organization.id);
    expect(row?.status).toBe("skipped");

    expect(await purgeExpiredNotifications({ scope })).toBe(0);
    expect(
      await purgeExpiredNotifications({
        scope,
        now: new Date(Date.now() + 91 * 24 * 60 * MINUTE),
      }),
    ).toBe(1);
    const left = await db
      .select()
      .from(schema.notification)
      .where(eq(schema.notification.organizationId, tenant.organization.id));
    expect(left).toEqual([]);
  });
});
