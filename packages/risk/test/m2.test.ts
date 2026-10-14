import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createWebhookEndpoint } from "@coss/webhooks";
import { TEST_SECRETS_KEYS, testManagementDeps } from "@coss/webhooks/testing";
import { eq } from "drizzle-orm";
import { forgetRiskUser, recordRiskFeedback } from "../src/feedback.ts";
import { addRiskListEntry } from "../src/lists.ts";
import { createRiskRule, deleteRiskRule, listRiskRules, updateRiskRule } from "../src/rules.ts";
import {
  CreateRiskRuleRequest,
  MAX_RISK_RULES,
  UpdateRiskSettingsRequest,
} from "../src/schemas.ts";
import { getRiskSettings, updateRiskSettings } from "../src/settings.ts";
import { fakeCaptcha, fakeDomainAges, TEST_IPS } from "../src/testing.ts";
import { setup } from "./helpers.ts";

const codes = (assessment: { reasons: { code: string }[] }) =>
  assessment.reasons.map((reason) => reason.code);

const rule = (input: unknown) => CreateRiskRuleRequest.parse(input);
const settings = (input: unknown) => UpdateRiskSettingsRequest.parse(input);

describe("settings", () => {
  test("defaults, thresholds and disabled reasons apply to decisions", async () => {
    const { assess, live } = await setup();
    expect(await getRiskSettings(live)).toEqual({
      object: "risk_settings",
      review_threshold: 0.5,
      block_threshold: 0.85,
      disabled_reasons: [],
      captcha: null,
      content_thresholds: { spam: null, phishing: null, malware: null, fraud: null },
      updated_at: null,
    });
    // Disposable (0.7) is a review by default…
    const before = (await assess({ event: "signup", user: { email: "a@mailinator.com" } }))
      .assessment;
    expect(before.decision).toBe("review");

    const updated = await updateRiskSettings(
      live,
      settings({ block_threshold: 0.7, disabled_reasons: ["email.role_account"] }),
      TEST_SECRETS_KEYS,
    );
    expect(updated).toMatchObject({
      review_threshold: 0.5,
      block_threshold: 0.7,
      disabled_reasons: ["email.role_account"],
    });
    // …and a block with the lower threshold; the disabled reason never fires.
    const after = (await assess({ event: "signup", user: { email: "info@mailinator.com" } }))
      .assessment;
    expect(after.decision).toBe("block");
    expect(codes(after)).toEqual(["email.disposable"]);
    expect(after.score).toBe(0.7);
    expect(after.signals.email?.role_account).toBe(true);
  });

  test("persisted threshold boundaries agree with settings and partial updates", async () => {
    const { assess, live } = await setup({ verifyCaptcha: fakeCaptcha({ bad: false }) });
    await updateRiskSettings(
      live,
      settings({
        review_threshold: 0.6,
        block_threshold: 0.6,
        captcha: { provider: "turnstile", secret: "secret" },
      }),
      TEST_SECRETS_KEYS,
    );
    // A partial update must accept equality with the persisted float32 review threshold.
    expect(
      (await updateRiskSettings(live, settings({ block_threshold: 0.6 }), TEST_SECRETS_KEYS))
        ?.block_threshold,
    ).toBe(0.6);
    const result = (await assess({ event: "signup", captcha: { token: "bad" } })).assessment;
    expect(result.score).toBe(0.6);
    expect(result.decision).toBe("block");
    await updateRiskSettings(live, settings({ block_threshold: 0.85 }), TEST_SECRETS_KEYS);
    expect((await assess({ event: "signup", captcha: { token: "bad" } })).assessment.decision).toBe(
      "review",
    );
  });

  test("thresholds stay ordered; decision reasons can't be disabled", async () => {
    const { live } = await setup();
    await expect(
      updateRiskSettings(live, settings({ review_threshold: 0.9 }), TEST_SECRETS_KEYS),
    ).rejects.toMatchObject({ code: "invalid_settings", param: "review_threshold" });
    expect(
      UpdateRiskSettingsRequest.safeParse({ disabled_reasons: ["list.blocked"] }).success,
    ).toBe(false);
    expect(UpdateRiskSettingsRequest.safeParse({ block_threshold: 0 }).success).toBe(false);
  });

  test("a captcha provider needs its secret, which is stored encrypted and never returned", async () => {
    const { live } = await setup();
    await expect(
      updateRiskSettings(live, settings({ captcha: { provider: "turnstile" } }), TEST_SECRETS_KEYS),
    ).rejects.toMatchObject({ code: "invalid_settings", param: "captcha.secret" });
    const saved = await updateRiskSettings(
      live,
      settings({ captcha: { provider: "turnstile", secret: "0xsecret", required: true } }),
      TEST_SECRETS_KEYS,
    );
    expect(saved?.captcha).toEqual({ provider: "turnstile", required: true });
    expect(JSON.stringify(saved)).not.toContain("0xsecret");
    const [row] = await db
      .select()
      .from(schema.riskSettings)
      .where(eq(schema.riskSettings.environmentId, live.environmentId));
    expect(row?.captchaSecretCiphertext).toStartWith("v2:");
    // Changing only `required` keeps the secret; null removes it.
    expect(
      (
        await updateRiskSettings(
          live,
          settings({ captcha: { provider: "turnstile", required: false } }),
          TEST_SECRETS_KEYS,
        )
      )?.captcha,
    ).toEqual({ provider: "turnstile", required: false });
    expect(
      (await updateRiskSettings(live, settings({ captcha: null }), TEST_SECRETS_KEYS))?.captcha,
    ).toBeNull();
  });
});

