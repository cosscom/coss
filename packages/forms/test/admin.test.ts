import { expect, test } from "bun:test";
import { testRiskDeps } from "@coss/risk/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  createForm,
  FakeFormFileStore,
  getHostedForm,
  listFormsForAdmin,
  setFormDisabledByAdmin,
  submitForm,
} from "../src/index.ts";
import { CreateFormRequest } from "../src/schemas.ts";
import { TEST_FORM_LINKS, testFormChecks } from "../src/testing.ts";

test("an admin-disabled form takes nothing and its hosted page is gone, until re-enabled", async () => {
  const tenant = await createTestTenant();
  const form = await createForm(
    {
      organizationId: tenant.organization.id,
      projectId: tenant.project.id,
      environmentId: tenant.development.id,
      mode: "sandbox",
    },
    CreateFormRequest.parse({
      name: "Login check",
      fields: [{ name: "email", type: "email" }],
      hosted: { enabled: true },
    }),
    { links: TEST_FORM_LINKS, checks: testFormChecks() },
  );
  const post = () =>
    submitForm(
      { riskDeps: testRiskDeps(), store: new FakeFormFileStore(), links: TEST_FORM_LINKS },
      {
        formId: form.id,
        fields: [["email", "ada@gmail.com"]],
        files: [],
        ip: null,
        userAgent: null,
        origin: null,
        referrer: null,
      },
    );
  expect(await getHostedForm(form.id)).not.toBeNull();
  const listed = await listFormsForAdmin({ hostedOnly: true, limit: 200 });
  expect(listed.data.find((row) => row.id === form.id)).toMatchObject({
    organizationId: tenant.organization.id,
    hosted: true,
    disabledByAdminAt: null,
  });

  expect(await setFormDisabledByAdmin(form.id, true)).toMatchObject({
    organizationId: tenant.organization.id,
  });
  expect((await post()).outcome).toBe("unavailable");
  expect(await getHostedForm(form.id)).toBeNull();

  await setFormDisabledByAdmin(form.id, false);
  expect((await post()).outcome).not.toBe("unavailable");
});
