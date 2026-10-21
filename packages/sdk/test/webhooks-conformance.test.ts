import { describe, expect, test } from "bun:test";
import fixture from "../../../integrations/conformance/webhooks.json" with { type: "json" };
import { verifyLogDrainBatch, verifyWebhook, WebhookVerificationError } from "../src/index.ts";

// The shared fixture every generated SDK (sdks/*) runs against its own verify functions: this
// keeps it true to the TypeScript SDK.
describe("integrations/conformance/webhooks.json", () => {
  for (const c of fixture.cases) {
    test(c.name, async () => {
      const verify = c.kind === "log_drain" ? verifyLogDrainBatch : verifyWebhook;
      const result = verify(c.payload, c.headers, c.secret ?? fixture.secret, {
        now: new Date((c.now ?? fixture.now) * 1000),
        toleranceSeconds: c.tolerance_seconds ?? fixture.tolerance_seconds,
      });
      if ("error" in c.expect) {
        const error = await result.then(
          () => null,
          (e: unknown) => e,
        );
        expect(error).toBeInstanceOf(WebhookVerificationError);
        expect((error as Error).message).toBe(c.expect.error as string);
      } else {
        expect(await result).toEqual(c.expect.value as never);
      }
    });
  }
});