describe("rules", () => {
  test("validation: operators and values must fit the field", () => {
    expect(
      CreateRiskRuleRequest.safeParse({
        name: "x",
        conditions: [{ field: "email.disposable", operator: "gt", value: 1 }],
        action: "block",
      }).success,
    ).toBe(false);
    expect(
      CreateRiskRuleRequest.safeParse({
        name: "x",
        conditions: [{ field: "ip.country", operator: "in", value: "DE" }],
        action: "block",
      }).success,
    ).toBe(false);
    expect(
      CreateRiskRuleRequest.safeParse({ name: "x", conditions: [], action: "block" }).success,
    ).toBe(false);
  });

  test("the first matching rule decides, in position order, after the lists", async () => {
    const { assess, live } = await setup();
    const block = await createRiskRule(
      live,
      rule({
        name: "Disposable from a data center",
        events: ["signup"],
        conditions: [
          { field: "email.disposable", operator: "is", value: true },
          { field: "ip.hosting", operator: "is", value: true },
        ],
        action: "block",
      }),
    );
    // A disposable address from a cloud server: 0.775 by score (review), blocked by the rule.
    const blocked = (
      await assess({ event: "signup", user: { email: "a@mailinator.com" }, ip: TEST_IPS.aws })
    ).assessment;
    expect(blocked.decision).toBe("block");
    expect(blocked.reasons[0]).toEqual({
      code: "rule.matched",
      rule: block?.id,
      name: "Disposable from a data center",
      message: 'Your rule "Disposable from a data center" matched.',
    });
    // The rule is for sign-ups only.
    const login = (
      await assess({
        event: "login",
        user: { id: "u1", email: "a@mailinator.com" },
        ip: TEST_IPS.aws,
      })
    ).assessment;
    expect(login.decision).toBe("review");

    // An allow rule placed before it wins for German users.
    await createRiskRule(
      live,
      rule({
        name: "Trust Germany",
        position: 0,
        match: "any",
        conditions: [
          { field: "ip.country", operator: "in", value: ["de", "AT"] },
          { field: "email.domain", operator: "eq", value: "acme.io" },
        ],
        action: "allow",
      }),
    );
    await updateRiskRule(live, block?.id as string, { position: 5 });
    const german = (
      await assess({ event: "signup", user: { email: "a@mailinator.com" }, ip: TEST_IPS.hosting })
    ).assessment;
    expect(german.decision).toBe("allow");
    expect(codes(german)[0]).toBe("rule.matched");

    // A block-list entry beats every rule.
    await addRiskListEntry(live, { list: "block", type: "country", value: "DE" });
    const listed = (
      await assess({ event: "signup", user: { email: "a@mailinator.com" }, ip: TEST_IPS.hosting })
    ).assessment;
    expect(listed.decision).toBe("block");
    expect(codes(listed)).not.toContain("rule.matched");
  });

  test("missing values never match; disabled reasons stay visible to rules; disabled rules skip", async () => {
    const { assess, live } = await setup();
    await updateRiskSettings(live, settings({ disabled_reasons: ["ip.tor"] }), TEST_SECRETS_KEYS);
    const tor = await createRiskRule(
      live,
      rule({
        name: "Review Tor outside the US",
        conditions: [
          { field: "ip.tor", operator: "is", value: true },
          { field: "ip.country", operator: "neq", value: "US" },
        ],
        action: "review",
      }),
    );
    // No IP: neither condition has a value.
    expect((await assess({ event: "login", user: { id: "u1" } })).assessment.decision).toBe(
      "allow",
    );
    const viaTor = (await assess({ event: "login", user: { id: "u1" }, ip: TEST_IPS.tor }))
      .assessment;
    expect(viaTor.decision).toBe("review");
    expect(codes(viaTor)).toEqual(["rule.matched"]);
    await updateRiskRule(live, tor?.id as string, { enabled: false });
    expect(
      (await assess({ event: "login", user: { id: "u2" }, ip: TEST_IPS.tor })).assessment.decision,
    ).toBe("allow");
  });

  test("an absent velocity dimension cannot match an allow rule", async () => {
    const { assess, live } = await setup();
    await createRiskRule(
      live,
      rule({
        name: "Low IP velocity",
        conditions: [{ field: "velocity.ip_1h", operator: "lt", value: 5 }],
        action: "allow",
      }),
    );
    const missing = (await assess({ event: "signup", user: { email: "a@mailinator.com" } }))
      .assessment;
    expect(missing.signals.velocity).not.toBeNull();
    expect(missing.decision).toBe("review");
    expect(codes(missing)).not.toContain("rule.matched");
    const present = (
      await assess({
        event: "signup",
        user: { email: "b@mailinator.com" },
        ip: TEST_IPS.residential,
      })
    ).assessment;
    expect(present.decision).toBe("allow");
    expect(codes(present)).toContain("rule.matched");
  });

  test("score and velocity conditions; CRUD; the per-environment limit", async () => {
    const { assess, live, sandbox } = await setup();
    const fast = await createRiskRule(
      live,
      rule({
        name: "Fast logins",
        events: ["login"],
        conditions: [{ field: "velocity.user_1h", operator: "gte", value: 3 }],
        action: "block",
      }),
    );
    const decisions = [];
    for (let i = 0; i < 3; i++) {
      decisions.push((await assess({ event: "login", user: { id: "u1" } })).assessment.decision);
    }
    expect(decisions).toEqual(["allow", "allow", "block"]);

    expect((await listRiskRules(live)).data.map((r) => r.id)).toEqual([fast?.id as string]);
    expect((await listRiskRules(sandbox)).data).toEqual([]);
    expect(await updateRiskRule(sandbox, fast?.id as string, { enabled: false })).toBeNull();
    expect((await deleteRiskRule(live, fast?.id as string))?.id).toBe(fast?.id);

    const template = rule({
      name: "Score",
      conditions: [{ field: "score", operator: "gt", value: 0.99 }],
      action: "review",
    });
    for (let i = 0; i < MAX_RISK_RULES; i++) await createRiskRule(live, template);
    await expect(createRiskRule(live, template)).rejects.toMatchObject({ code: "too_many_rules" });
  });
});

