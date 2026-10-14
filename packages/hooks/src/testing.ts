/** Hooks test helpers. Requires the `@coss/db/testing` preload for DB-backed use. */
import { TEST_SECRETS_KEYS, testSender } from "@coss/webhooks/testing";
import type { HookDeliveryDeps } from "./deliver.ts";
import type { HookManagementDeps } from "./shared.ts";

export const testHookDeps: HookManagementDeps = {
  secretsKeys: TEST_SECRETS_KEYS,
  allowInsecureUrls: true,
};

/** Delivery deps reaching local receivers, without retry jitter. */
export function testHookDeliveryDeps(overrides: Partial<HookDeliveryDeps> = {}): HookDeliveryDeps {
  return { secretsKeys: TEST_SECRETS_KEYS, send: testSender(), random: () => 0, ...overrides };
}
