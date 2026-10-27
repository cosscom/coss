import { beforeAll, describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { and, eq } from "drizzle-orm";
import {
  authenticateSignSession,
  consentToSign,
  createSignService,
  FakeDocumentStore,
  getSignRequest,
  LocalSealer,
  listSignRequestEvents,
  openSigning,
  requestSignReminders,
  runDueSignCompletions,
  runDueSignNotifications,
  type SignEmail,
  type SignEnvironment,
  SignError,
  type SignMailer,
  signAsSigner,
  updateSignSettings,
} from "../src/index.ts";
import type { CreateSignRequestRequestOutput } from "../src/schemas.ts";
import { buildTestPdfBase64, TEST_SIGNATURE_PNG } from "../src/testing.ts";

const store = new FakeDocumentStore();
const service = createSignService({ store });
const DAY = 86_400_000;

let tenant: TestTenant;
let live: SignEnvironment;
let sandbox: SignEnvironment;

beforeAll(async () => {
  tenant = await createTestTenant();
  live = {
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    environmentId: tenant.production.id,
    mode: "live",
  };
  sandbox = { ...live, environmentId: tenant.development.id, mode: "sandbox" };
});

function recordingMailer(): SignMailer & { sent: SignEmail[] } {
  const sent: SignEmail[] = [];
  return {
    sent,
    async send(email) {
      sent.push(email);
      return { replayed: false };
    },
  };
}

const scope = () => ({ organizationIds: [tenant.organization.id] });

function deps(mailer: SignMailer) {
  return { mailer, signUrl: "https://sign.test", store };
}

async function run(mailer: SignMailer, now = new Date()) {
  return runDueSignNotifications({ limit: 50, now, scope: scope() }, deps(mailer));
}

const emailSigner = (name: string, email: string, order?: number) => ({
  name,
  email,
  ...(order ? { order } : {}),
  fields: [{ type: "signature" as const, page: 1, x: 72, y: 600, width: 160, height: 30 }],
});

async function create(env: SignEnvironment, params: Partial<CreateSignRequestRequestOutput>) {
  const { request } = await service.create({
    environment: env,
    apiKeyId: null,
    actor: { kind: "api_key" },
    params: {
      title: "Services agreement",
      message: "Please sign by Friday.",
      documents: [{ filename: "msa.pdf", content: await buildTestPdfBase64() }],
      signers: [emailSigner("Ada Lovelace", "ada@example.com")],
      ...params,
    },
  });
  return request;
}

/** Signs as the signer an email went to, through the link in it. */
async function signFromEmail(email: SignEmail) {
  const url = new URL(/https:\/\/sign\.test\/s\/\S+/.exec(email.text)?.[0] ?? "");
  const id = url.pathname.split("/").at(-1) ?? "";
  const access = await authenticateSignSession({ id, token: url.hash.slice(1) });
  if (!access) throw new Error("the emailed link doesn't work");
  const actor = { kind: "signer" as const };
  const view = await openSigning(access, { actor });
  await consentToSign(access, { disclosureSha256: view.disclosure.sha256, actor });
  await signAsSigner(access, { values: {}, signature: TEST_SIGNATURE_PNG, actor, store });
}

describe("invitations", () => {
  test("every email signer gets a working link once; the requester's message only from their own address", async () => {
    const request = await create(live, {
      signers: [
        emailSigner("Ada Lovelace", "ada@example.com"),
        emailSigner("Grace Hopper", "grace@example.com"),
      ],
    });
    const mailer = recordingMailer();
    await run(mailer);
    const invitations = mailer.sent.filter((email) =>
      email.idempotencyKey.startsWith("sign-invite:"),
    );
    expect(invitations.map((email) => email.to).sort()).toEqual([
      "ada@example.com",
      "grace@example.com",
    ]);
    const [first] = invitations;
    expect(first).toMatchObject({
      from: null,
      requester: tenant.organization.name,
      environment: { environmentId: live.environmentId, mode: "live" },
      subject: `${tenant.organization.name} sent you "Services agreement" to sign`,
    });
    // coss.com's sender never carries the requester's own words.
    expect(first?.text).not.toContain("Please sign by Friday.");
    expect(first?.html).toContain("Review and sign");

    // Nothing again on the next pass.
    await run(mailer);
    expect(
      mailer.sent.filter((email) => email.idempotencyKey.startsWith("sign-invite:")),
    ).toHaveLength(2);

    const read = await getSignRequest({ ...live, requestId: request.id });
    expect(read.signers.map((signer) => signer.status)).toEqual(["notified", "notified"]);
    const events = await listSignRequestEvents({ ...live, requestId: request.id });
    expect(events.filter((event) => event.type === "notified")).toHaveLength(2);

    if (first) await signFromEmail(first);
  });

  test("with the environment's own sender, the message is included", async () => {
    const own = await createTestTenant();
    const env: SignEnvironment = {
      organizationId: own.organization.id,
      projectId: own.project.id,
      environmentId: own.development.id,
      mode: "sandbox",
    };
    await updateSignSettings({
      ...env,
      update: { email_from: "contracts@acme.test", display_name: "Acme" },
    });
    await create(env, {});
    const mailer = recordingMailer();
    await runDueSignNotifications(
      { limit: 50, scope: { organizationIds: [own.organization.id] } },
      deps(mailer),
    );
    expect(mailer.sent[0]).toMatchObject({ from: "contracts@acme.test", requester: "Acme" });
    expect(mailer.sent[0]?.text).toContain("Please sign by Friday.");
  });

  test("sequential order: the next signer is invited once the one before signs", async () => {
    await create(sandbox, {
      signing_order: "sequential",
      signers: [
        emailSigner("Ada Lovelace", "ada@example.com", 1),
        emailSigner("Grace Hopper", "grace@example.com", 2),
      ],
    });
    const mailer = recordingMailer();
    await run(mailer);
    const firstRound = mailer.sent.filter((email) =>
      email.idempotencyKey.startsWith("sign-invite:"),
    );
    expect(firstRound.map((email) => email.to)).toContain("ada@example.com");
    expect(firstRound.map((email) => email.to)).not.toContain("grace@example.com");
    const ada = firstRound.find((email) => email.to === "ada@example.com");
    if (ada) await signFromEmail(ada);
    await run(mailer);
    expect(mailer.sent.some((email) => email.to === "grace@example.com")).toBe(true);
  });

  test("a failed send is retried with the same key", async () => {
    const own = await createTestTenant();
    const env: SignEnvironment = {
      organizationId: own.organization.id,
      projectId: own.project.id,
      environmentId: own.development.id,
      mode: "sandbox",
    };
    await create(env, {});
    let fail = true;
    const keys: string[] = [];
    const flaky: SignMailer = {
      async send(email) {
        keys.push(email.idempotencyKey);
        if (fail) throw new Error("SES is down");
        return { replayed: false };
      },
    };
    const opts = { limit: 50, scope: { organizationIds: [own.organization.id] } };
    await runDueSignNotifications(opts, deps(flaky));
    fail = false;
    // After its backoff.
    const later = { ...opts, now: new Date(Date.now() + 2 * 60_000) };
    await runDueSignNotifications(later, deps(flaky));
    await runDueSignNotifications(later, deps(flaky));
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  test("subjects carry no invisible formatting characters; deleting organizations get no email", async () => {
    const own = await createTestTenant();
    const env: SignEnvironment = {
      organizationId: own.organization.id,
      projectId: own.project.id,
      environmentId: own.development.id,
      mode: "sandbox",
    };
    const opts = { limit: 50, scope: { organizationIds: [own.organization.id] } };
    await create(env, { title: "Onboarding \u{1F469}\u200D\u{1F4BB} pack" });
    const mailer = recordingMailer();
    await runDueSignNotifications(opts, deps(mailer));
    expect(mailer.sent[0]?.subject).toContain("Onboarding \u{1F469}\u{1F4BB} pack");
    expect(mailer.sent[0]?.subject).not.toMatch(/[\p{Cc}\p{Cf}]/u);

    const deleting = await createTestTenant();
    await create(
      {
        ...env,
        organizationId: deleting.organization.id,
        projectId: deleting.project.id,
        environmentId: deleting.development.id,
      },
      {},
    );
    await db.insert(schema.organizationDeletion).values({
      organizationId: deleting.organization.id,
      organizationName: deleting.organization.name,
      organizationSlug: deleting.organization.slug,
      requestedByEmail: "owner@example.com",
      nextAttemptAt: null,
    });
    const quiet = recordingMailer();
    await runDueSignNotifications(
      { limit: 50, scope: { organizationIds: [deleting.organization.id] } },
      deps(quiet),
    );
    expect(quiet.sent).toEqual([]);

    // Nor an organization its reputation has suspended.
    const suspended = await createTestTenant();
    await create(
      {
        ...env,
        organizationId: suspended.organization.id,
        projectId: suspended.project.id,
        environmentId: suspended.development.id,
      },
      {},
    );
    await db.insert(schema.reputationStanding).values({
      organizationId: suspended.organization.id,
      status: "suspended",
      reason: "complaint_rate",
      statusChangedAt: new Date(),
    });
    await runDueSignNotifications(
      { limit: 50, scope: { organizationIds: [suspended.organization.id] } },
      deps(quiet),
    );
    expect(quiet.sent).toEqual([]);
  });

  test("a replayed invitation records no session: the signer has the earlier email's link", async () => {
    const own = await createTestTenant();
    const env: SignEnvironment = {
      organizationId: own.organization.id,
      projectId: own.project.id,
      environmentId: own.development.id,
      mode: "sandbox",
    };
    const request = await create(env, {});
    const replaying: SignMailer = { send: async () => ({ replayed: true }) };
    await runDueSignNotifications(
      { limit: 50, scope: { organizationIds: [own.organization.id] } },
      deps(replaying),
    );
    const events = await db
      .select()
      .from(schema.signEvent)
      .where(eq(schema.signEvent.requestId, request.id));
    const notified = events.find((event) => event.type === "notified");
    expect(notified?.details).toEqual({});
    const sessions = await db
      .select()
      .from(schema.signSession)
      .where(eq(schema.signSession.requestId, request.id));
    expect(sessions).toEqual([]);
  });

  test("a signer who opened the invitation before it was recorded gets the bookkeeping only", async () => {
    const own = await createTestTenant();
    const env: SignEnvironment = {
      organizationId: own.organization.id,
      projectId: own.project.id,
      environmentId: own.development.id,
      mode: "sandbox",
    };
    const request = await create(env, { reminder_interval_days: 2 });
    const signerId = request.signers[0]?.id ?? "";
    // The worker sent the email and stopped; the signer then opened its link.
    await db
      .update(schema.signSigner)
      .set({ status: "viewed" })
      .where(eq(schema.signSigner.id, signerId));
    const mailer = recordingMailer();
    await runDueSignNotifications(
      { limit: 50, scope: { organizationIds: [own.organization.id] } },
      deps(mailer),
    );
    expect(mailer.sent).toEqual([]);
    const [signer] = await db
      .select()
      .from(schema.signSigner)
      .where(eq(schema.signSigner.id, signerId));
    expect(signer?.status).toBe("viewed");
    expect(signer?.notifiedAt).not.toBeNull();
    expect(signer?.nextReminderAt).not.toBeNull();
  });
});

describe("reminders and expiry", () => {
  test("automatic reminders every interval, at most three; asked-for ones too", async () => {
    const own = await createTestTenant();
    const env: SignEnvironment = {
      organizationId: own.organization.id,
      projectId: own.project.id,
      environmentId: own.development.id,
      mode: "sandbox",
    };
    const request = await create(env, { reminder_interval_days: 2 });
    expect(request.reminder_interval_days).toBe(2);
    const mailer = recordingMailer();
    const opts = (now: Date) => ({
      limit: 50,
      now,
      scope: { organizationIds: [own.organization.id] },
    });
    const start = new Date();
    await runDueSignNotifications(opts(start), deps(mailer));
    // Asked for at once: too soon after the invitation.
    await expect(
      requestSignReminders({ ...env, requestId: request.id, now: start }),
    ).rejects.toThrow(SignError);
    for (let day = 1; day <= 10; day++) {
      await runDueSignNotifications(opts(new Date(start.getTime() + day * DAY)), deps(mailer));
    }
    const reminders = mailer.sent.filter((email) =>
      email.idempotencyKey.startsWith("sign-remind:"),
    );
    expect(reminders.map((email) => email.idempotencyKey)).toEqual([
      expect.stringMatching(/:1$/),
      expect.stringMatching(/:2$/),
      expect.stringMatching(/:3$/),
    ]);
    expect(reminders[0]?.subject).toBe(
      'Reminder: "Services agreement" is waiting for your signature',
    );

    // Past the automatic ones, the requester can still ask.
    const later = new Date(start.getTime() + 11 * DAY);
    expect(await requestSignReminders({ ...env, requestId: request.id, now: later })).toBe(1);
    await runDueSignNotifications(opts(later), deps(mailer));
    expect(
      mailer.sent.filter((email) => email.idempotencyKey.startsWith("sign-remind:")),
    ).toHaveLength(4);
    const events = await listSignRequestEvents({ ...env, requestId: request.id });
    expect(events.filter((event) => event.type === "reminded")).toHaveLength(4);
  });

  test("asked-for reminders don't use up the automatic ones", async () => {
    const own = await createTestTenant();
    const env: SignEnvironment = {
      organizationId: own.organization.id,
      projectId: own.project.id,
      environmentId: own.development.id,
      mode: "sandbox",
    };
    const request = await create(env, { reminder_interval_days: 10 });
    const mailer = recordingMailer();
    const opts = (now: Date) => ({
      limit: 50,
      now,
      scope: { organizationIds: [own.organization.id] },
    });
    const start = new Date();
    await runDueSignNotifications(opts(start), deps(mailer));
    // Three asked for, a few hours apart, before any automatic one is due.
    for (let hour = 2; hour <= 6; hour += 2) {
      const at = new Date(start.getTime() + hour * 3_600_000);
      expect(await requestSignReminders({ ...env, requestId: request.id, now: at })).toBe(1);
      await runDueSignNotifications(opts(at), deps(mailer));
    }
    // Then the automatic ones still come, three of them.
    for (let day = 1; day <= 40; day++) {
      await runDueSignNotifications(opts(new Date(start.getTime() + day * DAY)), deps(mailer));
    }
    const keys = mailer.sent
      .filter((email) => email.idempotencyKey.startsWith("sign-remind:"))
      .map((email) => email.idempotencyKey);
    expect(keys.filter((key) => key.includes(":asked:"))).toHaveLength(3);
    expect(keys.filter((key) => !key.includes(":asked:"))).toEqual([
      expect.stringMatching(/:1$/),
      expect.stringMatching(/:2$/),
      expect.stringMatching(/:3$/),
    ]);
  });

  test("a request past its expiry expires and invites nobody", async () => {
    const own = await createTestTenant();
    const env: SignEnvironment = {
      organizationId: own.organization.id,
      projectId: own.project.id,
      environmentId: own.development.id,
      mode: "sandbox",
    };
    const request = await create(env, {
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      send: false,
    });
    const { sendSignRequest } = await import("../src/index.ts");
    await sendSignRequest({ ...env, requestId: request.id, actor: { kind: "api_key" } });
    const mailer = recordingMailer();
    await runDueSignNotifications(
      {
        limit: 50,
        now: new Date(Date.now() + 120_000),
        scope: { organizationIds: [own.organization.id] },
      },
      deps(mailer),
    );
    const expired = await getSignRequest({ ...env, requestId: request.id });
    expect(expired.status).toBe("expired");
    expect(expired.expired_at).not.toBeNull();
    expect(mailer.sent).toHaveLength(0);
    const events = await listSignRequestEvents({ ...env, requestId: request.id });
    expect(events.at(-1)?.type).toBe("expired");
  });
});

describe("signed copies", () => {
  test("email signers get the sealed PDF attached once it is ready", async () => {
    const own = await createTestTenant();
    const env: SignEnvironment = {
      organizationId: own.organization.id,
      projectId: own.project.id,
      environmentId: own.development.id,
      mode: "sandbox",
    };
    const request = await create(env, {});
    const mailer = recordingMailer();
    const opts = { limit: 50, scope: { organizationIds: [own.organization.id] } };
    await runDueSignNotifications(opts, deps(mailer));
    const invitation = mailer.sent[0];
    if (invitation) await signFromEmail(invitation);
    // Not sealed yet: no copy.
    await runDueSignNotifications(opts, deps(mailer));
    expect(mailer.sent.some((email) => email.idempotencyKey.startsWith("sign-copy:"))).toBe(false);
    await runDueSignCompletions(opts, { store, sealer: await LocalSealer.create() });
    await runDueSignNotifications(opts, deps(mailer));
    await runDueSignNotifications(opts, deps(mailer));
    const copies = mailer.sent.filter((email) => email.idempotencyKey.startsWith("sign-copy:"));
    expect(copies).toHaveLength(1);
    expect(copies[0]).toMatchObject({
      to: "ada@example.com",
      subject: 'Signed: "Services agreement"',
    });
    expect(copies[0]?.attachment?.filename).toBe("Services agreement (signed).pdf");
    expect(
      Buffer.from(copies[0]?.attachment?.content ?? [])
        .subarray(0, 5)
        .toString(),
    ).toBe("%PDF-");
    expect((await getSignRequest({ ...env, requestId: request.id })).status).toBe("completed");
  });
});

describe("delivery robustness", () => {
  test("a signer whose email keeps failing waits, and the others still get theirs", async () => {
    const own = await createTestTenant();
    const env: SignEnvironment = {
      organizationId: own.organization.id,
      projectId: own.project.id,
      environmentId: own.development.id,
      mode: "sandbox",
    };
    const request = await create(env, {
      title: "Line one\nline two",
      signers: [emailSigner("Bad", "bad@example.com"), emailSigner("Good", "good@example.com")],
    });
    const sent: SignEmail[] = [];
    const picky: SignMailer = {
      async send(email) {
        if (email.to === "bad@example.com") throw new Error("refused");
        sent.push(email);
        return { replayed: false };
      },
    };
    const opts = (now: Date) => ({
      limit: 50,
      now,
      scope: { organizationIds: [own.organization.id] },
    });
    const start = new Date();
    await runDueSignNotifications(opts(start), deps(picky));
    expect(sent.map((email) => email.to)).toEqual(["good@example.com"]);
    // Subjects are one line.
    expect(sent[0]?.subject).toBe(`${own.organization.name} sent you "Line one line two" to sign`);
    const [bad] = await db
      .select()
      .from(schema.signSigner)
      .where(
        and(
          eq(schema.signSigner.requestId, request.id),
          eq(schema.signSigner.email, "bad@example.com"),
        ),
      );
    expect(bad?.emailFailures).toBe(1);
    expect(bad?.emailRetryAt?.getTime()).toBeGreaterThan(start.getTime());
    // Not retried before its time.
    const calls: string[] = [];
    const counting: SignMailer = {
      async send(email) {
        calls.push(email.to);
        return { replayed: false };
      },
    };
    await runDueSignNotifications(opts(start), deps(counting));
    expect(calls).toEqual([]);
    await runDueSignNotifications(opts(new Date(start.getTime() + 2 * 60_000)), deps(counting));
    expect(calls).toEqual(["bad@example.com"]);
  });

  test("coss.com's sender gets the copy without the requester's message", async () => {
    const own = await createTestTenant();
    const env: SignEnvironment = {
      organizationId: own.organization.id,
      projectId: own.project.id,
      environmentId: own.development.id,
      mode: "sandbox",
    };
    await updateSignSettings({ ...env, update: { email_from: "contracts@acme.test" } });
    await create(env, {});
    const mailer = recordingMailer();
    await runDueSignNotifications(
      { limit: 50, scope: { organizationIds: [own.organization.id] } },
      deps(mailer),
    );
    expect(mailer.sent[0]?.text).toContain("Please sign by Friday.");
    expect(mailer.sent[0]?.cossContent?.text).not.toContain("Please sign by Friday.");
  });

  test("recording the invitation never moves a signer back to notified", async () => {
    const own = await createTestTenant();
    const env: SignEnvironment = {
      organizationId: own.organization.id,
      projectId: own.project.id,
      environmentId: own.development.id,
      mode: "sandbox",
    };
    const request = await create(env, {});
    // The signer opens a link before the invitation is recorded (e.g. a resend in between).
    const viewing: SignMailer = {
      async send() {
        await db
          .update(schema.signSigner)
          .set({ status: "viewed" })
          .where(eq(schema.signSigner.requestId, request.id));
        return { replayed: false };
      },
    };
    await runDueSignNotifications(
      { limit: 50, scope: { organizationIds: [own.organization.id] } },
      deps(viewing),
    );
    const read = await getSignRequest({ ...env, requestId: request.id });
    expect(read.signers[0]?.status).toBe("viewed");
  });
});

describe("suspension", () => {
  test("a suspended organization's signers aren't emailed until it is reinstated", async () => {
    const own = await createTestTenant();
    const env: SignEnvironment = {
      organizationId: own.organization.id,
      projectId: own.project.id,
      environmentId: own.development.id,
      mode: "sandbox",
    };
    await create(env, {});
    await db
      .insert(schema.organizationSuspension)
      .values({ organizationId: own.organization.id, reason: "test" });
    const mailer = recordingMailer();
    const opts = { limit: 50, scope: { organizationIds: [own.organization.id] } };
    await runDueSignNotifications(opts, deps(mailer));
    expect(mailer.sent).toHaveLength(0);
    await db
      .delete(schema.organizationSuspension)
      .where(eq(schema.organizationSuspension.organizationId, own.organization.id));
    await runDueSignNotifications(opts, deps(mailer));
    expect(mailer.sent).toHaveLength(1);
  });
});
