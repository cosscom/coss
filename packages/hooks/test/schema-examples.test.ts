/**
 * The first `examples` entry of each wire schema is what the API reference shows (and the docs' code samples
 * send), so it must be a valid value of that schema. Mirrors packages/webhooks/test/schema-examples.test.ts.
 */
import { expect, test } from "bun:test";
import type { z } from "zod";
import {
  CreateHookApplicationRequest,
  CreateHookEndpointRequest,
  CreateHookEventTypeRequest,
  CreateHookPortalSessionRequest,
  DeletedHookApplication,
  DeletedHookEndpoint,
  HookApplicationList,
  HookApplicationObject,
  HookAttemptList,
  HookAttemptObject,
  HookDeliveryList,
  HookDeliveryObject,
  HookEndpointList,
  HookEndpointObject,
  HookEndpointRecoveryObject,
  HookEndpointSecret,
  HookEndpointWithSecret,
  HookEventTypeList,
  HookEventTypeObject,
  HookMessageList,
  HookMessageObject,
  HookPortalSessionObject,
  RecoverHookEndpointRequest,
  RollHookEndpointSecretRequest,
  SendHookMessageRequest,
  SendHookTestRequest,
  UpdateHookApplicationRequest,
  UpdateHookEndpointRequest,
  UpdateHookEventTypeRequest,
} from "../src/schemas.ts";

const SCHEMAS: Record<string, z.ZodType> = {
  HookApplicationObject,
  CreateHookApplicationRequest,
  UpdateHookApplicationRequest,
  HookApplicationList,
  DeletedHookApplication,
  HookEventTypeObject,
  CreateHookEventTypeRequest,
  UpdateHookEventTypeRequest,
  HookEventTypeList,
  HookEndpointObject,
  HookEndpointWithSecret,
  CreateHookEndpointRequest,
  UpdateHookEndpointRequest,
  HookEndpointList,
  DeletedHookEndpoint,
  HookEndpointSecret,
  RollHookEndpointSecretRequest,
  RecoverHookEndpointRequest,
  HookEndpointRecoveryObject,
  SendHookTestRequest,
  HookMessageObject,
  SendHookMessageRequest,
  HookMessageList,
  HookDeliveryObject,
  HookDeliveryList,
  HookAttemptObject,
  HookAttemptList,
  CreateHookPortalSessionRequest,
  HookPortalSessionObject,
};

for (const [name, schema] of Object.entries(SCHEMAS)) {
  test(`${name} has an example that it accepts`, () => {
    const [example] = (schema.meta()?.examples as unknown[] | undefined) ?? [];
    expect(example).toBeDefined();
    const result = schema.safeParse(example);
    expect(result.error?.issues ?? []).toEqual([]);
  });
}