describe("captcha", () => {
  test("verifies tokens with the environment's provider and secret", async () => {
    const verify = fakeCaptcha({ good: true, bad: false });
    const { assess, live } = await setup({ verifyCaptcha: verify });
    // Without a provider a token can't be checked: no reason.
    const unchecked = (await assess({ event: "signup", captcha: { token: "good" } })).assessment;
    expect(unchecked.signals.captcha).toEqual({ provided: true, passed: null });
    expect(verify.calls).toEqual([]);

    await updateRiskSettings(
      live,
      settings({ captcha: { provider: "hcaptcha", secret: "hsecret", required: true } }),
      TEST_SECRETS_KEYS,
    );
    const passed = (
      await assess({ event: "signup", captcha: { token: "good" }, ip: TEST_IPS.residential })
    ).assessment;
    expect(passed.signals.captcha).toEqual({ provided: true, passed: true });
    expect(codes(passed)).toEqual([]);
    expect(verify.calls.at(-1)).toEqual({ token: "good", secret: "hsecret" });

    const failed = (await assess({ event: "signup", captcha: { token: "bad" } })).assessment;
    expect(codes(failed)).toEqual(["captcha.failed"]);
    expect(failed.decision).toBe("review");

    const missing = (await assess({ event: "signup" })).assessment;
    expect(codes(missing)).toEqual(["captcha.missing"]);
    expect(missing.signals.captcha).toEqual({ provided: false, passed: null });

    // The provider is down: no verdict, reported as degraded.
    const down = (await assess({ event: "signup", captcha: { token: "other" } })).assessment;
    expect(down.signals.captcha).toEqual({ provided: true, passed: null });
    expect(down.degraded).toContain("captcha");
    expect(codes(down)).toEqual([]);
  });

  test("sandbox test tokens need no provider", async () => {
    const { assess, sandbox } = await setup();
    const fail = (
      await assess({ event: "signup", captcha: { token: "test-fail" } }, { env: sandbox })
    ).assessment;
    expect(codes(fail)).toEqual(["captcha.failed"]);
    const pass = (
      await assess({ event: "signup", captcha: { token: "test-pass" } }, { env: sandbox })
    ).assessment;
    expect(pass.signals.captcha).toEqual({ provided: true, passed: true });
  });
});

