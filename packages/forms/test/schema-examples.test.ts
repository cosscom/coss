/** Each wire schema's first example is what the API reference shows: it must parse. */
import { expect, test } from "bun:test";
import type { z } from "zod";
import * as schemas from "../src/schemas.ts";

const SCHEMAS: Record<string, z.ZodType> = {
  CreateFormRequest: schemas.CreateFormRequest,
  UpdateFormRequest: schemas.UpdateFormRequest,
  FormObject: schemas.FormObject,
  FormList: schemas.FormList,
  DeletedForm: schemas.DeletedForm,
  FormSubmissionObject: schemas.FormSubmissionObject,
  FormSubmissionList: schemas.FormSubmissionList,
  DeletedFormSubmission: schemas.DeletedFormSubmission,
  FormSubmissionWebhookEvent: schemas.FormSubmissionWebhookEvent,
};

for (const [name, schema] of Object.entries(SCHEMAS)) {
  test(`${name}'s example parses`, () => {
    const examples = (schema.meta() as { examples?: unknown[] } | undefined)?.examples ?? [];
    expect(examples.length).toBeGreaterThan(0);
    for (const example of examples) expect(schema.safeParse(example).error).toBeUndefined();
  });
}

test("hosted pages refuse credential fields, not ordinary ones", () => {
  for (const name of ["password", "Passcode", "card_number", "cvv", "SSN", "otp"]) {
    expect(schemas.FORBIDDEN_HOSTED_FIELD_PATTERN.test(name)).toBe(true);
  }
  for (const name of ["email", "company", "message", "passport_country", "spin"]) {
    expect(schemas.FORBIDDEN_HOSTED_FIELD_PATTERN.test(name)).toBe(false);
  }
});
