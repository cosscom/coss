import { describe, expect, test } from "bun:test";
import { FakeIdentityProvider, MAX_PENDING_DOMAINS } from "@coss/email";
import type { DomainListOutput, DomainObjectOutput } from "@coss/email/schemas";
import { createVerifiedDomain } from "@coss/email/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  errorOf,
  expireDomainVerification,
  REQUEST_ID,
  setKeyPermissions,
  uniqueDomainName,
} from "./helpers.ts";

/** An app whose fake identity provider leaves every domain `pending` (nothing verifies). */
function appWithUnverifiedDomains() {
  return createTestApp({
    domainDeps: { identity: new FakeIdentityProvider({ verify: () => false }), dns: null },
  });
}

describe("POST /v1/domains", () => {
  test("claims the domain and returns the records to publish", async () => {
    const tenant = await createTestTenant();
    const { app } = appWithUnverifiedDomains();
    const name = uniqueDomainName();

    const res = await apiRequest(app, "POST", "/v1/domains", {
      key: tenant.liveKey,
      body: { name },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toMatch(REQUEST_ID);
    const domain = (await res.json()) as DomainObjectOutput;
    expect(domain).toMatchObject({
      object: "domain",
      name,
      status: "pending",
      can_send: false,
      mail_from_domain: `send.${name}`,
      mail_from_status: "pending",
      verified_at: null,
      failed_at: null,
    });
    expect(domain.id).toStartWith("dom_");
    // Three DKIM CNAMEs, the MAIL FROM MX and SPF records, and the recommended DMARC record.
    expect(domain.records.map((record) => [record.purpose, record.type])).toEqual([
      ["dkim", "CNAME"],
      ["dkim", "CNAME"],
      ["dkim", "CNAME"],
      ["mail_from_mx", "MX"],
      ["mail_from_spf", "TXT"],
      ["dmarc", "TXT"],
    ]);
    expect(domain.records.every((record) => record.status === "not_checked")).toBe(true);
    expect(domain.records.filter((record) => !record.required)).toHaveLength(1);
  });

  test("a sandbox key manages the same organization-wide domains as a live key", async () => {
    const tenant = await createTestTenant();
    const { app } = appWithUnverifiedDomains();
    const name = uniqueDomainName();

    const created = await apiRequest(app, "POST", "/v1/domains", {
      key: tenant.sandboxKey,
      body: { name },
    });
    const seenByLiveKey = await apiRequest(
      app,
      "GET",
      `/v1/domains/${((await created.json()) as DomainObjectOutput).id}`,
      { key: tenant.liveKey },
    );

    expect(created.status).toBe(200);
    expect(seenByLiveKey.status).toBe(200);
    expect((await seenByLiveKey.json()) as DomainObjectOutput).toMatchObject({ name });
  });

  test("an unusable name is 422 invalid_domain naming the field", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const res = await apiRequest(app, "POST", "/v1/domains", {
      key: tenant.liveKey,
      body: { name: "https://acme.com/path" },
    });

    expect(res.status).toBe(422);
    expect(await errorOf(res)).toMatchObject({
      type: "invalid_request_error",
      code: "invalid_domain",
      param: "name",
    });
  });

  test("a name already claimed by another organization is 422 domain_taken", async () => {
    const [mine, theirs] = await Promise.all([createTestTenant(), createTestTenant()]);
    const { app } = createTestApp();
    const existing = await createVerifiedDomain(theirs.organization.id);

    const res = await apiRequest(app, "POST", "/v1/domains", {
      key: mine.liveKey,
      body: { name: existing.name },
    });

    expect(res.status).toBe(422);
    const error = await errorOf(res);
    expect(error).toMatchObject({ code: "domain_taken", param: "name" });
    expect(error.message).toContain("another account");
  });

  test("an unknown field is 422 validation_error", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const res = await apiRequest(app, "POST", "/v1/domains", {
      key: tenant.liveKey,
      body: { name: uniqueDomainName(), region: "eu-west-1" },
    });

    expect(res.status).toBe(422);
    expect(await errorOf(res)).toMatchObject({
      code: "validation_error",
      issues: [{ path: "region", message: 'Unrecognized field "region".' }],
    });
  });

  test(`more than ${MAX_PENDING_DOMAINS} pending domains is 422 too_many_pending_domains`, async () => {
    const tenant = await createTestTenant();
    const { app } = appWithUnverifiedDomains();

    for (let i = 0; i < MAX_PENDING_DOMAINS; i++) {
      const res = await apiRequest(app, "POST", "/v1/domains", {
        key: tenant.liveKey,
        body: { name: uniqueDomainName() },
      });
      expect(res.status).toBe(200);
    }
    const res = await apiRequest(app, "POST", "/v1/domains", {
      key: tenant.liveKey,
      body: { name: uniqueDomainName() },
    });

    expect(res.status).toBe(422);
    expect(await errorOf(res)).toMatchObject({ code: "too_many_pending_domains" });
  });

  test("a key without domain:create is 403", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const keyId = await apiKeyIdForEnvironment(tenant.production.id);
    await setKeyPermissions(keyId, { domain: ["read"] });

    const res = await apiRequest(app, "POST", "/v1/domains", {
      key: tenant.liveKey,
      body: { name: uniqueDomainName() },
    });

    expect(res.status).toBe(403);
    expect(await errorOf(res)).toMatchObject({
      type: "permission_error",
      code: "insufficient_permissions",
    });
  });
});