describe("domain age", () => {
  test("new domains fire email.domain_new; answers are cached; free providers skip the lookup", async () => {
    const domain = `fresh-${crypto.randomUUID().slice(0, 8)}.example`;
    const ages = fakeDomainAges({ [domain]: 3 });
    const { assess } = await setup({ domainAge: ages });
    const first = (await assess({ event: "signup", user: { email: `a@${domain}` } })).assessment;
    expect(first.signals.email?.domain_age_days).toBe(3);
    expect(codes(first)).toEqual(["email.domain_new"]);
    await assess({ event: "signup", user: { email: `b@${domain}` } });
    expect(ages.calls.filter((call) => call === domain)).toHaveLength(1);
    const gmail = (await assess({ event: "signup", user: { email: "a@gmail.com" } })).assessment;
    expect(gmail.signals.email?.domain_age_days).toBeNull();
    expect(ages.calls).not.toContain("gmail.com");
  });

  test("a slow registry degrades the assessment and fills the cache for the next one", async () => {
    const domain = `slow-${crypto.randomUUID().slice(0, 8)}.example`;
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { assess } = await setup({
      domainAgeTimeoutMs: 20,
      domainAge: async () => {
        await gate;
        return { status: "found", registeredAt: new Date(Date.now() - 400 * 86_400_000) };
      },
    });
    const slow = (await assess({ event: "signup", user: { email: `a@${domain}` } })).assessment;
    expect(slow.degraded).toEqual(["domain_age"]);
    expect(slow.signals.email?.domain_age_days).toBeNull();
    release();
    await Bun.sleep(50);
    const later = (await assess({ event: "signup", user: { email: `b@${domain}` } })).assessment;
    expect(later.degraded).toEqual([]);
    expect(later.signals.email?.domain_age_days).toBe(400);
  });

  test("sandbox: new.test is 2 days old", async () => {
    const { assess, sandbox } = await setup();
    const { assessment } = await assess(
      { event: "signup", user: { email: "a@new.test" } },
      { env: sandbox },
    );
    expect(codes(assessment)).toEqual(["email.domain_new"]);
  });
});

