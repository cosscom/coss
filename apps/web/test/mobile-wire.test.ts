import { describe, expect, test } from "bun:test";
import type { EmailObjectOutput } from "@coss/email";
import { EmailObject } from "@coss/email/schemas";
import { toMobileEmail, toMobileEmailSummary } from "../src/lib/mobile-wire";

const example = (EmailObject.meta() as { examples: EmailObjectOutput[] })
  .examples[0] as EmailObjectOutput;

describe("mobile email wire", () => {
  test("an email whose content was discarded says so", () => {
    const email: EmailObjectOutput = {
      ...example,
      subject: "",
      html: null,
      text: null,
      content_storage: { mode: "discard", discarded_at: "2026-10-19T10:00:00.000Z" },
    };
    expect(toMobileEmailSummary(email).content_discarded_at).toBe("2026-10-19T10:00:00.000Z");
    expect(toMobileEmail(email)).toMatchObject({
      subject: "",
      text: null,
      has_html: false,
      content_storage: "discard",
      content_discarded_at: "2026-10-19T10:00:00.000Z",
    });
  });

  test("a stored email keeps its content; template and broadcast come along", () => {
    const email: EmailObjectOutput = {
      ...example,
      template: { id: "tmpl_1", version: 3, locale: "en" },
      broadcast_id: "bc_1",
    };
    expect(toMobileEmail(email)).toMatchObject({
      subject: example.subject,
      content_storage: "store",
      content_discarded_at: null,
      template: { id: "tmpl_1", version: 3, locale: "en" },
      broadcast_id: "bc_1",
    });
  });
});
