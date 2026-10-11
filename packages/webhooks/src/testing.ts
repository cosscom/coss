/** Webhook test helpers. Requires the `@coss/db/testing` preload for DB-backed use. */
import type { WebhookManagementDeps } from "./endpoints.ts";
import { createWebhookSender } from "./sender.ts";

/** A fixed WEBHOOK_SECRETS_KEY for tests. */
export const TEST_SECRETS_KEY: Buffer = Buffer.alloc(32, 7);

export const testManagementDeps: WebhookManagementDeps = {
  secretsKey: TEST_SECRETS_KEY,
  allowInsecureUrls: true,
};

export type ReceivedWebhook = { url: string; headers: Headers; body: string };

/**
 * An HTTP server on 127.0.0.1 that records what it receives. `respond` decides each response
 * (default: 200 "ok"). Call `stop()` when done.
 */
export function webhookReceiver(respond?: (request: Request) => Response | Promise<Response>) {
  const received: ReceivedWebhook[] = [];
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      received.push({
        url: request.url,
        headers: request.headers,
        body: await request.clone().text(),
      });
      return respond ? respond(request) : new Response("ok");
    },
  });
  return {
    url: `http://127.0.0.1:${server.port}/webhooks`,
    received,
    stop: () => server.stop(true),
  };
}

/** A sender allowed to reach the local receiver. */
export function testSender() {
  return createWebhookSender({ allowPrivateNetworks: true });
}