describe("GET /v1/domains", () => {
  test("lists only the organization's own domains, by name", async () => {
    const [mine, theirs] = await Promise.all([createTestTenant(), createTestTenant()]);
    const { app } = createTestApp();
    const names = [`b-${uniqueDomainName()}`, `a-${uniqueDomainName()}`];
    await Promise.all(names.map((name) => createVerifiedDomain(mine.organization.id, name)));
    await createVerifiedDomain(theirs.organization.id);

    const res = await apiRequest(app, "GET", "/v1/domains", { key: mine.liveKey });

    expect(res.status).toBe(200);
    const list = (await res.json()) as DomainListOutput;
    expect(list.object).toBe("list");
    expect(list.has_more).toBe(false);
    expect(list.data.map((domain) => domain.name)).toEqual([...names].sort());
  });
});

describe("GET /v1/domains/{id}", () => {
  test("returns a verified domain with its checked records", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const existing = await createVerifiedDomain(tenant.organization.id);

    const res = await apiRequest(app, "GET", `/v1/domains/${existing.id}`, {
      key: tenant.sandboxKey,
    });

    expect(res.status).toBe(200);
    expect((await res.json()) as DomainObjectOutput).toMatchObject({
      object: "domain",
      id: existing.id,
      name: existing.name,
      status: "verified",
      can_send: true,
      region: "us-east-1",
    });
  });

  test("another organization's domain is 404, like an unknown id", async () => {
    const [mine, theirs] = await Promise.all([createTestTenant(), createTestTenant()]);
    const { app } = createTestApp();
    const existing = await createVerifiedDomain(theirs.organization.id);

    const responses = await Promise.all([
      apiRequest(app, "GET", `/v1/domains/${existing.id}`, { key: mine.liveKey }),
      apiRequest(app, "GET", "/v1/domains/dom_01k7c8m4q2f3e9v6t5r1n0p8yz", { key: mine.liveKey }),
      apiRequest(app, "GET", "/v1/domains/not-an-id", { key: mine.liveKey }),
    ]);

    expect(responses.map((res) => res.status)).toEqual([404, 404, 404]);
    for (const res of responses) {
      expect(await errorOf(res)).toMatchObject({ type: "not_found_error", code: "not_found" });
    }
  });
});