describe("login memory", () => {
  test("flags a new country or network for users with history; forgetting clears it", async () => {
    const { assess, live, deps } = await setup();
    const first = (await assess({ event: "signup", user: { id: "u1" }, ip: TEST_IPS.residential }))
      .assessment;
    expect(first.signals.login).toBeNull();
    const usual = (await assess({ event: "login", user: { id: "u1" }, ip: TEST_IPS.neighbour }))
      .assessment;
    expect(usual.signals.login).toEqual({ new_country: false, new_network: false });
    const away = (await assess({ event: "login", user: { id: "u1" }, ip: TEST_IPS.aws }))
      .assessment;
    expect(away.signals.login).toEqual({ new_country: true, new_network: true });
    expect(codes(away)).toEqual(["login.new_country", "ip.hosting_provider", "login.new_network"]);
    // Remembered now (the login wasn't blocked).
    const again = (await assess({ event: "login", user: { id: "u1" }, ip: TEST_IPS.aws }))
      .assessment;
    expect(again.signals.login).toEqual({ new_country: false, new_network: false });

    await forgetRiskUser(deps.hash, live, "u1");
    const forgotten = (await assess({ event: "login", user: { id: "u1" }, ip: TEST_IPS.vpn }))
      .assessment;
    expect(forgotten.signals.login).toBeNull();
  });

  test("blocked logins are not remembered", async () => {
    const { assess, live } = await setup();
    await assess({ event: "login", user: { id: "u1" }, ip: TEST_IPS.residential });
    await addRiskListEntry(live, { list: "block", type: "ip", value: TEST_IPS.vpn });
    await assess({ event: "login", user: { id: "u1" }, ip: TEST_IPS.vpn });
    const next = (await assess({ event: "login", user: { id: "u1" }, ip: TEST_IPS.vpn }))
      .assessment;
    expect(next.signals.login).toEqual({ new_country: true, new_network: true });
  });
});

describe("review resolution", () => {
  test("resolving a review fires risk.assessment.reviewed with the outcome", async () => {
    const { assess, live, deps, organizationId } = await setup();
    const { endpoint } = await createWebhookEndpoint(
      {
        organizationId,
        environmentId: live.environmentId,
        url: "https://hooks.example.com/risk",
        eventTypes: ["risk.assessment.reviewed"],
        apiVersion: "2026-10-10",
        userId: null,
      },
      testManagementDeps,
    );
    const { assessment } = await assess({
      event: "signup",
      user: { id: "u1", email: "x@mailinator.com" },
    });
    await recordRiskFeedback(
      deps.hash,
      live,
      assessment.id,
      { outcome: "fraud" },
      {
        source: "dashboard",
        actorId: "user_1",
      },
    );
    // A second outcome on a resolved assessment is not a new resolution.
    await recordRiskFeedback(
      deps.hash,
      live,
      assessment.id,
      { outcome: "legitimate" },
      {
        source: "dashboard",
        actorId: "user_1",
      },
    );
    const messages = await db
      .select({ payload: schema.webhookMessage.payload })
      .from(schema.webhookDelivery)
      .innerJoin(
        schema.webhookMessage,
        eq(schema.webhookMessage.id, schema.webhookDelivery.messageId),
      )
      .where(eq(schema.webhookDelivery.endpointId, endpoint.id));
    expect(messages).toHaveLength(1);
    expect(messages[0]?.payload).toMatchObject({
      type: "risk.assessment.reviewed",
      data: { assessment_id: assessment.id, decision: "review", outcome: "fraud", user_id: "u1" },
    });
  });
});
