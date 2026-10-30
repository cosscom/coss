import { beforeAll, describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { testRiskDeps } from "@coss/risk/testing";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { and, eq } from "drizzle-orm";
import {
  createForm,
  FakeFormFileStore,
  type FormEnvironment,
  type SubmitFormInput,
  submitForm,
} from "../src/index.ts";
import { CreateFormRequest } from "../src/schemas.ts";
import { TEST_FORM_LINKS, testFormChecks } from "../src/testing.ts";

const store = new FakeFormFileStore();
const riskDeps = testRiskDeps();
const deps = { riskDeps, store, links: TEST_FORM_LINKS };

let tenant: TestTenant;
let sandbox: FormEnvironment;
let live: FormEnvironment;

beforeAll(async () => {
  tenant = await createTestTenant();
  const base = { organizationId: tenant.organization.id, projectId: tenant.project.id };
  sandbox = { ...base, environmentId: tenant.development.id, mode: "sandbox" };
  live = { ...base, environmentId: tenant.production.id, mode: "live" };
});

async function form(env: FormEnvironment, params: Record<string, unknown> = {}) {
  return createForm(env, CreateFormRequest.parse({ name: "Contact", ...params }), {
    links: TEST_FORM_LINKS,
    checks: testFormChecks(["acme.test"]),
  });
}

function post(
  formId: string,
  fields: Record<string, string | string[]>,
  extra: Partial<SubmitFormInput> = {},
): SubmitFormInput {
  return {
    formId,
    fields: Object.entries(fields).flatMap(([name, value]) =>
      (Array.isArray(value) ? value : [value]).map((one) => [name, one] as [string, string]),
    ),
    files: [],
    ip: "192.0.2.10",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
    origin: "https://www.example.com",
    referrer: "https://www.example.com/contact",
    ...extra,
  };
}

async function submission(id: string) {
  const [row] = await db
    .select()
    .from(schema.formSubmission)
    .where(eq(schema.formSubmission.id, id));
  return row;
}

async function deliveries(submissionId: string) {
  return (
    await db
      .select({ kind: schema.formDelivery.kind })
      .from(schema.formDelivery)
      .where(eq(schema.formDelivery.submissionId, submissionId))
  )
    .map((row) => row.kind)
    .sort();
}

describe("submitForm", () => {
  test("accepts a submission: stored, assessed, logged, its deliveries queued", async () => {
    const created = await form(sandbox, {
      notifications: { recipients: [tenant.owner.email] },
    });
    const result = await submitForm(
      deps,
      post(created.id, { name: "Ada", email: "Ada@Example.com", message: "Hello", _next: "x" }),
    );
    expect(result.outcome).toBe("accepted");
    if (result.outcome !== "accepted") return;
    const row = await submission(result.submissionId);
    expect(row).toMatchObject({
      status: "accepted",
      data: { name: "Ada", email: "Ada@Example.com", message: "Hello" },
      submitterEmail: "ada@example.com",
      origin: "https://www.example.com",
      riskDecision: "allow",
      spamReason: null,
    });
    expect(row?.riskAssessmentId).toMatch(/^rsk_/);
    // Sandbox: never metered.
    expect(row?.usageRecordedAt).toBeNull();
    expect(await deliveries(result.submissionId)).toEqual(["notification"]);
    const lines = await db
      .select({ type: schema.logEntry.type, source: schema.logEntry.source })
      .from(schema.logEntry)
      .where(
        and(
          eq(schema.logEntry.organizationId, sandbox.organizationId),
          eq(schema.logEntry.resourceId, result.submissionId),
        ),
      );
    expect(lines).toEqual([{ type: "form_submission.received", source: "forms" }]);
  });

  test("the honeypot: spam, no assessment, answered like a success", async () => {
    const created = await form(sandbox);
    const result = await submitForm(
      deps,
      post(created.id, { email: "bot@example.com", _gotcha: "http://spam.example" }),
    );
    expect(result.outcome).toBe("spam");
    if (result.outcome !== "spam") return;
    expect(await submission(result.submissionId)).toMatchObject({
      status: "spam",
      spamReason: "honeypot",
      riskAssessmentId: null,
    });

    // Over the limits: still answered like a success, but nothing it sent is kept.
    const huge = await submitForm(
      deps,
      post(created.id, { _gotcha: "x", message: "a".repeat(20_000), tag: Array(2000).fill("t") }),
    );
    expect(huge.outcome).toBe("spam");
    if (huge.outcome !== "spam") return;
    expect((await submission(huge.submissionId))?.data).toEqual({});
  });

  test("content screening: spam text is refused at the form's threshold", async () => {
    const created = await form(sandbox);
    const result = await submitForm(
      deps,
      post(created.id, { email: "ada@example.com", message: "Cheap pills [coss-test:spam]" }),
    );
    expect(result.outcome).toBe("spam");
    if (result.outcome !== "spam") return;
    expect((await submission(result.submissionId))?.spamReason).toBe("content");

    const lenient = await form(sandbox, { spam: { content_threshold: null } });
    const kept = await submitForm(
      deps,
      post(lenient.id, { email: "ada@example.com", message: "Cheap pills [coss-test:spam]" }),
    );
    expect(kept.outcome).toBe("accepted");
  });

  test("Risk's review holds the submission, or delivers it when the form says so", async () => {
    const held = await form(sandbox);
    // A Tor exit node in sandbox fixtures: Risk asks for a review.
    const result = await submitForm(
      deps,
      post(held.id, { email: "ada@example.com" }, { ip: "192.0.2.1" }),
    );
    expect(["held", "spam"]).toContain(result.outcome);
    if (result.outcome === "held") {
      expect((await submission(result.submissionId))?.spamReason).toBe("risk_review");
    }
  });

  test("allowed origins: other sites and missing origins are refused", async () => {
    const created = await form(sandbox, { allowed_origins: ["https://www.example.com"] });
    expect(
      (await submitForm(deps, post(created.id, { a: "b" }, { origin: "https://evil.test" })))
        .outcome,
    ).toBe("origin_refused");
    expect(
      (await submitForm(deps, post(created.id, { a: "b" }, { origin: null, referrer: null })))
        .outcome,
    ).toBe("origin_refused");
    // The Referer stands in for a missing Origin.
    expect((await submitForm(deps, post(created.id, { a: "b" }, { origin: null }))).outcome).toBe(
      "accepted",
    );
  });

  test("field definitions are enforced and reported per field", async () => {
    const created = await form(sandbox, {
      strict_fields: true,
      fields: [
        { name: "email", type: "email", required: true },
        { name: "plan", type: "select", options: ["Free", "Pro"] },
        { name: "age", type: "number" },
      ],
    });
    const result = await submitForm(
      deps,
      post(created.id, { email: "nope", plan: "Gold", age: "old", extra: "x" }),
    );
    expect(result.outcome).toBe("invalid");
    if (result.outcome !== "invalid") return;
    expect(result.errors.map((error) => [error.field, error.code]).sort()).toEqual([
      ["age", "invalid"],
      ["email", "invalid"],
      ["extra", "unknown_field"],
      ["plan", "invalid"],
    ]);

    // Spaces count against a field's own limit too.
    const short = await form(sandbox, { fields: [{ name: "code", type: "text", max_length: 5 }] });
    expect((await submitForm(deps, post(short.id, { code: " ".repeat(50) }))).outcome).toBe(
      "invalid",
    );

    // A defined field keeps the global cap; a date must exist.
    const typed = await form(sandbox, {
      fields: [
        { name: "note", type: "text" },
        { name: "day", type: "date" },
      ],
    });
    const refused = await submitForm(
      deps,
      post(typed.id, { note: "a".repeat(10_001), day: "2026-02-31" }),
    );
    expect(refused.outcome).toBe("invalid");
    if (refused.outcome !== "invalid") return;
    expect(refused.errors.map((error) => [error.field, error.code]).sort()).toEqual([
      ["day", "invalid"],
      ["note", "too_long"],
    ]);
    expect(
      (await submitForm(deps, post(typed.id, { note: "hi", day: "2028-02-29" }))).outcome,
    ).toBe("accepted");
  });

  test("a field repeated past the values cap is refused, quickly", async () => {
    const created = await form(sandbox, {});
    const started = performance.now();
    const result = await submitForm(deps, post(created.id, { tag: Array(60_000).fill("") }));
    expect(performance.now() - started).toBeLessThan(1000);
    expect(result.outcome).toBe("invalid");
    if (result.outcome !== "invalid") return;
    expect(result.errors).toEqual([
      { field: null, code: "too_many_fields", message: "At most 1000 values." },
    ]);
  });

  test("a required captcha needs a token, and a failed one is shown", async () => {
    const created = await form(sandbox);
    // No captcha in the environment's risk settings: set the form's mode directly.
    await db.update(schema.form).set({ captcha: "required" }).where(eq(schema.form.id, created.id));
    const missing = await submitForm(deps, post(created.id, { email: "ada@example.com" }));
    expect(missing.outcome).toBe("invalid");
    // A token nobody could check (a provider down, the captcha set up no more) is no pass.
    const unchecked = await submitForm(
      deps,
      post(created.id, { email: "ada@example.com", "cf-turnstile-response": "not-a-fixture" }),
    );
    expect(unchecked).toMatchObject({
      outcome: "invalid",
      errors: [
        { code: "captcha", message: "The captcha couldn't be checked. Try again in a moment." },
      ],
    });
  });

  test("verifying submitters holds the submission until they confirm", async () => {
    const created = await form(sandbox, { submitter: { verify: true } });
    const withoutEmail = await submitForm(deps, post(created.id, { message: "hi" }));
    expect(withoutEmail.outcome).toBe("invalid");
    const result = await submitForm(deps, post(created.id, { email: "ada@example.com" }));
    expect(result.outcome).toBe("pending_confirmation");
    if (result.outcome !== "pending_confirmation") return;
    expect(await deliveries(result.submissionId)).toEqual(["verification"]);
  });

  test("files are stored with the submission; refused types and forms without uploads", async () => {
    const without = await form(sandbox);
    const file = {
      field: "cv",
      filename: "../../cv.pdf",
      contentType: "application/pdf",
      content: new TextEncoder().encode("%PDF-1.4"),
    };
    const refused = await submitForm(deps, post(without.id, { a: "b" }, { files: [file] }));
    expect(refused.outcome).toBe("invalid");

    const created = await form(sandbox, { files: { enabled: true } });
    const html = { ...file, filename: "page.html", contentType: "text/html" };
    const blocked = await submitForm(deps, post(created.id, { a: "b" }, { files: [html] }));
    expect(blocked.outcome).toBe("invalid");

    const result = await submitForm(deps, post(created.id, { a: "b" }, { files: [file] }));
    expect(result.outcome).toBe("accepted");
    if (result.outcome !== "accepted") return;
    const [stored] = await db
      .select()
      .from(schema.formSubmissionFile)
      .where(eq(schema.formSubmissionFile.submissionId, result.submissionId));
    expect(stored).toMatchObject({ filename: "cv.pdf", contentType: "application/pdf", size: 8 });
    expect(new TextDecoder().decode((await store.get(stored?.storeKey ?? "")) ?? undefined)).toBe(
      "%PDF-1.4",
    );

    // With field definitions, an undefined file field is refused only by `strict_fields`.
    const fields = [
      { name: "email", type: "email" },
      { name: "note", type: "text" },
    ];
    const loose = await form(sandbox, { files: { enabled: true }, fields });
    expect(
      (await submitForm(deps, post(loose.id, { email: "ada@example.com" }, { files: [file] })))
        .outcome,
    ).toBe("accepted");
    const onText = await submitForm(
      deps,
      post(loose.id, { email: "ada@example.com" }, { files: [{ ...file, field: "note" }] }),
    );
    expect(onText.outcome).toBe("invalid");
    const strict = await form(sandbox, { files: { enabled: true }, fields, strict_fields: true });
    expect(
      (await submitForm(deps, post(strict.id, { email: "ada@example.com" }, { files: [file] })))
        .outcome,
    ).toBe("invalid");
  });

  test("a capped plan's submissions used up: the form takes none", async () => {
    const created = await form(live);
    const capped = {
      ...deps,
      billing: {
        async reserve() {
          throw Object.assign(new Error("Over the plan's submissions."), {
            code: "usage_limit_exceeded",
          });
        },
      },
    };
    const before = await db
      .select({ id: schema.formSubmission.id })
      .from(schema.formSubmission)
      .where(eq(schema.formSubmission.formId, created.id));
    const result = await submitForm(capped, post(created.id, { email: "ada@example.com" }));
    expect(result.outcome).toBe("unavailable");
    const after = await db
      .select({ id: schema.formSubmission.id })
      .from(schema.formSubmission)
      .where(eq(schema.formSubmission.formId, created.id));
    expect(after).toEqual(before);
  });

  test("live: files are metered in whole MB; a capped plan's uploads used up refuse the files", async () => {
    // A tenant of its own: other tests count this organization's submissions.
    const own = await createTestTenant();
    const env: FormEnvironment = {
      organizationId: own.organization.id,
      projectId: own.project.id,
      environmentId: own.production.id,
      mode: "live",
    };
    const created = await form(env, { files: { enabled: true } });
    // 1.5 MB in two files: billed as 2 MB.
    const files = [512 * 1024, 1024 * 1024].map((size, index) => ({
      field: "cv",
      filename: `cv-${index}.pdf`,
      contentType: "application/pdf",
      content: new Uint8Array(size),
    }));
    const reserved: { meter: string; quantity: number }[] = [];
    const gated = {
      ...deps,
      billing: {
        async reserve(_tx: unknown, input: { meter: string; quantity: number }) {
          reserved.push({ meter: input.meter, quantity: input.quantity });
        },
      },
    };
    const result = await submitForm(
      gated,
      post(created.id, { email: "ada@example.com" }, { files }),
    );
    expect(result.outcome).toBe("accepted");
    expect(reserved).toEqual([
      { meter: "forms.submissions", quantity: 1 },
      { meter: "forms.file_uploads", quantity: 2 },
    ]);
    const usage = await db
      .select({ quantity: schema.billingUsage.quantity })
      .from(schema.billingUsage)
      .where(
        and(
          eq(schema.billingUsage.organizationId, env.organizationId),
          eq(schema.billingUsage.meter, "forms.file_uploads"),
        ),
      );
    expect(usage.reduce((sum, row) => sum + row.quantity, 0)).toBe(2);

    const capped = {
      ...deps,
      billing: {
        async reserve(_tx: unknown, input: { meter: string }) {
          if (input.meter !== "forms.file_uploads") return;
          throw Object.assign(new Error("Over the plan's uploads."), {
            code: "usage_limit_exceeded",
          });
        },
      },
    };
    const refused = await submitForm(capped, post(created.id, { a: "b" }, { files }));
    expect(refused.outcome).toBe("invalid");
    if (refused.outcome !== "invalid") return;
    expect(refused.errors).toEqual([
      {
        field: "cv",
        code: "files_not_accepted",
        message: "This form can't take files right now. Send it without them.",
      },
    ]);
    // Without the files it goes through.
    expect((await submitForm(capped, post(created.id, { a: "b" }))).outcome).toBe("accepted");
    const rows = await db
      .select({ id: schema.formSubmission.id })
      .from(schema.formSubmission)
      .where(eq(schema.formSubmission.formId, created.id));
    expect(rows).toHaveLength(2);
  });

  test("live: metered once; disabled forms and suspended organizations take nothing", async () => {
    const created = await form(live);
    const result = await submitForm(deps, post(created.id, { email: "ada@example.com" }));
    expect(result.outcome).toBe("accepted");
    if (result.outcome !== "accepted") return;
    expect((await submission(result.submissionId))?.usageRecordedAt).toBeInstanceOf(Date);
    const usage = await db
      .select({ quantity: schema.billingUsage.quantity })
      .from(schema.billingUsage)
      .where(
        and(
          eq(schema.billingUsage.organizationId, live.organizationId),
          eq(schema.billingUsage.meter, "forms.submissions"),
        ),
      );
    expect(usage.reduce((sum, row) => sum + row.quantity, 0)).toBe(1);

    await db.update(schema.form).set({ enabled: false }).where(eq(schema.form.id, created.id));
    expect((await submitForm(deps, post(created.id, { a: "b" }))).outcome).toBe("unavailable");

    const other = await createTestTenant();
    const otherForm = await createForm(
      {
        organizationId: other.organization.id,
        projectId: other.project.id,
        environmentId: other.development.id,
        mode: "sandbox",
      },
      CreateFormRequest.parse({ name: "Suspended" }),
      { links: TEST_FORM_LINKS, checks: testFormChecks() },
    );
    await db.insert(schema.organizationSuspension).values({
      organizationId: other.organization.id,
      reason: "test",
    });
    expect((await submitForm(deps, post(otherForm.id, { a: "b" }))).outcome).toBe("unavailable");
    expect((await submitForm(deps, post("form_nope", { a: "b" }))).outcome).toBe("unavailable");
  });

  test("_next redirects only toward allowed origins", async () => {
    const created = await form(sandbox, {
      allowed_origins: ["https://www.example.com"],
      redirect_url: "https://www.example.com/thanks",
    });
    const own = await submitForm(
      deps,
      post(created.id, { a: "b", _next: "https://www.example.com/done" }),
    );
    expect(own.outcome === "accepted" && own.redirect).toBe("https://www.example.com/done");
    const elsewhere = await submitForm(
      deps,
      post(created.id, { a: "b", _next: "https://evil.test/phish" }),
    );
    expect(elsewhere.outcome === "accepted" && elsewhere.redirect).toBe(
      "https://www.example.com/thanks",
    );
  });
});
