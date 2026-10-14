/**
 * The first `examples` entry of each wire schema is what the API reference shows (and the docs' code samples
 * send), so it must be a valid value of that schema. Mirrors packages/email/test/schema-examples.test.ts.
 */
import { expect, test } from "bun:test";
import type { z } from "zod";
import {
  DeletedWebhookEndpoint,
  HookEndpointWebhookEvent,
  RollWebhookEndpointSecretRequest,
  WebhookAttemptObject,
  WebhookDeliveryList,
  WebhookDeliveryObject,
  WebhookEndpointList,
  WebhookEndpointObject,
  WebhookEndpointWithSecret,
  webhookEndpointRequests,
} from "../src/schemas.ts";

// The event types the public API passes (`EMAIL_EVENT_TYPES`); webhooks can't import @coss/email.
const { CreateWebhookEndpointRequest, UpdateWebhookEndpointRequest } = webhookEndpointRequests([
  "email.sent",
  "email.delivered",
  "email.bounced",
]);

const SCHEMAS: Record<string, z.ZodType> = {
  HookEndpointWebhookEvent,
  WebhookEndpoint: WebhookEndpointObject,
  WebhookEndpointWithSecret,
  WebhookEndpointList,
  DeletedWebhookEndpoint,
  CreateWebhookEndpointRequest,
  UpdateWebhookEndpointRequest,
  RollWebhookEndpointSecretRequest,
  WebhookAttempt: WebhookAttemptObject,
  WebhookDelivery: WebhookDeliveryObject,
  WebhookDeliveryList,
};

for (const [name, schema] of Object.entries(SCHEMAS)) {
  test(`${name} has an example that it accepts`, () => {
    const [example] = (schema.meta()?.examples as unknown[] | undefined) ?? [];
    expect(example).toBeDefined();
    const result = schema.safeParse(example);
    expect(result.error?.issues ?? []).toEqual([]);
  });
}