describe("POST /v1/domains/{id}/verify", () => {
  test("checks the provider now and verifies the domain", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = (await (
      await apiRequest(app, "POST", "/v1/domains", {
        key: tenant.liveKey,
        body: { name: uniqueDomainName() },
      })
    ).json()) as DomainObjectOutput;

    const res = await apiRequest(app, "POST", `/v1/domains/${created.id}/verify`, {
      key: tenant.liveKey,
    });

    expect(res.status).toBe(200);
    const domain = (await res.json()) as DomainObjectOutput;
    expect(domain).toMatchObject({ id: created.id, status: "verified", can_send: true });
    expect(domain.verified_at).not.toBeNull();
    expect(domain.last_checked_at).not.toBeNull();
  });

  test("checking again straight away is 429 with Retry-After", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = (await (
      await apiRequest(app, "POST", "/v1/domains", {
        key: tenant.liveKey,
        body: { name: uniqueDomainName() },
      })
    ).json()) as DomainObjectOutput;
    await apiRequest(app, "POST", `/v1/domains/${created.id}/verify`, { key: tenant.liveKey });

    const res = await apiRequest(app, "POST", `/v1/domains/${created.id}/verify`, {
      key: tenant.liveKey,
    });

    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await errorOf(res)).toMatchObject({
      type: "rate_limit_error",
      code: "domain_recently_checked",
    });
  });

  test("a failed domain restarts verification with fresh records", async () => {
    const tenant = await createTestTenant();
    // Nothing verifies, and the verification window has already passed, so the check fails it.
    const { app } = appWithUnverifiedDomains();
    const created = (await (
      await apiRequest(app, "POST", "/v1/domains", {
        key: tenant.liveKey,
        body: { name: uniqueDomainName() },
      })
    ).json()) as DomainObjectOutput;
    await expireDomainVerification(created.id);

    const failed = (await (
      await apiRequest(app, "POST", `/v1/domains/${created.id}/verify`, { key: tenant.liveKey })
    ).json()) as DomainObjectOutput;
    const restarted = (await (
      await apiRequest(app, "POST", `/v1/domains/${created.id}/verify`, { key: tenant.liveKey })
    ).json()) as DomainObjectOutput;

    expect(failed).toMatchObject({ status: "failed", can_send: false });
    expect(restarted).toMatchObject({ status: "pending", failed_at: null });
    const dkim = (domain: DomainObjectOutput) =>
      domain.records.filter((record) => record.purpose === "dkim").map((record) => record.value);
    expect(dkim(restarted)).not.toEqual(dkim(failed));
  });

  test("a key without domain:verify is 403", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const existing = await createVerifiedDomain(tenant.organization.id);
    const keyId = await apiKeyIdForEnvironment(tenant.production.id);
    await setKeyPermissions(keyId, { domain: ["read"] });

    const res = await apiRequest(app, "POST", `/v1/domains/${existing.id}/verify`, {
      key: tenant.liveKey,
    });

    expect(res.status).toBe(403);
  });
});

describe("DELETE /v1/domains/{id}", () => {
  test("removes the domain and frees the name", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const name = uniqueDomainName();
    const created = (await (
      await apiRequest(app, "POST", "/v1/domains", { key: tenant.liveKey, body: { name } })
    ).json()) as DomainObjectOutput;

    const res = await apiRequest(app, "DELETE", `/v1/domains/${created.id}`, {
      key: tenant.liveKey,
    });
    const afterwards = await apiRequest(app, "GET", `/v1/domains/${created.id}`, {
      key: tenant.liveKey,
    });
    const reclaimed = await apiRequest(app, "POST", "/v1/domains", {
      key: tenant.liveKey,
      body: { name },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ object: "domain", id: created.id, deleted: true });
    expect(afterwards.status).toBe(404);
    expect(reclaimed.status).toBe(200);
  });

  test("another organization's domain is 404 and stays put", async () => {
    const [mine, theirs] = await Promise.all([createTestTenant(), createTestTenant()]);
    const { app } = createTestApp();
    const existing = await createVerifiedDomain(theirs.organization.id);

    const res = await apiRequest(app, "DELETE", `/v1/domains/${existing.id}`, {
      key: mine.liveKey,
    });
    const theirView = await apiRequest(app, "GET", `/v1/domains/${existing.id}`, {
      key: theirs.liveKey,
    });

    expect(res.status).toBe(404);
    expect(theirView.status).toBe(200);
  });
});
