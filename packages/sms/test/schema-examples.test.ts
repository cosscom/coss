/** Each wire schema's first example is what the API reference shows: it must parse. */
import { expect, test } from "bun:test";
import type { z } from "zod";
import * as schemas from "../src/schemas.ts";

const SCHEMAS: Record<string, z.ZodType> = {
  SendSmsRequest: schemas.SendSmsRequest,
  SmsObject: schemas.SmsObject,
  SmsList: schemas.SmsList,
  SmsEvent: schemas.SmsEvent,
  SmsEventList: schemas.SmsEventList,
  SmsWebhookEvent: schemas.SmsWebhookEvent,
  ReceivedSmsObject: schemas.ReceivedSmsObject,
  ReceivedSmsList: schemas.ReceivedSmsList,
  ReceivedSmsWebhookEvent: schemas.ReceivedSmsWebhookEvent,
  SmsSuppression: schemas.SmsSuppression,
  SmsSuppressionList: schemas.SmsSuppressionList,
  CreateSmsSuppressionRequest: schemas.CreateSmsSuppressionRequest,
  SmsSuppressionCheck: schemas.SmsSuppressionCheck,
  DeletedSmsSuppression: schemas.DeletedSmsSuppression,
  SmsNumberObject: schemas.SmsNumberObject,
  SmsNumberList: schemas.SmsNumberList,
};

for (const [name, schema] of Object.entries(SCHEMAS)) {
  test(`${name}'s example parses`, () => {
    const examples = (schema.meta() as { examples?: unknown[] } | undefined)?.examples ?? [];
    expect(examples.length).toBeGreaterThan(0);
    for (const example of examples) expect(schema.safeParse(example).error).toBeUndefined();
  });
}

test("send requests keep absent fields absent", () => {
  expect(
    schemas.SendSmsRequest.parse({
      from: "+14155550123",
      to: "+14155550199",
      body: "Hi",
      tags: [],
    }),
  ).toEqual({ from: "+14155550123", to: "+14155550199", body: "Hi" });
  expect(
    schemas.SendSmsRequest.safeParse({ from: "+14155550123", to: "+14155550199", body: "a\u0000" })
      .success,
  ).toBe(false);
  expect(
    schemas.SendSmsRequest.safeParse({
      from: "+14155550123",
      to: "+14155550199",
      body: "a".repeat(1531),
    }).success,
  ).toBe(false);
});
