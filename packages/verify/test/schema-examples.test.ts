/** Each wire schema's first example is what the API reference shows: it must parse. */
import { expect, test } from "bun:test";
import { countSegments } from "@coss/sms/segments";
import type { z } from "zod";
import { verifySmsText } from "../src/messages.ts";
import * as schemas from "../src/schemas.ts";

const SCHEMAS: Record<string, z.ZodType> = {
  StartVerificationRequest: schemas.StartVerificationRequest,
  CheckVerificationRequest: schemas.CheckVerificationRequest,
  VerificationObject: schemas.VerificationObject,
  VerificationCheckObject: schemas.VerificationCheckObject,
  VerificationList: schemas.VerificationList,
  VerificationWebhookEvent: schemas.VerificationWebhookEvent,
};

for (const [name, schema] of Object.entries(SCHEMAS)) {
  test(`${name}'s example parses`, () => {
    const examples = (schema.meta() as { examples?: unknown[] } | undefined)?.examples ?? [];
    expect(examples.length).toBeGreaterThan(0);
    for (const example of examples) expect(schema.safeParse(example).error).toBeUndefined();
  });
}

test("the channel follows the destination unless given, and must fit it", () => {
  expect(schemas.StartVerificationRequest.parse({ to: "+14155550123" }).channel).toBe("sms");
  expect(schemas.StartVerificationRequest.parse({ to: "A@B.co" })).toEqual({
    to: "a@b.co",
    channel: "email",
  });
  expect(schemas.StartVerificationRequest.safeParse({ to: "a@b.co", channel: "sms" }).success).toBe(
    false,
  );
  expect(schemas.StartVerificationRequest.safeParse({ to: "4155550123" }).success).toBe(false);
});

test("a check names the verification or the destination, not both", () => {
  expect(schemas.CheckVerificationRequest.safeParse({ code: "123456" }).success).toBe(false);
  expect(
    schemas.CheckVerificationRequest.safeParse({
      to: "+14155550123",
      verification_id: "vrf_x",
      code: "123456",
    }).success,
  ).toBe(false);
  expect(
    schemas.CheckVerificationRequest.safeParse({ to: "+14155550123", code: "12" }).success,
  ).toBe(false);
});

test("an SMS code fits one segment for any allowed app name", () => {
  const name = "x".repeat(schemas.MAX_APP_NAME_LENGTH);
  expect(countSegments(verifySmsText(name, "1234567890")).segments).toBe(1);
});
