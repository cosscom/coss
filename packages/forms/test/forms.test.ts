import { beforeAll, describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { eq, like } from "drizzle-orm";
import {
  checkedFormOrigin,
  createForm,
  deleteForm,
  FakeFormFileStore,
  type FormEnvironment,
  FormError,
  getForm,
  listForms,
  updateForm,
} from "../src/index.ts";
import { CreateFormRequest } from "../src/schemas.ts";
import { removeStoreObjects, scheduleStoreCleanup } from "../src/store-cleanup.ts";
import { TEST_FORM_LINKS, testFormChecks } from "../src/testing.ts";

const links = TEST_FORM_LINKS;
const store = new FakeFormFileStore();

let tenant: TestTenant;
let sandbox: FormEnvironment;
let live: FormEnvironment;

beforeAll(async () => {
  tenant = await createTestTenant();
  const base = { organizationId: tenant.organization.id, projectId: tenant.project.id };
  sandbox = { ...base, environmentId: tenant.development.id, mode: "sandbox" };
  live = { ...base, environmentId: tenant.production.id, mode: "live" };
});

async function expectFormError(promise: Promise<unknown>, code: FormError["code"]) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(FormError);
    expect((error as FormError).code).toBe(code);
    return error as FormError;
  }
  throw new Error(`expected ${code}`);
}

function create(env: FormEnvironment, params: unknown, checks = testFormChecks()) {
  return createForm(env, CreateFormRequest.parse(params), { links, checks });
}

describe("createForm", () => {
  test("defaults: any field, any origin, held reviews, the honeypot", async () => {
    const form = await create(sandbox, { name: "Contact" });
    expect(form).toMatchObject({
      object: "form",
      name: "Contact",
      enabled: true,
      endpoint: `https://forms.coss.test/f/${form.id}`,
      hosted_url: null,
      fields: null,
      allowed_origins: [],
      spam: { honeypot_field: "_gotcha", captcha: "off", on_review: "hold" },
      submitter: { email_field: "email", verify: false },
      contacts: { enabled: false },
      files: { enabled: false },
      sandbox: true,
    });
    expect(await getForm({ ...sandbox, formId: form.id }, links)).toEqual(form);
  });

  test("origins are normalized; http://localhost only in sandbox", async () => {
    const form = await create(sandbox, {
      name: "Origins",
      allowed_origins: ["https://Example.com/", "http://localhost:5173", "https://example.com"],
    });
    expect(form.allowed_origins).toEqual(["https://example.com", "http://localhost:5173"]);
    expect(() => checkedFormOrigin("http://localhost:5173", "live")).toThrow(FormError);
    expect(() => checkedFormOrigin("https://example.com/contact", "sandbox")).toThrow(
      "without a path",
    );
  });

  test("field definitions: unique names, options only where they belong", async () => {
    await expectFormError(
      create(sandbox, {
        name: "Dup",
        fields: [
          { name: "email", type: "email" },
          { name: "email", type: "text" },
        ],
      }),
      "invalid_fields",
    );
    await expectFormError(
      create(sandbox, { name: "Select", fields: [{ name: "plan", type: "select" }] }),
      "invalid_fields",
    );
    await expectFormError(
      create(sandbox, { name: "File", fields: [{ name: "cv", type: "file" }] }),
      "invalid_fields",
    );
    const form = await create(sandbox, {
      name: "Typed",
      files: { enabled: true },
      fields: [
        { name: "email", type: "email", required: true },
        { name: "plan", type: "select", options: ["Free", "Pro"] },
        { name: "cv", type: "file" },
      ],
    });
    expect(form.fields?.map((field) => [field.name, field.required])).toEqual([
      ["email", true],
      ["plan", false],
      ["cv", false],
    ]);
  });

  test("a required captcha needs one in the environment's risk settings", async () => {
    await expectFormError(
      create(sandbox, { name: "Captcha", spam: { captcha: "required" } }),
      "captcha_not_configured",
    );
  });

  test("hosted pages need fields and never ask for passwords", async () => {
    await expectFormError(
      create(sandbox, { name: "Hosted", hosted: { enabled: true } }),
      "hosted_needs_fields",
    );
    await expectFormError(
      create(sandbox, {
        name: "Phish",
        hosted: { enabled: true },
        fields: [
          { name: "email", type: "email" },
          { name: "pw", type: "text", label: "Your password" },
        ],
      }),
      "hosted_content_refused",
    );
    const form = await create(sandbox, {
      name: "Waitlist",
      hosted: { enabled: true, title: "Join the waitlist" },
      fields: [{ name: "email", type: "email", required: true }],
    });
    expect(form.hosted_url).toBe(form.endpoint);
    expect(form.hosted.published_at).not.toBeNull();
  });

  test("contacts must name the environment's audiences, topics and properties", async () => {
    await expectFormError(
      create(sandbox, {
        name: "Newsletter",
        contacts: { enabled: true, audience_ids: ["aud_01kd2m8n3p4q5r6s7t8v9w0x1y"] },
      }),
      "invalid_contacts",
    );
    const [audience] = await db
      .insert(schema.audience)
      .values({
        organizationId: sandbox.organizationId,
        projectId: sandbox.projectId,
        environmentId: sandbox.environmentId,
        name: `Newsletter ${uniqueSuffix()}`,
      })
      .returning();
    const form = await create(sandbox, {
      name: "Newsletter",
      contacts: { enabled: true, audience_ids: [audience?.id] },
    });
    expect(form.contacts.audience_ids).toEqual([audience?.id ?? ""]);
  });

  test("live senders and recipients must be verified (or members)", async () => {
    await expectFormError(
      create(live, { name: "Verify", submitter: { verify: true } }),
      "invalid_sender",
    );
    await expectFormError(
      create(live, { name: "From", notifications: { from: "forms@unverified.test" } }),
      "invalid_sender",
    );
    await expectFormError(
      create(live, { name: "To", notifications: { recipients: ["someone@else.test"] } }),
      "invalid_recipient",
    );
    const form = await create(
      live,
      {
        name: "Notified",
        notifications: {
          recipients: [tenant.owner.email.toUpperCase(), "support@acme.test"],
          from: "forms@acme.test",
        },
      },
      testFormChecks(["acme.test"]),
    );
    expect(form.notifications.recipients).toEqual([
      tenant.owner.email.toLowerCase(),
      "support@acme.test",
    ]);
  });
});

