import { afterAll, describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { requestHash } from "@coss/db/idempotency";
import { MemoryStore, type RateLimitStore } from "@coss/ratelimit";
import { testPrefix, testValkeyStore } from "@coss/ratelimit/testing";
import { fakeClassifier } from "@coss/screening/testing";
import { TEST_SECRETS_KEYS } from "@coss/webhooks/testing";
import { eq } from "drizzle-orm";
import {
  checkRiskLimit,
  createRiskLimitBucket,
  deleteRiskLimitBucket,
  getRiskLimitBucket,
  listRiskLimitBuckets,
  updateRiskLimitBucket,
} from "../src/limits.ts";
import { checkEmail, checkIp, classifyContent } from "../src/lookups.ts";
import { createRiskRule } from "../src/rules.ts";
import {
  CheckRiskLimitRequest,
  CreateRiskLimitBucketRequest,
  CreateRiskRuleRequest,
  DISABLEABLE_REASON_CODES,
  UpdateRiskSettingsRequest,
} from "../src/schemas.ts";
import { getRiskSettings, updateRiskSettings } from "../src/settings.ts";
import { fakeDomainAges, fakeMailDomains, TEST_IPS } from "../src/testing.ts";
import { setup } from "./helpers.ts";

const codes = (assessment: { reasons: { code: string }[] }) =>
  assessment.reasons.map((reason) => reason.code);
const bucket = (input: unknown) => CreateRiskLimitBucketRequest.parse(input);
const limit = (input: unknown) => CheckRiskLimitRequest.parse(input);

describe("email check", () => {
  test("reports what an assessment would see, without storing anything", async () => {
    const { deps, live } = await setup({
      checkMailDomain: fakeMailDomains({ "nowhere.example": "undeliverable" }),
      domainAge: fakeDomainAges({ "young.example": 3 }),
    });
    expect(await checkEmail(deps, live, "Ada.Lovelace+news@gnail.com")).toMatchObject({
      object: "risk_email_check",
      email: "Ada.Lovelace+news@gnail.com",
      valid: true,
      domain: "gnail.com",
      suggestion: "gmail.com",
      deliverability: "deliverable",
      degraded: [],
    });
    expect(await checkEmail(deps, live, "info@young.example")).toMatchObject({
      role_account: true,
      free_provider: false,
      domain_age_days: 3,
    });
    expect(await checkEmail(deps, live, "a@nowhere.example")).toMatchObject({
      deliverability: "undeliverable",
    });
    expect(await checkEmail(deps, live, "a@mailinator.com")).toMatchObject({
      disposable: true,
      domain_age_days: null,
    });
    expect(await checkEmail(deps, live, "not an address")).toMatchObject({
      valid: false,
      domain: null,
      canonical: null,
      deliverability: "unknown",
      degraded: [],
    });
  });

  test("folds aliases into the canonical mailbox", async () => {
    const { deps, live } = await setup();
    const result = await checkEmail(deps, live, "Ada.Lovelace+news@gmail.com");
    expect(result.canonical).toBe("adalovelace@gmail.com");
    expect(result.free_provider).toBe(true);
  });

  test("reports failed lookups as degraded", async () => {
    const { deps, live } = await setup({
      checkMailDomain: async () => {
        throw new Error("DNS down");
      },
      domainAge: null,
    });
    expect((await checkEmail(deps, live, "a@acme.example")).degraded).toEqual([
      "email_dns",
      "domain_age",
    ]);
  });

  test("sandbox environments use the documented fixtures", async () => {
    const { deps, sandbox } = await setup();
    expect(await checkEmail(deps, sandbox, "a@disposable.test")).toMatchObject({
      disposable: true,
    });
    expect(await checkEmail(deps, sandbox, "a@undeliverable.test")).toMatchObject({
      deliverability: "undeliverable",
    });
    expect(await checkEmail(deps, sandbox, "a@new.test")).toMatchObject({ domain_age_days: 2 });
  });
});

describe("IP check", () => {
  test("Tor, cloud, VPN and residential networks", async () => {
    const { deps, live } = await setup();
    expect(await checkIp(deps, live, TEST_IPS.tor)).toMatchObject({
      object: "risk_ip_check",
      ip: TEST_IPS.tor,
      tor: true,
      degraded: [],
    });
    expect(await checkIp(deps, live, TEST_IPS.aws)).toMatchObject({
      hosting: true,
      hosting_kind: "cloud",
      hosting_provider: "aws",
      asn: 16509,
      country: "US",
    });
    expect(await checkIp(deps, live, TEST_IPS.vpn)).toMatchObject({ hosting_kind: "vpn" });
    expect(await checkIp(deps, live, TEST_IPS.residential)).toMatchObject({
      tor: false,
      hosting: false,
      asn: 3320,
      country: "DE",
    });
    expect(await checkIp(deps, live, "10.0.0.1")).toMatchObject({ private: true });
  });

  test("reports missing IP data as degraded", async () => {
    const { deps, live } = await setup({
      ipIntelligence: {
        current: async () => {
          throw new Error("no datasets");
        },
      },
    });
    expect(await checkIp(deps, live, "2001:db8::1")).toMatchObject({
      version: 6,
      tor: false,
      asn: null,
      degraded: ["ip_data"],
    });
  });

  test("sandbox environments use the documentation addresses", async () => {
    const { deps, sandbox } = await setup();
    expect(await checkIp(deps, sandbox, "192.0.2.1")).toMatchObject({ tor: true });
    expect(await checkIp(deps, sandbox, "192.0.2.3")).toMatchObject({ hosting_kind: "vpn" });
  });
});

describe("content classification", () => {
  test("scores only, from the classifier in live environments", async () => {
    const classifier = fakeClassifier();
    const { deps, live } = await setup({ classifier });
    const result = await classifyContent(deps, live, "Win big [coss-test:fraud:0.73]");
    expect(result).toEqual({
      object: "risk_content_classification",
      scores: { spam: 0.01, phishing: 0.01, malware: 0.01, fraud: 0.73 },
      truncated: false,
    });
    expect(classifier.calls).toEqual([
      { kind: "text", text: "Win big [coss-test:fraud:0.73]", links: [] },
    ]);
  });

  test("passes links and marks long text as truncated", async () => {
    const classifier = fakeClassifier();
    const { deps, live } = await setup({ classifier });
    const text = `Visit https://cheap.example/deal?ref=me ${"x".repeat(9000)}`;
    expect((await classifyContent(deps, live, text)).truncated).toBe(true);
    const [call] = classifier.calls;
    expect(call?.kind === "text" && call.links).toEqual(["cheap.example/deal"]);
    expect(call?.kind === "text" && call.text.length).toBeLessThanOrEqual(8001);
  });

  test("fails without a classifier, on errors and on timeouts", async () => {
    for (const classifier of [
      null,
      fakeClassifier({ fail: true }),
      fakeClassifier({ delayMs: 200 }),
    ]) {
      const { deps, live } = await setup({ classifier, classifyTimeoutMs: 50 });
      await expect(classifyContent(deps, live, "hello")).rejects.toMatchObject({
        code: "classification_unavailable",
      });
    }
  });

  test("sandbox environments read the markers without a model", async () => {
    const { deps, sandbox } = await setup({ classifier: null });
    expect((await classifyContent(deps, sandbox, "[coss-test:phishing]")).scores).toEqual({
      spam: 0.01,
      phishing: 0.99,
      malware: 0.01,
      fraud: 0.01,
    });
  });
});

describe("content in assessments", () => {
  test("scores are signals; reasons only fire at the thresholds the customer set", async () => {
    const { assess, live } = await setup();
    const text = "Cheap followers [coss-test:spam:0.9] [coss-test:fraud:0.6]";
    const first = (await assess({ event: "signup", content: { text } })).assessment;
    expect(first.signals.content).toEqual({ spam: 0.9, phishing: 0.01, malware: 0.01, fraud: 0.6 });
    expect(codes(first)).toEqual([]);
    expect(first.decision).toBe("allow");

    await updateRiskSettings(
      live,
      UpdateRiskSettingsRequest.parse({ content_thresholds: { spam: 0.8, fraud: 0.7 } }),
      TEST_SECRETS_KEYS,
    );
    const second = (await assess({ event: "signup", content: { text } })).assessment;
    expect(second.reasons).toEqual([
      {
        code: "content.spam",
        message: "The content's spam score (0.9) reached your threshold (0.8).",
        value: 0.9,
        threshold: 0.8,
      },
    ]);
    expect(second.score).toBe(0.5);
    expect(second.decision).toBe("review");
  });

  test("rules can test content scores", async () => {
    const { assess, live } = await setup();
    await createRiskRule(
      live,
      CreateRiskRuleRequest.parse({
        name: "Block phishing bios",
        action: "block",
        conditions: [{ field: "content.phishing", operator: "gte", value: 0.5 }],
      }),
    );
    const blocked = (
      await assess({ event: "signup", content: { text: "Verify at [coss-test:phishing:0.55]" } })
    ).assessment;
    expect(blocked.decision).toBe("block");
    expect(codes(blocked)).toEqual(["rule.matched"]);
    // Without content the field has no value, so the rule doesn't match.
    expect((await assess({ event: "signup" })).assessment.decision).toBe("allow");
  });

  test("a failed classification or a spent budget leaves the content out", async () => {
    const failing = await setup({ classifier: fakeClassifier({ fail: true }) });
    const failed = (await failing.assess({ event: "message", content: { text: "hi" } })).assessment;
    expect(failed.signals.content).toBeNull();
    expect(failed.degraded).toEqual(["content"]);

    const charged: string[] = [];
    const spent = await setup({
      chargeClassification: async (organizationId) => {
        charged.push(organizationId);
        return false;
      },
    });
    const over = (await spent.assess({ event: "message", content: { text: "hi" } })).assessment;
    expect(over.degraded).toEqual(["content"]);
    expect(charged).toEqual([spent.organizationId]);
    // Sandbox classifications cost nothing.
    await spent.assess({ event: "message", content: { text: "hi" } }, { env: spent.sandbox });
    expect(charged).toHaveLength(1);
  });

  test("concurrent content retries charge and classify once", async () => {
    const classifier = fakeClassifier({ delayMs: 100 });
    let charges = 0;
    const { assess } = await setup({
      classifier,
      chargeClassification: async () => {
        charges++;
        return true;
      },
    });
    const params = { event: "message", content: { text: "[coss-test:spam]" } } as const;
    const results = await Promise.all(
      Array.from({ length: 15 }, () => assess(params, { idempotencyKey: "content-race" })),
    );
    expect(charges).toBe(1);
    expect(classifier.calls).toHaveLength(1);
    expect(new Set(results.map((r) => r.assessment.id)).size).toBe(1);
    expect(results.filter((r) => !r.replayed)).toHaveLength(1);
    await expect(
      assess({ ...params, content: { text: "different" } }, { idempotencyKey: "content-race" }),
    ).rejects.toMatchObject({ code: "idempotency_key_reused" });
    expect(charges).toBe(1);
  });

  test("a rolled-back assessment reuses its paid scores", async () => {
    const classifier = fakeClassifier();
    let charges = 0;
    const { assess, deps } = await setup({
      classifier,
      chargeClassification: async () => {
        charges++;
        return true;
      },
    });
    const hash = deps.hash;
    deps.hash = () => {
      throw new Error("collection failed");
    };
    const params = { event: "message", user: { id: "user" }, content: { text: "hello" } } as const;
    await expect(assess(params, { idempotencyKey: "rollback" })).rejects.toThrow(
      "collection failed",
    );
    deps.hash = hash;
    const retry = await assess(params, { idempotencyKey: "rollback" });
    expect(retry.replayed).toBe(false);
    expect(charges).toBe(1);
    expect(classifier.calls).toHaveLength(1);
  });

  test("abandoned preparation fails open without paying again, and expired keys can be reused", async () => {
    const classifier = fakeClassifier();
    let charges = 0;
    const { assess, live } = await setup({
      classifier,
      chargeClassification: async () => {
        charges++;
        return true;
      },
    });
    const params = { event: "message", content: { text: "hello" } } as const;
    await db.insert(schema.riskAssessmentPreparation).values({
      environmentId: live.environmentId,
      idempotencyKey: "abandoned",
      requestHash: requestHash(params),
      createdAt: new Date(Date.now() - 31_000),
    });
    const first = await assess(params, { idempotencyKey: "abandoned" });
    expect(first.assessment.degraded).toContain("content");
    expect(charges).toBe(0);
    expect(classifier.calls).toHaveLength(0);
    const expired = new Date(Date.now() - 25 * 60 * 60_000);
    await db
      .update(schema.riskAssessment)
      .set({ createdAt: expired })
      .where(eq(schema.riskAssessment.id, first.assessment.id));
    await db
      .update(schema.riskAssessmentPreparation)
      .set({ createdAt: expired })
      .where(eq(schema.riskAssessmentPreparation.environmentId, live.environmentId));
    const second = await assess(
      { ...params, content: { text: "new content" } },
      { idempotencyKey: "abandoned" },
    );
    expect(second.replayed).toBe(false);
    expect(second.assessment.id).not.toBe(first.assessment.id);
    expect(charges).toBe(1);
    expect(classifier.calls).toHaveLength(1);
  });

  test("a replay is answered without classifying again", async () => {
    const classifier = fakeClassifier();
    const { assess } = await setup({ classifier });
    const params = { event: "message", content: { text: "[coss-test:spam]" } } as const;
    const first = await assess(params, { idempotencyKey: "content-replay" });
    const second = await assess(params, { idempotencyKey: "content-replay" });
    expect(second.replayed).toBe(true);
    expect(second.assessment.id).toBe(first.assessment.id);
    expect(classifier.calls).toHaveLength(1);
  });

  test("content thresholds are settings; content reasons can't be disabled", async () => {
    const { live } = await setup();
    const updated = await updateRiskSettings(
      live,
      UpdateRiskSettingsRequest.parse({ content_thresholds: { phishing: 0.8, malware: 0.9 } }),
      TEST_SECRETS_KEYS,
    );
    expect(updated?.content_thresholds).toEqual({
      spam: null,
      phishing: 0.8,
      malware: 0.9,
      fraud: null,
    });
    await updateRiskSettings(
      live,
      UpdateRiskSettingsRequest.parse({ content_thresholds: { phishing: null, spam: 0.95 } }),
      TEST_SECRETS_KEYS,
    );
    expect((await getRiskSettings(live)).content_thresholds).toEqual({
      spam: 0.95,
      phishing: null,
      malware: 0.9,
      fraud: null,
    });
    expect(DISABLEABLE_REASON_CODES.some((code) => code.startsWith("content."))).toBe(false);
    expect(() => UpdateRiskSettingsRequest.parse({ content_thresholds: { spam: 0 } })).toThrow();
    expect(() =>
      UpdateRiskSettingsRequest.parse({ content_thresholds: { toxicity: 0.5 } }),
    ).toThrow();
  });
});

describe("rate limit buckets", () => {
  test("create, list, update and delete", async () => {
    const { live, sandbox } = await setup();
    const created = await createRiskLimitBucket(
      live,
      bucket({ name: "password_reset", limit: 5, period_seconds: 3600 }),
    );
    expect(created).toMatchObject({
      object: "risk_limit_bucket",
      name: "password_reset",
      limit: 5,
      period_seconds: 3600,
      burst: 5,
      on_failure: "allow",
    });
    if (!created) throw new Error("no bucket");
    await expect(
      createRiskLimitBucket(live, bucket({ name: "password_reset", limit: 1, period_seconds: 1 })),
    ).rejects.toMatchObject({ code: "limit_bucket_name_taken", param: "name" });
    // Names are per environment.
    await createRiskLimitBucket(
      sandbox,
      bucket({ name: "password_reset", limit: 1, period_seconds: 1 }),
    );

    const updated = await updateRiskLimitBucket(live, created.id, {
      burst: 10,
      on_failure: "deny",
    });
    expect(updated).toMatchObject({ limit: 5, burst: 10, on_failure: "deny" });
    expect((await listRiskLimitBuckets(live)).data.map((b) => b.id)).toEqual([created.id]);
    expect(await getRiskLimitBucket(sandbox, created.id)).toBeNull();
    expect(await deleteRiskLimitBucket(sandbox, created.id)).toBeNull();
    expect(await deleteRiskLimitBucket(live, created.id)).toMatchObject({ id: created.id });
    expect(await getRiskLimitBucket(live, created.id)).toBeNull();
  });

  test("names are slugs and numbers are bounded", () => {
    for (const input of [
      { name: "Password Reset", limit: 5, period_seconds: 60 },
      { name: "ok", limit: 0, period_seconds: 60 },
      { name: "ok", limit: 5, period_seconds: 86_401 },
    ]) {
      expect(() => bucket(input)).toThrow();
    }
  });
});

describe("checkRiskLimit", () => {
  test("allows a key up to the burst, then refills at the rate", async () => {
    let now = 1_000_000;
    const store = new MemoryStore({ now: () => now });
    const { deps, live } = await setup({ limits: store });
    await createRiskLimitBucket(live, bucket({ name: "login", limit: 2, period_seconds: 60 }));

    const first = await checkRiskLimit(deps, live, limit({ bucket: "login", key: "u_1" }));
    expect(first).toEqual({
      object: "risk_limit",
      bucket: "login",
      allowed: true,
      limit: 2,
      remaining: 1,
      reset_ms: 30_000,
      retry_after_ms: 0,
      degraded: false,
    });
    expect((await checkRiskLimit(deps, live, limit({ bucket: "login", key: "u_1" }))).allowed).toBe(
      true,
    );
    const denied = await checkRiskLimit(deps, live, limit({ bucket: "login", key: "u_1" }));
    expect(denied).toMatchObject({ allowed: false, remaining: 0, retry_after_ms: 30_000 });
    // Other keys have their own bucket.
    expect((await checkRiskLimit(deps, live, limit({ bucket: "login", key: "u_2" }))).allowed).toBe(
      true,
    );
    now += 30_000;
    expect((await checkRiskLimit(deps, live, limit({ bucket: "login", key: "u_1" }))).allowed).toBe(
      true,
    );
    // A cost above the bucket's size never fits.
    expect(
      await checkRiskLimit(deps, live, limit({ bucket: "login", key: "u_3", cost: 3 })),
    ).toMatchObject({ allowed: false, retry_after_ms: null });
  });

  test("a retry with the same idempotency key isn't charged twice", async () => {
    const store = new MemoryStore({ now: () => 1_000_000 });
    const { deps, live } = await setup({ limits: store });
    await createRiskLimitBucket(live, bucket({ name: "once", limit: 2, period_seconds: 60 }));
    const check = (idempotencyKey?: string) =>
      checkRiskLimit(deps, live, limit({ bucket: "once", key: "k" }), { idempotencyKey });
    expect((await check("attempt-1")).remaining).toBe(1);
    expect((await check("attempt-1")).remaining).toBe(1);
    expect((await check("attempt-2")).remaining).toBe(0);
    expect((await check()).allowed).toBe(false);
  });

  test("stores only hashes of keys, separated per environment", async () => {
    const consumed: string[] = [];
    const store: RateLimitStore = {
      consume: async (specs, options) => {
        consumed.push(...specs.map((spec) => spec.key));
        return new MemoryStore().consume(specs, options);
      },
      close: async () => {},
    };
    const { deps, live, sandbox } = await setup({ limits: store });
    await createRiskLimitBucket(live, bucket({ name: "signup", limit: 5, period_seconds: 60 }));
    await createRiskLimitBucket(sandbox, bucket({ name: "signup", limit: 5, period_seconds: 60 }));
    await checkRiskLimit(deps, live, limit({ bucket: "signup", key: "ada@example.com" }));
    await checkRiskLimit(deps, sandbox, limit({ bucket: "signup", key: "ada@example.com" }));
    expect(consumed).toHaveLength(2);
    expect(consumed[0]).not.toBe(consumed[1]);
    for (const key of consumed) {
      expect(key).not.toContain("ada");
      expect(key).toMatch(new RegExp(`^${deps.keyPrefix}:risk:l:\\{rsklb_[a-z0-9]+:[\\w-]+\\}$`));
    }
  });

  test("unknown buckets are not found; a store failure answers with on_failure", async () => {
    const broken: RateLimitStore = {
      consume: async () => {
        throw new Error("Valkey down");
      },
      close: async () => {},
    };
    const { deps, live } = await setup({ limits: broken });
    await expect(
      checkRiskLimit(deps, live, limit({ bucket: "missing", key: "k" })),
    ).rejects.toMatchObject({ code: "not_found", param: "bucket" });
    await createRiskLimitBucket(live, bucket({ name: "open", limit: 5, period_seconds: 60 }));
    await createRiskLimitBucket(
      live,
      bucket({ name: "closed", limit: 5, period_seconds: 60, on_failure: "deny" }),
    );
    expect(await checkRiskLimit(deps, live, limit({ bucket: "open", key: "k" }))).toMatchObject({
      allowed: true,
      degraded: true,
    });
    expect(await checkRiskLimit(deps, live, limit({ bucket: "closed", key: "k" }))).toMatchObject({
      allowed: false,
      degraded: true,
      retry_after_ms: null,
    });
  });
});

describe("checkRiskLimit in Valkey", async () => {
  const valkey = await testValkeyStore();
  afterAll(() => valkey.close());

  test("concurrent checks never let more through than the bucket holds", async () => {
    const { deps, live } = await setup({ limits: valkey, keyPrefix: testPrefix() });
    // 3 per second: a fractional interval (333.3 ms per token).
    await createRiskLimitBucket(live, bucket({ name: "api", limit: 3, period_seconds: 1 }));
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        checkRiskLimit(deps, live, limit({ bucket: "api", key: "k" })),
      ),
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(3);
    expect(results.every((result) => !result.degraded)).toBe(true);
    const denied = results.find((result) => !result.allowed);
    expect(denied?.retry_after_ms).toBeGreaterThan(0);
    expect(denied?.retry_after_ms).toBeLessThanOrEqual(334);
  });
});
