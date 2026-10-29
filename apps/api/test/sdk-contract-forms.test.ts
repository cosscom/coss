/** Contract test: the built SDK's `coss.forms` against the real app, in process. */
import { expect, test } from "bun:test";
import { createTestTenant } from "@coss/tenancy/testing";
import { Coss } from "coss";
import { createTestApp, type TestApp } from "./helpers.ts";

function clientFor(app: TestApp, apiKey: string): Coss {
  return new Coss({
    apiKey,
    baseUrl: "http://api.test",
    fetch: (input, init) =>
      Promise.resolve(
        app.fetch(
          input instanceof Request ? new Request(input, init) : new Request(String(input), init),
        ),
      ),
  });
}

test("coss.forms creates forms and reads, releases and deletes their submissions", async () => {
  const tenant = await createTestTenant();
  const { app } = createTestApp({ forms: { url: "http://forms.test" } });
  const coss = clientFor(app, tenant.sandboxKey);

  const created = await coss.forms.create({
    name: "Contact",
    files: { enabled: true },
    fields: [
      { name: "email", type: "email", required: true },
      { name: "message", type: "textarea" },
      { name: "cv", type: "file" },
    ],
  });
  expect(created.error).toBeNull();
  const form = created.data;
  if (!form) throw new Error("no form");
  expect(form).toMatchObject({ endpoint: `http://forms.test/f/${form.id}`, sandbox: true });
  expect((await coss.forms.get(form.id)).data?.id).toBe(form.id);
  expect((await coss.forms.list({ limit: 5 })).data?.data.map((item) => item.id)).toEqual([
    form.id,
  ]);
  const updated = await coss.forms.update(form.id, { spam: { on_review: "deliver" } });
  expect(updated.data?.spam).toMatchObject({ on_review: "deliver", honeypot_field: "_gotcha" });

  // Two posts to the endpoint: one spam, one with a file.
  const spam = new FormData();
  spam.append("email", "bot@example.com");
  spam.append("message", "Cheap [coss-test:spam]");
  await app.fetch(
    new Request(form.endpoint, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: spam,
    }),
  );
  const good = new FormData();
  good.append("email", "ada@example.com");
  good.append("cv", new File(["hello"], "cv.txt", { type: "text/plain" }));
  await app.fetch(
    new Request(form.endpoint, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: good,
    }),
  );

  const flagged = await coss.forms.submissions.list(form.id, { status: ["spam"] });
  expect(flagged.data?.data.map((item) => item.spam_reason)).toEqual(["content"]);
  const spamId = flagged.data?.data[0]?.id ?? "";
  const released = await coss.forms.submissions.release(form.id, spamId);
  expect(released.data).toMatchObject({ status: "accepted", spam_reason: null });
  expect(released.data?.released_at).not.toBeNull();

  const accepted = await coss.forms.submissions.list(form.id, { status: ["accepted"] });
  const withFile = accepted.data?.data.find((item) => item.files.length > 0);
  expect(withFile?.files[0]).toMatchObject({ filename: "cv.txt", size: 5 });
  const bytes = await coss.forms.submissions.file(
    form.id,
    withFile?.id ?? "",
    withFile?.files[0]?.id ?? "",
  );
  expect(new TextDecoder().decode(bytes.data ?? undefined)).toBe("hello");
  expect((await coss.forms.submissions.get(form.id, withFile?.id ?? "")).data?.id).toBe(
    withFile?.id,
  );

  expect((await coss.forms.submissions.remove(form.id, spamId)).data).toEqual({
    object: "form_submission",
    id: spamId,
    deleted: true,
  });
  expect((await coss.forms.submissions.get(form.id, spamId)).error?.type).toBe("not_found_error");
  expect((await coss.forms.remove(form.id)).data?.deleted).toBe(true);
  expect((await coss.forms.get(form.id)).error?.code).toBe("not_found");
});
