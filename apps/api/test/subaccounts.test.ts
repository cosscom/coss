import { describe, expect, test } from "bun:test";
import { createPlanGate } from "@coss/billing";
import { createTestContract } from "@coss/billing/testing";
import { db } from "@coss/db";
import { runDueSubaccountDeletions } from "@coss/email";
import type { SubaccountOutput } from "@coss/email/subaccount-schemas";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  emailBody,
  errorOf,
  setKeyPermissions,
} from "./helpers.ts";

async function json<T = unknown>(response: Response, status = 200): Promise<T> {
  if (response.status !== status) {
    throw new Error(`expected ${status}, got ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

describe("sub-accounts API", () => {
  test("create, read by id and uid, update, list, delete", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;

    const created = await json<SubaccountOutput>(
      await apiRequest(app, "POST", "/v1/subaccounts", {
        key,
        body: {
          name: "Acme Bakery",
          uid: "user_1",
          metadata: { plan: "pro" },
          quotas: { recipients_per_day: 500 },
        },
      }),
    );
    expect(created).toMatchObject({
      object: "subaccount",
      uid: "user_1",
      name: "Acme Bakery",
      status: "active",
      quotas: { recipients_per_day: 500, recipients_per_second: null, burst: null },
      reputation: { status: "good", trigger: null },
    });
    expect(created.id).toStartWith("sub_");

    const byUid = await json<SubaccountOutput>(
      await apiRequest(app, "GET", "/v1/subaccounts/user_1", { key }),
    );
    const byId = await json<SubaccountOutput>(
      await apiRequest(app, "GET", `/v1/subaccounts/${created.id}`, { key }),
    );
    expect(byUid.id).toBe(created.id);
    expect(byId.uid).toBe("user_1");

    const updated = await json<SubaccountOutput>(
      await apiRequest(app, "PATCH", "/v1/subaccounts/user_1", {
        key,
        body: {
          status: "disabled",
          quotas: { recipients_per_day: null, recipients_per_second: 5, burst: 20 },
        },
      }),
    );
    expect(updated).toMatchObject({
      status: "disabled",
      quotas: { recipients_per_day: null, recipients_per_second: 5, burst: 20 },
    });

    await json(await apiRequest(app, "POST", "/v1/subaccounts", { key, body: { name: "Two" } }));
    const page = await json<{ data: SubaccountOutput[]; has_more: boolean }>(
      await apiRequest(app, "GET", "/v1/subaccounts?limit=1", { key }),
    );
    expect(page.data).toHaveLength(1);
    expect(page.has_more).toBe(true);
    expect(page.data[0]?.name).toBe("Two");
    const next = await json<{ data: SubaccountOutput[]; has_more: boolean }>(
      await apiRequest(app, "GET", `/v1/subaccounts?limit=1&after=${page.data[0]?.id}`, { key }),
    );
    expect(next.data.map((row) => row.id)).toEqual([created.id]);
    expect(next.has_more).toBe(false);

    const deleting = await json<SubaccountOutput>(
      await apiRequest(app, "DELETE", "/v1/subaccounts/user_1", { key }),
      202,
    );
    expect(deleting.status).toBe("deleting");
    // Repeating it returns it as it is; changes are refused.
    expect(
      (
        await json<SubaccountOutput>(
          await apiRequest(app, "DELETE", "/v1/subaccounts/user_1", { key }),
          202,
        )
      ).status,
    ).toBe("deleting");
    const refused = await apiRequest(app, "PATCH", "/v1/subaccounts/user_1", {
      key,
      body: { name: "Back" },
    });
    expect(refused.status).toBe(422);
    expect((await errorOf(refused)).code).toBe("subaccount_deleting");

    const removed = await runDueSubaccountDeletions(
      { release: async () => {} },
      { scope: { organizationIds: [tenant.organization.id] } },
    );
    expect(removed).toBe(1);
    const gone = await apiRequest(app, "GET", "/v1/subaccounts/user_1", { key });
    expect(gone.status).toBe(404);
    expect(await errorOf(gone)).toMatchObject({
      type: "not_found_error",
      code: "subaccount_not_found",
    });
  });

  test("a list's cursor is a sub-account of the key's environment", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    // An older sandbox one, which a cursor resolved in the live environment would page to.
    await json(
      await apiRequest(app, "POST", "/v1/subaccounts", {
        key: tenant.sandboxKey,
        body: { name: "Sandbox" },
      }),
    );
    const live = await json<SubaccountOutput>(
      await apiRequest(app, "POST", "/v1/subaccounts", {
        key: tenant.liveKey,
        body: { name: "Live" },
      }),
    );
    const page = await json<{ data: SubaccountOutput[] }>(
      await apiRequest(app, "GET", `/v1/subaccounts?after=${live.id}`, { key: tenant.sandboxKey }),
    );
    expect(page.data).toEqual([]);
  });

  test("uids are unique per environment; environments never see each other's", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const create = (key: string) =>
      apiRequest(app, "POST", "/v1/subaccounts", { key, body: { name: "A", uid: "same" } });
    await json(await create(tenant.sandboxKey));
    const taken = await create(tenant.sandboxKey);
    expect(taken.status).toBe(422);
    expect(await errorOf(taken)).toMatchObject({ code: "uid_taken", param: "uid" });
    // The live environment has its own (no plan gate in this app).
    await json(await create(tenant.liveKey));

    const other = await createTestTenant();
    const foreign = await apiRequest(app, "GET", "/v1/subaccounts/same", {
      key: other.sandboxKey,
    });
    expect(foreign.status).toBe(404);
  });

  test("a burst needs a per-second quota at least as large", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const response = await apiRequest(app, "POST", "/v1/subaccounts", {
      key: tenant.sandboxKey,
      body: { name: "A", quotas: { burst: 10 } },
    });
    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({
      code: "invalid_quotas",
      param: "quotas.burst",
    });
    const smaller = await apiRequest(app, "POST", "/v1/subaccounts", {
      key: tenant.sandboxKey,
      body: { name: "A", quotas: { recipients_per_second: 10, burst: 5 } },
    });
    expect((await errorOf(smaller)).code).toBe("invalid_quotas");
  });

  test("live sub-accounts need a plan with them, up to its limit", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp({ plans: createPlanGate() });
    const create = (key: string) =>
      apiRequest(app, "POST", "/v1/subaccounts", { key, body: { name: "A" } });
    const free = await create(tenant.liveKey);
    expect(free.status).toBe(402);
    expect((await errorOf(free)).code).toBe("plan_feature_unavailable");
    // Sandbox ones are free, so platforms can build their integration first.
    await json(await create(tenant.sandboxKey));

    await createTestContract(
      tenant.organization.id,
      {
        version: 1,
        plan: "scale",
        entitlements: { limits: { subaccounts: 1 } },
      },
      { effectiveFrom: new Date("2026-01-01T00:00:00Z") },
    );
    await json(await create(tenant.liveKey));
    const full = await create(tenant.liveKey);
    expect(full.status).toBe(402);
    expect((await errorOf(full)).code).toBe("plan_limit_reached");
  });

  test("concurrent creates can't go past the plan's limit", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp({ plans: createPlanGate() });
    await createTestContract(
      tenant.organization.id,
      { version: 1, plan: "scale", entitlements: { limits: { subaccounts: 2 } } },
      { effectiveFrom: new Date("2026-01-01T00:00:00Z") },
    );
    const responses = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        apiRequest(app, "POST", "/v1/subaccounts", {
          key: tenant.liveKey,
          body: { name: `A${i}` },
        }),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 200, 402, 402, 402, 402,
    ]);
  });

  test("a uid can't look like a sub-account id", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = await apiRequest(app, "POST", "/v1/subaccounts", {
      key: tenant.sandboxKey,
      body: { name: "A", uid: "sub_01k0000000000000000000000" },
    });
    expect(created.status).toBe(422);
    const { id } = await json<SubaccountOutput>(
      await apiRequest(app, "POST", "/v1/subaccounts", {
        key: tenant.sandboxKey,
        body: { name: "A" },
      }),
    );
    const updated = await apiRequest(app, "PATCH", `/v1/subaccounts/${id}`, {
      key: tenant.sandboxKey,
      body: { uid: "sub_custom" },
    });
    expect(updated.status).toBe(422);
    // Path segments resolve to another URL.
    for (const uid of [".", ".."]) {
      const dots = await apiRequest(app, "PATCH", `/v1/subaccounts/${id}`, {
        key: tenant.sandboxKey,
        body: { uid },
      });
      expect(dots.status).toBe(422);
    }
  });

  test("keys need the subaccount permission", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      email: ["send"],
    });
    const response = await apiRequest(app, "GET", "/v1/subaccounts", { key: tenant.sandboxKey });
    expect(response.status).toBe(403);
    expect((await errorOf(response)).code).toBe("insufficient_permissions");
  });

  test("deleting releases before removing, and retries a failed release", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = await json<SubaccountOutput>(
      await apiRequest(app, "POST", "/v1/subaccounts", {
        key: tenant.sandboxKey,
        body: { name: "A" },
      }),
    );
    await json(
      await apiRequest(app, "DELETE", `/v1/subaccounts/${created.id}`, { key: tenant.sandboxKey }),
      202,
    );
    const scope = { organizationIds: [tenant.organization.id] };
    const released: string[] = [];
    const failing = await runDueSubaccountDeletions(
      {
        release: async () => {
          throw new Error("provider down");
        },
      },
      { scope },
    );
    expect(failing).toBe(0);
    // Backed off: not claimable again right away.
    expect(
      await runDueSubaccountDeletions(
        { release: async (row) => void released.push(row.id) },
        { scope },
      ),
    ).toBe(0);
    const later = new Date(Date.now() + 2 * 60 * 60 * 1000);
    expect(
      await runDueSubaccountDeletions(
        { release: async (row) => void released.push(row.id) },
        { scope, now: later },
      ),
    ).toBe(1);
    expect(released).toEqual([created.id]);
    const rows = await db.query.emailSubaccount.findMany({
      where: (row, { eq }) => eq(row.id, created.id),
    });
    expect(rows).toEqual([]);
  });

  test("sends count toward the sub-account's own quotas, refunded when one denies", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;
    for (const uid of ["capped", "free"]) {
      await json(
        await apiRequest(app, "POST", "/v1/subaccounts", {
          key,
          body: { name: uid, uid, quotas: uid === "capped" ? { recipients_per_day: 2 } : {} },
        }),
      );
    }
    const send = (subaccount: string, to: string[]) =>
      apiRequest(app, "POST", "/v1/emails", { key, body: emailBody({ to, subaccount }) });

    expect((await send("capped", ["a@example.com", "b@example.com"])).status).toBe(202);
    const over = await send("capped", ["c@example.com"]);
    expect(over.status).toBe(429);
    expect(await errorOf(over)).toMatchObject({ code: "quota_exceeded" });
    expect((await send("free", ["c@example.com"])).status).toBe(202);

    // A batch is charged per sub-account it names, all or nothing.
    const batch = await apiRequest(app, "POST", "/v1/emails/batch", {
      key,
      body: {
        emails: [
          emailBody({ to: "d@example.com", subaccount: "free" }),
          emailBody({ to: "e@example.com", subaccount: "capped" }),
        ],
      },
    });
    expect(batch.status).toBe(429);
  });

  test("a send names a sub-account of its environment, transactional only", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const unknown = await apiRequest(app, "POST", "/v1/emails", {
      key: tenant.sandboxKey,
      body: emailBody({ subaccount: "nobody" }),
    });
    expect(unknown.status).toBe(422);
    expect(await errorOf(unknown)).toMatchObject({
      code: "subaccount_not_found",
      param: "subaccount",
    });
    const marketing = await apiRequest(app, "POST", "/v1/emails", {
      key: tenant.sandboxKey,
      body: emailBody({ subaccount: "nobody", stream: "marketing" }),
    });
    expect(marketing.status).toBe(422);
    expect((await errorOf(marketing)).issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "subaccount" })]),
    );
  });

  test("domains for a sub-account, listed by sub-account, and shared parent domains", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.liveKey;
    await json(
      await apiRequest(app, "POST", "/v1/subaccounts", { key, body: { name: "A", uid: "a" } }),
    );
    const suffix = crypto.randomUUID().slice(0, 8);
    const own = await json<{ id: string; subaccount_id: string | null }>(
      await apiRequest(app, "POST", "/v1/domains", {
        key,
        body: { name: `own-${suffix}.coss.test` },
      }),
    );
    const theirs = await json<{ id: string; subaccount_id: string | null }>(
      await apiRequest(app, "POST", "/v1/domains", {
        key,
        body: { name: `a-${suffix}.coss.test`, subaccount: "a" },
      }),
    );
    expect(own.subaccount_id).toBeNull();
    expect(theirs.subaccount_id).toStartWith("sub_");

    const listed = await json<{ data: { id: string }[] }>(
      await apiRequest(app, "GET", "/v1/domains?subaccount=a", { key }),
    );
    expect(listed.data.map((row) => row.id)).toEqual([theirs.id]);

    const shared = await json<{ shared_with_subaccounts: boolean }>(
      await apiRequest(app, "PATCH", `/v1/domains/${own.id}`, {
        key,
        body: { shared_with_subaccounts: true },
      }),
    );
    expect(shared.shared_with_subaccounts).toBe(true);
    const refused = await apiRequest(app, "PATCH", `/v1/domains/${theirs.id}`, {
      key,
      body: { shared_with_subaccounts: true },
    });
    expect(refused.status).toBe(422);
    expect((await errorOf(refused)).code).toBe("not_shareable");

    const unknown = await apiRequest(app, "POST", "/v1/domains", {
      key,
      body: { name: `x-${suffix}.coss.test`, subaccount: "nobody" },
    });
    expect(unknown.status).toBe(422);
    expect(await errorOf(unknown)).toMatchObject({
      code: "subaccount_not_found",
      param: "subaccount",
    });
  });
});