describe("updateForm", () => {
  test("changes only what is given, within groups too", async () => {
    const form = await create(sandbox, {
      name: "Partial",
      spam: { honeypot_field: "_hp", on_review: "deliver" },
    });
    const updated = await updateForm(
      sandbox,
      form.id,
      { spam: { on_review: "hold" }, enabled: false },
      { links, checks: testFormChecks() },
    );
    expect(updated.spam).toMatchObject({ honeypot_field: "_hp", on_review: "hold" });
    expect(updated.enabled).toBe(false);
    expect(updated.name).toBe("Partial");
  });

  test("uploads can't be turned off while file fields remain", async () => {
    const form = await create(sandbox, {
      name: "Uploads",
      files: { enabled: true },
      fields: [{ name: "cv", type: "file" }],
    });
    await expectFormError(
      updateForm(
        sandbox,
        form.id,
        { files: { enabled: false } },
        { links, checks: testFormChecks() },
      ),
      "invalid_files",
    );
  });

  test("another organization's form is not found", async () => {
    const other = await createTestTenant();
    const form = await create(sandbox, { name: "Mine" });
    await expectFormError(
      updateForm(
        {
          organizationId: other.organization.id,
          projectId: other.project.id,
          environmentId: other.development.id,
          mode: "sandbox",
        },
        form.id,
        { name: "Theirs" },
        { links, checks: testFormChecks() },
      ),
      "not_found",
    );
  });
});

describe("listForms and deleteForm", () => {
  test("pages newest first; deleting removes the submissions' files", async () => {
    const tenant2 = await createTestTenant();
    const env: FormEnvironment = {
      organizationId: tenant2.organization.id,
      projectId: tenant2.project.id,
      environmentId: tenant2.development.id,
      mode: "sandbox",
    };
    const first = await create(env, { name: "First" });
    const second = await create(env, { name: "Second" });
    const page = await listForms({ ...env, limit: 1 }, links);
    expect(page.data.map((form) => form.id)).toEqual([second.id]);
    expect(page.hasMore).toBe(true);
    const next = await listForms({ ...env, limit: 1, after: second.id }, links);
    expect(next.data.map((form) => form.id)).toEqual([first.id]);

    const [submission] = await db
      .insert(schema.formSubmission)
      .values({ ...env, formId: first.id, status: "accepted", data: { a: "b" } })
      .returning();
    const key = `orgs/${env.organizationId}/${env.environmentId}/forms/${first.id}/x`;
    await store.put({
      key,
      organizationId: env.organizationId,
      contentType: "text/plain",
      content: new TextEncoder().encode("hi"),
    });
    await db.insert(schema.formSubmissionFile).values({
      organizationId: env.organizationId,
      submissionId: submission?.id ?? "",
      field: "file",
      filename: "a.txt",
      contentType: "text/plain",
      size: 2,
      storeKey: key,
      sha256: "0",
    });
    await deleteForm({ ...env, formId: first.id }, store);
    expect(await store.get(key)).toBeNull();
    expect(
      await db.select().from(schema.formStoreCleanup).where(eq(schema.formStoreCleanup.key, key)),
    ).toEqual([]);
    await expectFormError(getForm({ ...env, formId: first.id }, links), "not_found");
  });
});

test("cleanup records any number of keys (batched under Postgres's parameter limit)", async () => {
  const prefix = `orgs/${sandbox.organizationId}/batch-${uniqueSuffix()}/`;
  const keys = Array.from({ length: 2500 }, (_, index) => `${prefix}${index}`);
  await db.transaction((tx) => scheduleStoreCleanup(tx, sandbox.organizationId, keys));
  const rows = await db
    .select({ key: schema.formStoreCleanup.key })
    .from(schema.formStoreCleanup)
    .where(eq(schema.formStoreCleanup.organizationId, sandbox.organizationId));
  expect(rows.filter((row) => row.key.startsWith(prefix))).toHaveLength(2500);
  // Removing them goes in batches too (the store's delete and the cleanup rows').
  await removeStoreObjects(store, keys);
  const left = await db
    .select({ key: schema.formStoreCleanup.key })
    .from(schema.formStoreCleanup)
    .where(like(schema.formStoreCleanup.key, `${prefix}%`));
  expect(left).toEqual([]);
});
